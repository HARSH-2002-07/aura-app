import Stripe from "stripe";
import { envServer } from "./env.server";

export const stripe = new Stripe(envServer.STRIPE_SECRET_KEY || "sk_test_dummy_key", {
  apiVersion: "2025-02-24.acacia" as any,
  typescript: true,
});
