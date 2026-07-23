import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PricingClient from "./PricingClient";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subscription = null;

  if (user) {
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();
    subscription = subData || null;
  }

  return <PricingClient user={user} subscription={subscription} />;
}
