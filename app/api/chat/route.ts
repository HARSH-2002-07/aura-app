import { createClient } from "@/lib/supabase/server";
import { streamText, convertToModelMessages, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { envServer } from "@/lib/env.server";
import { z } from "zod";
import { WardrobeItem } from "@/types";
import { ProPlannerV7, WeatherEngine, type FeedbackRecord } from "@/lib/planner";

export const maxDuration = 60; // 60 seconds max

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    let messages = [];
    try {
      const body = await req.json();
      messages = body.messages || [];
    } catch (error) {
      console.warn("Failed to parse request body as JSON:", error);
    }

    if (!messages || !Array.isArray(messages)) {
      messages = [];
    }

    // Fetch user's style profile
    const { data: profileData } = await supabase
      .from("style_profiles")
      .select("result")
      .eq("user_id", user.id)
      .single();

    // Fetch user's wardrobe
    const { data: wardrobeData } = await supabase
      .from("wardrobe_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch user's feedback history (drives the FeedbackEngine inside the planner)
    const { data: feedbackData } = await supabase
      .from("outfit_feedback")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const wardrobe: WardrobeItem[] = wardrobeData || [];
    const profile = profileData?.result || null;
    const feedbackRecords: FeedbackRecord[] = (feedbackData || []).map((fb: any) => ({
      item_ids: fb.item_ids || [],
      liked: !!fb.liked,
    }));

    // Lightweight wardrobe summary for the LLM — categories + unique sub-categories only.
    // No item IDs or per-item listing: the planner (not the LLM) selects real items,
    // so there's nothing for the model to guess or hallucinate here.
    const categoryCounts: Record<string, number> = {};
    const subCategoriesByCategory: Record<string, Set<string>> = {};
    wardrobe.forEach((item) => {
      const cat = item.meta?.category || "Unknown";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      if (!subCategoriesByCategory[cat]) subCategoriesByCategory[cat] = new Set();
      if (item.meta?.sub_category) subCategoriesByCategory[cat].add(item.meta.sub_category);
    });

    // Build the system prompt — the LLM's job now is understanding intent and
    // narrating the *actual* outfit the planner picks, not choosing items itself.
    let systemPrompt = `You are AURA, a personal AI fashion stylist. Your goal is to help the user dress better using the clothes they already own.

Be conversational, supportive, and stylish in your tone.`;

    if (profile) {
      systemPrompt += `\n\nUSER'S STYLE PROFILE:
- Face Shape: ${profile.face_shape}
- Body Archetype: ${profile.body_archetype}
- Season: ${profile.season}
- Hero Colors: ${profile.hero_colors?.map((c: any) => c.name).join(", ")}
- Avoid Colors: ${profile.avoid_colors?.map((c: any) => c.name).join(", ")}
- Fit Guidance: ${profile.fit_guidance}`;
    }

    systemPrompt += `\n\nUSER'S WARDROBE (summary only — you never pick specific items yourself):`;
    if (wardrobe.length > 0) {
      Object.entries(categoryCounts).forEach(([cat, count]) => {
        const subs = Array.from(subCategoriesByCategory[cat] || []).join(", ");
        systemPrompt += `\n- ${cat}: ${count} item(s) — includes: ${subs}`;
      });
    } else {
      systemPrompt += `\n(User has no clothes in their digital closet yet. Encourage them to upload some!)`;
    }

    systemPrompt += `\n\nCRITICAL PERSONAL STYLIST INSTRUCTIONS:
1. You are AURA — an elite, warm, hyper-personalized fashion stylist. Talk directly to the user as their intimate personal advisor.
2. OUTFIT REQUESTS: Whenever the user asks what to wear, for an outfit idea, to refresh/change the current look, or describes an occasion/mood, you MUST call the \`find_outfit\` tool. NEVER invent clothing items, names, or descriptions yourself — the tool selects real items from the user's actual closet and returns them to you. Wait for the tool result before describing any specific garment.
3. AFTER the tool returns: write a rich, enthusiastic explanation using ONLY the actual items in the tool result (their real sub_category, color, and style fields). Explain how the chosen pieces suit their ${profile?.body_archetype || 'body type'}, match their ${profile?.season || 'color season'} palette, and fit the weather/occasion the tool reports back.
4. If the tool result indicates no wardrobe items are available, gently tell the user to upload some clothes first — do not invent an outfit.
5. STRICT FORMATTING:
   - NEVER output meta-commentary like "No function call is needed for this prompt".
   - NEVER output raw JSON text or code blocks in your chat text.
   - Speak naturally like a human fashion expert.
6. For plain conversation (no outfit request), just chat naturally — do not call the tool.`;

    const nvidia = createOpenAI({
      apiKey: envServer.NVIDIA_API_KEY || "dummy",
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    const result = streamText({
      model: nvidia.chat("meta/llama-3.1-70b-instruct"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      // Allow the model to call find_outfit, receive the real result, then
      // produce its final narration in a follow-up step.
      // NOTE: verify this option name against your installed `ai` package —
      // some builds use `stopWhen: stepCountIs(n)` instead of `maxSteps`.
      maxSteps: 5,
      tools: {
        find_outfit: tool({
          description:
            "Selects and scores a real outfit from the user's actual wardrobe for a given occasion, using their style profile, live weather, and their like/dislike history. ALWAYS call this for outfit requests instead of guessing wardrobe items yourself.",
          inputSchema: z.object({
            occasion: z
              .string()
              .describe("What the user is dressing for, e.g. 'rooftop dinner date', 'gym session', 'office day'"),
            weather_override: z
              .string()
              .optional()
              .describe("Only set this if the user explicitly stated a location or weather condition themselves"),
          }),
          execute: async ({ occasion, weather_override }: { occasion: string; weather_override?: string }) => {
            if (wardrobe.length === 0) {
              return {
                wardrobe_empty: true,
                message: "User has no wardrobe items uploaded yet.",
              };
            }

            const weather = weather_override
              ? { temp: 22, condition: weather_override, city: "Manual" }
              : await WeatherEngine.getLiveWeather();

            const planner = new ProPlannerV7(wardrobe, profileData, feedbackRecords);
            const result = planner.plan(occasion, weather);

            return {
              wardrobe_empty: false,
              outfit: result.outfit,
              confidence: result.confidence,
              weather: result.weather,
              shopping_tip: result.shopping_tip,
            };
          },
        }),
      } as any,
    });

    // In AI SDK v5, toDataStreamResponse was replaced with toUIMessageStreamResponse
    return (result as any).toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}