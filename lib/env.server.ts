import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key is required"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NVIDIA_API_KEY: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
  AI_SERVICE_URL: z.string().url().default("http://localhost:5000"),
});

const _serverEnv = serverEnvSchema.safeParse(process.env);

if (!_serverEnv.success) {
  console.error("❌ Invalid server environment variables:", _serverEnv.error.format());
  throw new Error("Invalid server environment variables");
}

export const envServer = _serverEnv.data;
