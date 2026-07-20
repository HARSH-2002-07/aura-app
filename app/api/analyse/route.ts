import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";
import { envServer } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";
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
const NIM_MODEL = "meta/llama-3.2-11b-vision-instruct";

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
  const { photos, profile } = parsed.data;

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

  const { data: allowed, error: gateError } = await supabase.rpc("try_consume_analysis", {
    p_user_id: user.id,
    p_free_limit: FREE_ANALYSES_ALLOWED,
  });

  if (gateError) {
    console.error(gateError);
    return errorResponse(500, "Could not verify subscription status");
  }
  if (!allowed) {
    return errorResponse(
      402,
      "Free analysis already used — upgrade to Pro for unlimited analyses"
    );
  }

  const refund = async () => {
    await supabase.rpc("refund_analysis", { p_user_id: user.id });
  };

  const openai = new OpenAI({
    apiKey: envServer.NVIDIA_API_KEY || "dummy",
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSchema = zodToJsonSchema(StyleResultSchema as any, {
    $refStrategy: "none",
  }) as Record<string, unknown>;
  const { $schema: _omit, ...inputSchema } = rawSchema;

  const stitchedBase64 = await stitchImagesIntoGrid(normalizedPhotos.map(p => p.base64));

  let toolInput: unknown;
  try {
    const response = await openai.chat.completions.create({
      model: NIM_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `${buildSystemPrompt()}\n\nYou must respond ONLY with raw JSON matching this JSON Schema:\n${JSON.stringify(inputSchema)}`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url" as const,
              image_url: {
                url: `data:image/jpeg;base64,${stitchedBase64}`,
              },
            },
            {
              type: "text" as const,
              text: `Client profile:\n${JSON.stringify(profile, null, 2)}\n\nCRITICAL INSTRUCTION: You must respond with ONLY raw JSON matching the required schema. Do not output markdown code blocks. Do not output any thinking or explanation text. Just the JSON object starting with { and ending with }.\n\nWARNING: Do NOT group fields into nested objects like "Facial Architecture". You MUST use the exact flat top-level keys defined in the schema.`,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("Model returned empty response content");
    }

    const startIndex = content.indexOf("{");
    const endIndex = content.lastIndexOf("}");
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
      const jsonString = content.substring(startIndex, endIndex + 1);
      console.log("Extracted JSON:", jsonString);
      toolInput = JSON.parse(jsonString);
    } else {
      throw new Error("Model returned text but no parseable JSON object was found: " + content);
    }
  } catch (err) {
    console.error(err);
    await refund();
    return errorResponse(502, "Style analysis service is temporarily unavailable");
  }

  const resultParsed = StyleResultSchema.safeParse(toolInput);
  if (!resultParsed.success) {
    console.error(resultParsed.error);
    await refund();
    return errorResponse(502, "Style analysis service returned an invalid result");
  }
  const result: StyleResult = resultParsed.data;

  const { data: inserted, error: insertError } = await supabase
    .from("analyses")
    .insert({ user_id: user.id, result })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error(insertError);
    await refund();
    return errorResponse(500, "Could not save analysis result");
  }

  const { error: profileError } = await supabase
    .from("style_profiles")
    .upsert(
      {
        user_id: user.id,
        color_season: result.season,
        body_shape: result.body_archetype,
        style_archetype: result.profile_title,
        meta: result,
      },
      { onConflict: "user_id" }
    );

  if (profileError) {
    console.error("Failed to update style_profile:", profileError);
  }

  return NextResponse.json({ analysisId: inserted.id, result });
}
