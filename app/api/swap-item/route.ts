import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WardrobeItem } from "@/types";

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
    const { slot, current_outfit, query } = body; // slot e.g., 'tops', 'bottoms'

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
    const alternatives = (items as WardrobeItem[]).filter(i => i.id !== currentItemId);
    
    if (alternatives.length === 0) {
      return NextResponse.json(
        { success: false, error: "No other items available to swap." },
        { status: 400 }
      );
    }

    // Pick a random alternative for now (we could run full ProPlannerV7 here)
    const newOutfit = { ...current_outfit };
    const randomIndex = Math.floor(Math.random() * alternatives.length);
    newOutfit[slot] = alternatives[randomIndex];

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
