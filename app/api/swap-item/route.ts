import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WardrobeItem } from "@/types";
import {
  WeatherEngine,
  ColorHarmonyEngine,
  FormalityEngine,
  FeedbackEngine,
  type FeedbackRecord,
  type WeatherCondition,
} from "@/lib/planner";

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
    const { slot, current_outfit, query, weather: weatherFromClient } = body; // slot e.g., 'tops', 'bottoms'

    if (!slot || !current_outfit) {
      return NextResponse.json({ error: "Missing slot or outfit" }, { status: 400 });
    }

    // Map slot names to actual wardrobe categories
    const categoryMap: Record<string, string> = {
      tops: "Tops",
      bottoms: "Bottoms",
      outerwear: "Outerwear",
      shoes: "Footwear",
      accessory: "Accessories",
      one_piece: "Tops", // simplification
    };

    const dbCategory = categoryMap[slot];
    if (!dbCategory) {
      return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
    }

    // 1. Fetch Wardrobe for that category
    const { data: items, error: wardrobeError } = await supabase
      .from("wardrobe_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("meta->>category", dbCategory);

    if (wardrobeError || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No alternative items found in wardrobe for this category." },
        { status: 400 }
      );
    }

    const currentItemId = current_outfit[slot]?.id;

    // Filter out the current item
    let alternatives = (items as WardrobeItem[]).filter((i) => i.id !== currentItemId);

    if (alternatives.length === 0) {
      return NextResponse.json(
        { success: false, error: "No other items available to swap." },
        { status: 400 }
      );
    }

    // 2. Weather safety filter (reuse the same rule the main planner uses)
    const weather: WeatherCondition = weatherFromClient || (await WeatherEngine.getLiveWeather());
    const weatherSafe = alternatives.filter((i) => WeatherEngine.isSafe(i, weather.temp));
    if (weatherSafe.length > 0) alternatives = weatherSafe;

    // 3. Feedback learning: never re-offer something the user has net-disliked
    // twice or more, unless it's the only option left.
    const { data: feedbackData } = await supabase
      .from("outfit_feedback")
      .select("*")
      .eq("user_id", user.id);
    const feedbackRecords: FeedbackRecord[] = (feedbackData || []).map((fb: any) => ({
      item_ids: fb.item_ids || [],
      liked: !!fb.liked,
    }));
    const feedbackWeights = FeedbackEngine.computeSubcategoryWeights(items as WardrobeItem[], feedbackRecords);
    const notRejected = alternatives.filter((i) => !FeedbackEngine.isRejected(i, feedbackWeights));
    if (notRejected.length > 0) alternatives = notRejected;

    // 4. Score each remaining alternative on how well it harmonizes with the
    // REST of the current outfit (color + formality), plus the user's
    // feedback-derived preference for that sub_category, plus a light nudge
    // for query-relevance so "make it more casual" style follow-ups still work.
    const restOfOutfit: WardrobeItem[] = [
      current_outfit.tops,
      current_outfit.bottoms,
      current_outfit.outerwear,
      current_outfit.shoes,
    ].filter((i) => i && i.id !== currentItemId);

    const queryLower = (query || "").toLowerCase();

    const scoreAlternative = (candidate: WardrobeItem) => {
      const combined = [...restOfOutfit, candidate];
      const colorScore = ColorHarmonyEngine.evaluate(combined);
      const formalityScore = FormalityEngine.evaluate(combined);
      const feedbackScore = FeedbackEngine.scoreItem(candidate, feedbackWeights); // -1..1

      let queryBonus = 0;
      const sub = candidate.meta.sub_category.toLowerCase();
      if (queryLower && (queryLower.includes(sub) || queryLower.includes(candidate.meta.color.toLowerCase()))) {
        queryBonus = 0.15;
      }

      return colorScore * 0.4 + formalityScore * 0.3 + ((feedbackScore + 1) / 2) * 0.2 + queryBonus;
    };

    const ranked = [...alternatives].sort((a, b) => scoreAlternative(b) - scoreAlternative(a));
    const best = ranked[0];

    const newOutfit = { ...current_outfit, [slot]: best };

    return NextResponse.json({
      success: true,
      outfit: newOutfit,
    });
  } catch (err: any) {
    console.error("Swap Item API Error:", err);
    return NextResponse.json(
      { error: "Failed to swap item", details: err.message },
      { status: 500 }
    );
  }
}