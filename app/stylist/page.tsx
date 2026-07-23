import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StylistClient from "./StylistClient";
import { WardrobeItem } from "@/types";

export default async function StylistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch wardrobe
  const { data: wardrobeData } = await supabase
    .from("wardrobe_items")
    .select("*")
    .eq("user_id", user.id);

  // Fetch style profile
  const { data: profileData } = await supabase
    .from("style_profiles")
    .select("result")
    .eq("user_id", user.id)
    .single();

  const wardrobe: WardrobeItem[] = wardrobeData || [];
  const profile = profileData?.result || null;

  return <StylistClient user={user} wardrobe={wardrobe} profile={profile} />;
}
