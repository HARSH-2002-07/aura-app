import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { WardrobeItem } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 1. Fetch user's style profile
  const { data: profileData } = await supabase
    .from("style_profiles")
    .select("result")
    .eq("user_id", user.id)
    .single();

  // 2. Fetch user's wardrobe items
  const { data: wardrobeData } = await supabase
    .from("wardrobe_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 3. Fetch user's subscription
  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // 4. Fetch user's saved outfits
  const { data: savedOutfitsData } = await supabase
    .from("saved_outfits")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 5. Fetch user's feedback history
  const { data: feedbackData } = await supabase
    .from("outfit_feedback")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const profile = profileData?.result || null;
  const wardrobe: WardrobeItem[] = wardrobeData || [];
  const subscription = subscriptionData || null;
  const savedOutfits = savedOutfitsData || [];
  const feedbackList = feedbackData || [];

  return (
    <DashboardClient
      user={user}
      profile={profile}
      wardrobe={wardrobe}
      subscription={subscription}
      savedOutfits={savedOutfits}
      feedbackList={feedbackList}
    />
  );
}
