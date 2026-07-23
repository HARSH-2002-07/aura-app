import OutfitRecommendation from "@/components/closet/OutfitRecommendation";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Outfit Planner - AURA",
  description: "AI-powered personalized outfit recommendations",
};

export default async function OutfitPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch user data for the client component
  const { data: userProfile } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", session.user.id)
    .single();

  return (
    <OutfitRecommendation 
      user={{ 
        id: session.user.id, 
        email: session.user.email,
        full_name: userProfile?.full_name 
      }} 
    />
  );
}
