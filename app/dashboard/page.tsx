import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { WardrobeItem } from "@/types";
import { stripe } from "@/lib/stripe";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const params = await searchParams;

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

  // 3. Fetch user's subscription from Supabase
  let { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  let isStripeActive = false;
  let customerId = subscriptionData?.stripe_customer_id;
  let activeSubId: string | null = null;

  // Auto-sync directly with Stripe on page load
  try {
    // A. Check completed checkout sessions in Stripe by user email or userId
    if (user.email) {
      const sessions = await stripe.checkout.sessions.list({ limit: 10 });
      const userSession = sessions.data.find(
        (s) =>
          s.payment_status === "paid" &&
          (s.customer_details?.email === user.email || s.metadata?.userId === user.id)
      );

      if (userSession) {
        isStripeActive = true;
        if (typeof userSession.customer === "string") {
          customerId = userSession.customer;
        }
        if (typeof userSession.subscription === "string") {
          activeSubId = userSession.subscription;
        }
      }
    }

    // B. Check active subscriptions in Stripe by Customer ID
    if (!isStripeActive && customerId) {
      const stripeSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (stripeSubs.data.length > 0) {
        isStripeActive = true;
        activeSubId = stripeSubs.data[0].id;
      }
    }

    // C. Upsert to Supabase if subscription is active or customer ID exists
    if (isStripeActive || customerId) {
      const updatePayload: any = {
        user_id: user.id,
        status: isStripeActive ? "active" : (subscriptionData?.status || "free"),
      };
      if (customerId) updatePayload.stripe_customer_id = customerId;
      if (activeSubId) updatePayload.stripe_subscription_id = activeSubId;

      const { data: updatedSub } = await supabase
        .from("subscriptions")
        .upsert(updatePayload, { onConflict: "user_id" })
        .select()
        .single();

      if (updatedSub) {
        subscriptionData = updatedSub;
      }
    }
  } catch (e) {
    console.error("Stripe sync error:", e);
  }

  // Fallback construct if subscriptionData is null
  if (!subscriptionData) {
    subscriptionData = {
      id: "temp",
      user_id: user.id,
      status: isStripeActive ? "active" : "free",
      analyses_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } else if (isStripeActive) {
    subscriptionData.status = "active";
  }

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
