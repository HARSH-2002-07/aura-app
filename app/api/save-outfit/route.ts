import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const { outfit, occasion } = body;

    if (!outfit) {
      return NextResponse.json({ error: "Missing outfit data" }, { status: 400 });
    }

    const outfitData = {
      user_id: user.id,
      occasion: occasion || "Casual",
      item_ids: [
        outfit.tops?.id,
        outfit.bottoms?.id,
        outfit.shoes?.id,
        outfit.outerwear?.id,
        outfit.accessory?.id,
        outfit.one_piece?.id,
      ].filter(Boolean) as string[],
    };

    const { data: savedOutfit, error } = await supabase
      .from("saved_outfits")
      .insert(outfitData)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      data: [savedOutfit],
    });
  } catch (err: any) {
    console.error("Save Outfit API Error:", err);
    return NextResponse.json(
      { error: "Failed to save outfit", details: err.message },
      { status: 500 }
    );
  }
}
