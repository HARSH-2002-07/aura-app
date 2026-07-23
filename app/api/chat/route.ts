import { createClient } from "@/lib/supabase/server";
import { streamText, convertToModelMessages, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { envServer } from "@/lib/env.server";
import { z } from "zod";
import { WardrobeItem } from "@/types";

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

    // Fetch user's feedback history
    const { data: feedbackData } = await supabase
      .from("outfit_feedback")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const wardrobe: WardrobeItem[] = wardrobeData || [];
    const profile = profileData?.result || null;

    // Collect Liked vs Disliked sub-categories
    const dislikedSubCats: string[] = [];
    const likedSubCats: string[] = [];

    (feedbackData || []).forEach((fb) => {
      const items = wardrobe.filter((i) => fb.item_ids?.includes(i.id));
      items.forEach((item) => {
        const subCat = item.meta?.sub_category;
        if (subCat) {
          if (fb.liked) {
            likedSubCats.push(subCat);
          } else {
            dislikedSubCats.push(subCat);
          }
        }
      });
    });

    // Build the system prompt
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

    systemPrompt += `\n\nUSER'S WARDROBE (Available Clothes):`;
    if (wardrobe.length > 0) {
      wardrobe.forEach((item) => {
        const m = item.meta;
        systemPrompt += `\n- ID: ${item.id} | ${m.color} ${m.sub_category} (${m.category}) | Style: ${m.style} | Season: ${m.seasonality?.join("/")}`;
      });
    } else {
      systemPrompt += `\n(User has no clothes in their digital closet yet. Encourage them to upload some!)`;
    }

    if (dislikedSubCats.length > 0) {
      systemPrompt += `\n\nUSER'S DISLIKED ITEM TYPES (AVOID RECOMMENDING): ${[...new Set(dislikedSubCats)].join(", ")}`;
    }

    if (likedSubCats.length > 0) {
      systemPrompt += `\n\nUSER'S FAVORITE / LIKED ITEM TYPES (PREFER): ${[...new Set(likedSubCats)].join(", ")}`;
    }

    systemPrompt += `\n\nCRITICAL PERSONAL STYLIST INSTRUCTIONS:
1. You are AURA — an elite, warm, and hyper-personalized fashion stylist and image consultant. Talk directly to the user as their intimate personal advisor.
2. ALWAYS provide a rich, detailed, and enthusiastic written explanation in chat for EVERY user message. Explain your exact thought process, how your choices suit their ${profile?.body_archetype || 'body type'}, match their ${profile?.season || 'color season'} palette, and suit the weather/event context!
3. WEATHER & OCCASION ADAPTATION: Pay close attention to weather (rain, cold, heat, humidity) and events (date night, home, office, casual). Choose appropriate layers (e.g. outerwear for cold/rain, light breathable tops for heat) and explain the practical yet stylish benefits of your picks.
4. OUTFIT GENERATION TOOL: When the user asks for outfit suggestions, what to wear, or style ideas, you MUST ALWAYS call the \`generate_outfit\` tool AND write your complete chat explanation.
5. STRICT FORMATTING: 
   - NEVER output meta-commentary like "No function call is needed for this prompt".
   - NEVER output raw JSON text strings or code blocks like {"name": "generate_outfit"...} in your chat text.
   - Speak naturally like a human fashion expert.
6. Item IDs: Only pick item IDs that strictly exist in the USER'S WARDROBE list above.`;

    const nvidia = createOpenAI({
      apiKey: envServer.NVIDIA_API_KEY || "dummy",
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    const result = streamText({
      model: nvidia.chat("meta/llama-3.1-70b-instruct"), 
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        generate_outfit: tool({
          description: "Generates an outfit visually in the UI. Call this whenever the user asks for what to wear or an outfit recommendation.",
          inputSchema: z.object({
            tops_id: z.string().optional().describe("ID of the top to wear"),
            bottoms_id: z.string().optional().describe("ID of the bottom to wear"),
            outerwear_id: z.string().optional().describe("ID of the outerwear to wear"),
            footwear_id: z.string().optional().describe("ID of the footwear to wear"),
            reasoning: z.string().describe("A rich, personal stylist explanation detailing how this outfit specifically suits the user's Color Season palette, Body Archetype, Face Shape, and current weather request."),
          }),
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
