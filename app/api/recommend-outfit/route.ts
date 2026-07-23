import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProPlannerV7, WeatherEngine, type WeatherCondition } from "@/lib/planner";
import { WardrobeItem } from "@/types";
import OpenAI from "openai";
import { envServer } from "@/lib/env.server";

export const maxDuration = 60; // 60 seconds

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const query = body.query || "casual everyday outfit";
    const manualWeather = body.weather;

    // 1. Fetch Wardrobe
    const { data: wardrobeItems, error: wardrobeError } = await supabase
      .from("wardrobe_items")
      .select("*")
      .eq("user_id", user.id);

    if (wardrobeError || !wardrobeItems || wardrobeItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items found in wardrobe. Please upload some clothes first." },
        { status: 400 }
      );
    }

    // 2. Fetch Style Profile
    const { data: styleProfileData } = await supabase
      .from("style_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // 3. Get Weather
    let weatherCondition: WeatherCondition;
    if (manualWeather) {
      weatherCondition = { temp: 22, condition: manualWeather, city: "Manual" };
    } else {
      weatherCondition = await WeatherEngine.getLiveWeather();
    }

    // 4. Run ProPlannerV7
    const planner = new ProPlannerV7(wardrobeItems as WardrobeItem[], styleProfileData);
    const result = planner.plan(query, weatherCondition);

    // 5. Enhance Stylist Tip using Llama 90B (Optional but premium experience)
    let advancedTip = result.shopping_tip;
    try {
      if (envServer.NVIDIA_API_KEY) {
        const openai = new OpenAI({
          apiKey: envServer.NVIDIA_API_KEY,
          baseURL: "https://integrate.api.nvidia.com/v1",
        });

        const prompt = `You are a fashion stylist. The user requested: "${query}". 
        The AI generated an outfit with score ${result.confidence.percentage}%: 
        Top: ${result.outfit.tops?.meta.sub_category || "None"} (${result.outfit.tops?.meta.color || ""})
        Bottom: ${result.outfit.bottoms?.meta.sub_category || "None"} (${result.outfit.bottoms?.meta.color || ""})
        Outerwear: ${result.outfit.outerwear?.meta.sub_category || "None"}
        Shoes: ${result.outfit.shoes?.meta.sub_category || "None"}
        
        Write a short (2-3 sentences), punchy stylist tip for this specific outfit combination. Keep it encouraging and stylish. Do not use quotes or introductory phrases.`;

        const aiResponse = await openai.chat.completions.create({
          model: "meta/llama-3.2-90b-vision-instruct",
          max_tokens: 150,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        });

        if (aiResponse.choices[0]?.message?.content) {
          advancedTip = aiResponse.choices[0].message.content.trim();
        }
      }
    } catch (e) {
      console.error("Failed to generate advanced tip, using fallback:", e);
    }

    return NextResponse.json({
      success: true,
      outfit: result.outfit,
      query: query,
      method: "ProPlannerV7-TS",
      shopping_tip: advancedTip,
      weather: weatherCondition,
      confidence: result.confidence,
    });
  } catch (err: any) {
    console.error("Recommend Outfit API Error:", err);
    return NextResponse.json(
      { error: "Failed to generate outfit recommendation.", details: err.message },
      { status: 500 }
    );
  }
}
