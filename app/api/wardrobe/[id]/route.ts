import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WardrobeItemMetaSchema } from "@/types";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await supabase
      .from("wardrobe_items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Wardrobe API Error (DELETE):", err);
    return NextResponse.json(
      { error: "Failed to delete item.", details: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsedMeta = WardrobeItemMetaSchema.safeParse(body);
    
    if (!parsedMeta.success) {
      return NextResponse.json({ error: "Invalid metadata schema" }, { status: 400 });
    }

    const { error } = await supabase
      .from("wardrobe_items")
      .update({ meta: parsedMeta.data })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, meta: parsedMeta.data });
  } catch (err: any) {
    console.error("Wardrobe API Error (PATCH):", err);
    return NextResponse.json(
      { error: "Failed to update item.", details: err.message },
      { status: 500 }
    );
  }
}
