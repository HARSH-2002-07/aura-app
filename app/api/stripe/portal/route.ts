import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { envServer } from "@/lib/env.server";
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

    const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!sub?.stripe_customer_id || !envServer.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        url: `${domain}/pricing`,
        message: "No active Stripe customer profile found.",
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${domain}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Portal API error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
