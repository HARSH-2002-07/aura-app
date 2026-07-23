import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FeedbackHistoryClient from "./FeedbackHistoryClient";
import { WardrobeItem } from "@/types";

export default async function FeedbackHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch feedback records
  const { data: feedbackData } = await supabase
    .from("outfit_feedback")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch wardrobe to map item IDs to photos & categories
  const { data: wardrobeData } = await supabase
    .from("wardrobe_items")
    .select("*")
    .eq("user_id", user.id);

  const feedbackList = feedbackData || [];
  const wardrobe: WardrobeItem[] = wardrobeData || [];

  return <FeedbackHistoryClient user={user} initialFeedback={feedbackList} wardrobe={wardrobe} />;
}
