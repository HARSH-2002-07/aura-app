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

    // Fetch existing subscription to check if user has a stripe_customer_id
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = sub?.stripe_customer_id;

    if (!customerId && envServer.STRIPE_SECRET_KEY) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    // Check if Stripe is configured
    if (!envServer.STRIPE_SECRET_KEY || !envServer.STRIPE_PRICE_ID_PRO) {
      // Demo mode fallback when Stripe credentials are not provided in dev environment
      return NextResponse.json({
        url: `${domain}/pricing?status=demo_success`,
        message: "Stripe API keys not configured. Directing to demo upgrade mode.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: envServer.STRIPE_PRICE_ID_PRO,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${domain}/dashboard?subscription=success`,
      cancel_url: `${domain}/pricing?subscription=cancelled`,
      metadata: {
        userId: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Checkout API error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
