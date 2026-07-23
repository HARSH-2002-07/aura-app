import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { item_ids, liked } = await req.json();

    if (!item_ids || !Array.isArray(item_ids) || typeof liked !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("outfit_feedback")
      .insert({
        user_id: user.id,
        item_ids,
        liked,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving feedback:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, feedback: data });
  } catch (err: any) {
    console.error("Feedback POST API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: feedbackList, error } = await supabase
      .from("outfit_feedback")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching feedback:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feedback: feedbackList || [] });
  } catch (err: any) {
    console.error("Feedback GET API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { error } = await supabase
        .from("outfit_feedback")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      // Clear all feedback for user
      const { error } = await supabase
        .from("outfit_feedback")
        .delete()
        .eq("user_id", user.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Feedback DELETE API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
