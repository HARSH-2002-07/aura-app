import { z } from "zod";

export const SubscriptionStatusSchema = z.enum([
  "free",
  "active",
  "past_due",
  "cancelled",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  analyses_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  subscription_status: SubscriptionStatus;
  analyses_count: number;
}

export const PHOTO_SLOTS = [
  "face-front",
  "face-side",
  "body-front",
  "body-side",
] as const;
export type PhotoSlot = (typeof PHOTO_SLOTS)[number];

export const PHOTO_SLOT_LABELS: Record<PhotoSlot, string> = {
  "face-front": "Face Front",
  "face-side": "Face Profile",
  "body-front": "Body Front",
  "body-side": "Body Side",
};

export const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export const PhotoDataSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.enum(SUPPORTED_MIME_TYPES),
});
export type PhotoData = z.infer<typeof PhotoDataSchema>;

export const PhotosPayloadSchema = z.object({
  "face-front": PhotoDataSchema,
  "face-side": PhotoDataSchema,
  "body-front": PhotoDataSchema,
  "body-side": PhotoDataSchema,
});
export type PhotosPayload = z.infer<typeof PhotosPayloadSchema>;

export const GENDERS = ["male", "female", "nonbinary"] as const;
export const BUDGETS = ["budget", "mid-range", "premium", "luxury"] as const;
export const CLIMATES = ["tropical", "temperate", "cold"] as const;

export const ProfileDataSchema = z.object({
  age: z.number().int().min(13).max(100),
  gender: z.enum(GENDERS),
  height: z.number().int().min(100).max(250), // cm
  budget: z.enum(BUDGETS),
  context: z.string().min(2).max(80),
  climate: z.enum(CLIMATES),
  intent: z.string().min(2).max(300),
});
export type ProfileData = z.infer<typeof ProfileDataSchema>;

export const AnalyseRequestSchema = z.object({
  photos: PhotosPayloadSchema,
  profile: ProfileDataSchema,
});
export type AnalyseRequestBody = z.infer<typeof AnalyseRequestSchema>;

export const FACE_SHAPES = [
  "Oval",
  "Square",
  "Round",
  "Heart",
  "Diamond",
  "Oblong",
] as const;

export const UNDERTONES = ["Warm", "Cool", "Olive/Neutral"] as const;

export const SEASONS = [
  "Deep Winter",
  "Cool Winter",
  "Clear Winter",
  "Deep Autumn",
  "Warm Autumn",
  "Soft Autumn",
  "Light Spring",
  "Warm Spring",
  "Clear Spring",
  "Cool Summer",
  "Soft Summer",
  "Light Summer",
] as const;

export const BODY_ARCHETYPES = [
  "Trapezoid",
  "Inverted Triangle",
  "Rectangle",
  "Triangle",
  "Oval",
] as const;

export const COMPOSITION_TIERS = ["Lean", "Athletic", "Average", "Heavy"] as const;

const HexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "must be a 6-digit hex color, e.g. #8B4513");

export const ColorSwatchSchema = z.object({
  hex: HexColorSchema,
  name: z.string().min(1).max(40),
});
export type ColorSwatch = z.infer<typeof ColorSwatchSchema>;

export const WeeklyProgramSchema = z.object({
  monday: z.string().min(1),
  tuesday: z.string().min(1),
  wednesday: z.string().min(1),
  thursday: z.string().min(1),
  friday: z.string().min(1),
}).describe(
  "An object (not an array) with exactly these five keys: monday, tuesday, wednesday, thursday, friday — each mapping to one outfit formula string."
);
export type WeeklyProgram = z.infer<typeof WeeklyProgramSchema>;

export const StyleResultSchema = z.object({
  profile_title: z.string().min(1),
  face_shape: z.enum(FACE_SHAPES),
  angularity_index: z.number().min(0).max(1),
  mass_balance: z.string().min(1),
  feature_scale: z.string().min(1),
  undertone: z.enum(UNDERTONES),
  season: z.enum(SEASONS),
  hero_colors: z.array(ColorSwatchSchema).min(3).max(6),
  avoid_colors: z.array(ColorSwatchSchema).min(2).max(5),
  body_archetype: z.enum(BODY_ARCHETYPES),
  composition_tier: z.enum(COMPOSITION_TIERS),
  haircut: z.string().min(1),
  skin_tone: ColorSwatchSchema,
  fit_guidance: z.string().min(1),
  tshirt_verdict: z.string().min(1),
  accessories: z.string().min(1),
  beard: z.string().min(1),
  skincare: z.string().min(1),
  necklines: z.string().min(1),
  collar_width: z.string().min(1),
  trouser_silhouette: z.string().min(1),
  jacket_style: z.string().min(1),
  patterns: z.string().min(1),
  footwear: z.string().min(1),
  weekly: WeeklyProgramSchema,
  signature_move: z.string().min(1),
});
export type StyleResult = z.infer<typeof StyleResultSchema>;

export interface StyleAnalysis {
  id: string;
  user_id: string;
  result: StyleResult;
  photo_urls?: Partial<Record<PhotoSlot, string>> | null;
  created_at: string;
}

export interface ApiErrorResponse {
  error: string;
  detail?: string;
}

export const WARDROBE_CATEGORIES = [
  "Tops",
  "Bottoms",
  "Outerwear",
  "Footwear",
  "Accessories",
] as const;

export const WARDROBE_FORMALITIES = [
  "Casual",
  "Smart Casual",
  "Business Casual",
  "Formal",
  "Athletic",
] as const;

export const WardrobeItemMetaSchema = z.object({
  category: z.enum(WARDROBE_CATEGORIES),
  sub_category: z.string().min(1).max(40).describe("e.g. 'Oxford Shirt', 'Chinos', 'Chelsea Boots'"),
  color: z.string().min(1).max(30).describe("Primary color of the item, e.g. 'Navy Blue'"),
  hex_color: HexColorSchema.describe("Closest hex color matching the item"),
  formality: z.enum(WARDROBE_FORMALITIES),
  pattern: z.string().min(1).max(30).describe("e.g. 'Solid', 'Striped', 'Plaid', 'Floral'"),
  fabric: z.string().min(1).max(30).describe("e.g. 'Cotton', 'Linen', 'Denim', 'Leather', 'Synthetic'"),
  style: z.string().min(1).max(30).describe("e.g. 'Minimalist', 'Streetwear', 'Classic', 'Preppy', 'Vintage'"),
  weather: z.string().min(1).max(30).describe("Best weather condition to wear this, e.g. 'Hot & Sunny', 'Cool Breeze', 'Heavy Rain', 'Snow'"),
  seasonality: z.array(z.enum(["Spring", "Summer", "Autumn", "Winter"])).min(1),
  confidence_score: z.number().min(0).max(1).describe("AI confidence in this classification"),
  is_favorite: z.boolean().optional(),
});
export type WardrobeItemMeta = z.infer<typeof WardrobeItemMetaSchema>;

export interface WardrobeItem {
  id: string;
  user_id: string;
  image_url: string;
  meta: WardrobeItemMeta;
  created_at: string;
}
