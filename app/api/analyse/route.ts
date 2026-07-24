import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { envServer } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { validateAndNormalizePhoto, stitchImagesIntoGrid, ImageValidationError } from "@/lib/image-pipeline";
import { buildSystemPrompt } from "@/lib/prompt";
import {
  AnalyseRequestSchema,
  StyleResultSchema,
  PHOTO_SLOTS,
  type ApiErrorResponse,
  type StyleResult,
} from "@/types";

const FREE_ANALYSES_ALLOWED = 1;
const HOURLY_RATE_LIMIT = 10;
const NIM_MODEL = "meta/llama-3.2-90b-vision-instruct";

export const maxDuration = 60;

function errorResponse(status: number, error: string, detail?: string) {
  const body: ApiErrorResponse = detail ? { error, detail } : { error };
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse(401, "Not authenticated");
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, "Request body is not valid JSON");
  }

  const parsed = AnalyseRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return errorResponse(400, "Invalid request body", detail);
  }
  const { photos } = parsed.data;

  let normalizedPhotos: { base64: string }[];
  try {
    const results: { base64: string }[] = [];
    for (const slot of PHOTO_SLOTS) {
      const normalized = await validateAndNormalizePhoto(slot, photos[slot]);
      results.push(normalized);
    }
    normalizedPhotos = results;
  } catch (err) {
    if (err instanceof ImageValidationError) {
      return errorResponse(err.status, err.message);
    }
    console.error(err);
    return errorResponse(500, "Internal server error during image validation");
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: rateLimitError } = await supabase
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo);

  if (rateLimitError) {
    console.error(rateLimitError);
    return errorResponse(500, "Could not verify request rate");
  }
  if ((recentCount ?? 0) >= HOURLY_RATE_LIMIT) {
    return errorResponse(429, "Too many analyses requested — try again in an hour");
  }

  // 1. Check user subscription status in database & Stripe
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  let isPro = sub?.status === "active";

  // If DB status is not active, verify directly with Stripe checkout sessions
  if (!isPro && user.email) {
    try {
      const sessions = await stripe.checkout.sessions.list({ limit: 10 });
      const userSession = sessions.data.find(
        (s) =>
          s.payment_status === "paid" &&
          (s.customer_details?.email === user.email || s.metadata?.userId === user.id)
      );

      if (userSession) {
        isPro = true;
      }
    } catch (e) {
      console.error("Stripe check in /api/analyse error:", e);
    }
  }

  // If not Pro, enforce free analysis limit
  if (!isPro) {
    const { data: allowed } = await supabase.rpc("try_consume_analysis", {
      p_user_id: user.id,
      p_free_limit: FREE_ANALYSES_ALLOWED,
    });

    if (!allowed) {
      return errorResponse(
        402,
        "You've used your free analysis. Upgrade to Pro for unlimited analyses."
      );
    }
  }

  const refund = async () => {
    if (!isPro) {
      await supabase.rpc("refund_analysis", { p_user_id: user.id });
    }
  };

  const openai = new OpenAI({
    apiKey: envServer.NVIDIA_API_KEY || "dummy",
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  const systemPrompt = buildSystemPrompt();

  const promptText = `
Below is a single stitched 2x2 grid containing 4 photos of the user:
- Top-Left: Face Front
- Top-Right: Face Side
- Bottom-Left: Body Front
- Bottom-Right: Body Side

Analyze the user's facial features, skin tone, hair, contrast, and body proportions from this image grid. Return ONLY valid JSON adhering to the schema in the system prompt.
`.trim();

  let completion;
  try {
    const stitchedBase64 = await stitchImagesIntoGrid(normalizedPhotos.map((p) => p.base64));

    completion = await openai.chat.completions.create({
      model: NIM_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${stitchedBase64}` },
            },
          ],
        },
      ],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 4096,
    });
  } catch (err) {
    console.error("NVIDIA NIM Vision call failed:", err);
    await refund();
    return errorResponse(502, "AI Vision processing failed. Please try again.");
  }

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    await refund();
    return errorResponse(502, "AI model returned empty response");
  }

  let cleanedContent = rawContent.trim();

  if (cleanedContent.startsWith("```")) {
    cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }

  const jsonStart = cleanedContent.indexOf("{");
  const jsonEnd = cleanedContent.lastIndexOf("}");

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleanedContent = cleanedContent.slice(jsonStart, jsonEnd + 1);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleanedContent);
  } catch (parseErr) {
    console.error("JSON parse error on raw content:", parseErr, "\nRaw Content:", rawContent);
    await refund();
    return errorResponse(502, "Failed to parse AI response");
  }

  const styleResultParse = StyleResultSchema.safeParse(parsedJson);
  if (!styleResultParse.success) {
    console.error("Zod Schema Validation Error:", styleResultParse.error.issues, "\nParsed JSON:", parsedJson);
    await refund();
    return errorResponse(502, "AI response did not match expected schema format");
  }

  const resultData: StyleResult = styleResultParse.data;

  const { data: analysisData, error: insertError } = await supabase
    .from("analyses")
    .insert({
      user_id: user.id,
      result: resultData,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Database insert error:", insertError);
    await refund();
    return errorResponse(500, "Failed to save analysis result");
  }

  await supabase
    .from("style_profiles")
    .upsert(
      {
        user_id: user.id,
        color_season: resultData.season,
        body_shape: resultData.body_archetype,
        style_archetype: resultData.profile_title,
        meta: resultData,
      },
      { onConflict: "user_id" }
    );

  return NextResponse.json({
    analysisId: analysisData.id,
    result: resultData,
  });
}
