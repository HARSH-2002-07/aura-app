import { WardrobeItem } from "@/types";

// Types
export interface OutfitRecommendation {
  tops: WardrobeItem | null;
  bottoms: WardrobeItem | null;
  outerwear: WardrobeItem | null;
  shoes: WardrobeItem | null;
  accessory: WardrobeItem | null;
  one_piece: WardrobeItem | null;
}

export interface WeatherCondition {
  temp: number; // Celsius
  condition: string;
  city: string;
}

export interface PlannerConfidence {
  score: number;
  percentage: number;
  breakdown: {
    color: number;
    formality: number;
    weather: number;
    silhouette: number;
    style: number;
    feedback: number;
  };
}

export interface PlannerResult {
  outfit: OutfitRecommendation;
  confidence: PlannerConfidence;
  weather: WeatherCondition;
  shopping_tip: string | null;
}

export interface FeedbackRecord {
  item_ids: string[];
  liked: boolean;
}

// 1. Weather Engine
export class WeatherEngine {
  static async getLiveWeather(ip?: string): Promise<WeatherCondition> {
    try {
      // Get location
      const geoRes = await fetch("https://get.geojs.io/v1/ip/geo.json");
      const geo = await geoRes.json();
      const lat = geo.latitude;
      const lon = geo.longitude;
      const city = geo.city || "Local";

      // Get Weather
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const weatherData = await weatherRes.json();
      const temp = weatherData.current_weather.temperature;

      // Map WMO code to condition
      const code = weatherData.current_weather.weathercode;
      let condition = "Clear";
      if (code >= 1 && code <= 3) condition = "Cloudy";
      if (code >= 51 && code <= 67) condition = "Rain";
      if (code >= 71 && code <= 77) condition = "Snow";
      if (code >= 95) condition = "Storm";

      return { temp: Math.round(temp), condition, city };
    } catch (e) {
      console.error("Weather fetch failed, using fallback:", e);
      return { temp: 22, condition: "Clear", city: "Local" };
    }
  }

  static isSafe(item: WardrobeItem, temp: number): boolean {
    const meta = item.meta;
    const sub = meta.sub_category.toLowerCase();
    const weather = meta.weather?.toLowerCase() || "";

    // Heat Stroke Prevention
    if (temp > 25) {
      const heavyItems = ["glove", "scarf", "beanie", "puffer", "heavy coat", "overcoat", "parka", "wool", "winter", "full sleeve", "long sleeve", "sweater", "jacket", "cardigan", "sweatshirt", "hoodie", "trench", "coat", "fleece", "thermals"];
      if (heavyItems.some((x) => sub.includes(x) || weather.includes(x))) return false;
      if (meta.seasonality.includes("Winter") && meta.seasonality.length === 1) return false;
    }

    if (temp > 28) {
      // Completely ban Outerwear above 28C
      if (meta.category === "Outerwear") return false;
    }

    // Hypothermia Prevention
    if (temp < 15) {
      const summerItems = ["shorts", "sandal", "linen", "tank", "summer"];
      if (summerItems.some((x) => sub.includes(x) || weather.includes(x))) return false;
      if (meta.seasonality.includes("Summer") && meta.seasonality.length === 1) return false;
    }

    return true;
  }
}

// 2. Color Harmony Engine
export class ColorHarmonyEngine {
  private static readonly NEUTRALS = ["black", "white", "grey", "gray", "beige", "brown", "navy", "cream", "khaki", "tan"];

  static evaluate(outfitItems: WardrobeItem[]): number {
    const colors = outfitItems.map(i => i.meta.color.toLowerCase());
    if (colors.length <= 1) return 1.0;

    const uniqueColors = new Set(colors);
    if (uniqueColors.size === 1) return 1.0; // Monochrome

    const isNeutral = (color: string) => this.NEUTRALS.some(n => color.includes(n));
    const neutralCount = colors.filter(isNeutral).length;

    // Neutral dominance is safe and looks good
    if (neutralCount >= colors.length - 1) return 0.9;

    // Lots of loud colors clashing
    if (colors.length - neutralCount >= 3) return 0.3;

    return 0.7; // Standard mix
  }
}

// 3. Formality Engine
export class FormalityEngine {
  static evaluate(outfitItems: WardrobeItem[]): number {
    if (outfitItems.length <= 1) return 1.0;
    const formalities = outfitItems.map(i => i.meta.formality);

    const unique = new Set(formalities);
    if (unique.size === 1) return 1.0;

    // Severe clashes
    if (unique.has("Formal") && unique.has("Athletic")) return 0.2;
    if (unique.has("Formal") && unique.has("Casual")) return 0.4;

    // Mild mix (Smart Casual + Casual)
    return 0.7;
  }
}

// 4. Style Profile Engine (Personalization Bias)
export class StyleProfileEngine {
  static evaluateBias(outfitItems: WardrobeItem[], styleProfile: any): number {
    if (!styleProfile || !styleProfile.result) return 0.5; // Neutral bias

    const profile = styleProfile.result;
    const colorSeason = profile.season?.toLowerCase() || "";
    const bodyArchetype = profile.body_archetype?.toLowerCase() || "";

    let score = 0.5;

    const outfitColors = outfitItems.map(i => i.meta.color.toLowerCase()).join(" ");
    if (colorSeason.includes("winter") && (outfitColors.includes("black") || outfitColors.includes("white") || outfitColors.includes("navy"))) {
      score += 0.2;
    }
    if (colorSeason.includes("autumn") && (outfitColors.includes("brown") || outfitColors.includes("olive") || outfitColors.includes("orange"))) {
      score += 0.2;
    }
    if (colorSeason.includes("summer") && (outfitColors.includes("blue") || outfitColors.includes("pink") || outfitColors.includes("grey"))) {
      score += 0.2;
    }
    if (colorSeason.includes("spring") && (outfitColors.includes("yellow") || outfitColors.includes("green") || outfitColors.includes("peach"))) {
      score += 0.2;
    }

    const hasOuterwear = outfitItems.some(i => i.meta.category === "Outerwear");
    if (bodyArchetype === "triangle" && hasOuterwear) {
      score += 0.15;
    }
    if (bodyArchetype === "inverted triangle" && outfitItems.some(i => i.meta.category === "Bottoms" && i.meta.style.toLowerCase().includes("wide"))) {
      score += 0.15;
    }

    return Math.min(Math.max(score, 0), 1);
  }
}

// 5. Feedback Engine (Personal Style Memory)
// Learns from outfit_feedback: builds a per-sub_category preference weight
// that persists across sessions, so likes/dislikes actually change future picks.
export class FeedbackEngine {
  /** +1 per like, -1 per dislike, keyed by wardrobe sub_category (e.g. "Chelsea Boots"). */
  static computeSubcategoryWeights(
    wardrobe: WardrobeItem[],
    feedback: FeedbackRecord[]
  ): Map<string, number> {
    const weights = new Map<string, number>();
    for (const fb of feedback) {
      if (!fb.item_ids?.length) continue;
      const items = wardrobe.filter((i) => fb.item_ids.includes(i.id));
      for (const item of items) {
        const sub = item.meta?.sub_category;
        if (!sub) continue;
        const delta = fb.liked ? 1 : -1;
        weights.set(sub, (weights.get(sub) || 0) + delta);
      }
    }
    return weights;
  }

  /** Normalized -1..1 score for a single item, used as a scoring term. */
  static scoreItem(item: WardrobeItem, weights: Map<string, number>): number {
    const raw = weights.get(item.meta?.sub_category) || 0;
    const clamped = Math.max(-3, Math.min(3, raw));
    return clamped / 3; // -1..1
  }

  /** True if this item has been net-disliked at least twice — hard exclude. */
  static isRejected(item: WardrobeItem, weights: Map<string, number>): boolean {
    const raw = weights.get(item.meta?.sub_category) || 0;
    return raw <= -2;
  }

  static averageScore(outfitItems: WardrobeItem[], weights: Map<string, number>): number {
    if (outfitItems.length === 0) return 0;
    const scores = outfitItems.map((i) => this.scoreItem(i, weights));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    // Map -1..1 -> 0..1 so it composes with the other 0..1 engines
    return (avg + 1) / 2;
  }
}

// 6. Main Planner Engine
export class ProPlannerV7 {
  private wardrobe: WardrobeItem[];
  private styleProfile: any;
  private feedbackWeights: Map<string, number>;

  constructor(
    wardrobe: WardrobeItem[],
    styleProfile: any,
    feedback: FeedbackRecord[] = []
  ) {
    this.wardrobe = wardrobe;
    this.styleProfile = styleProfile;
    this.feedbackWeights = FeedbackEngine.computeSubcategoryWeights(wardrobe, feedback);
  }

  public plan(query: string, weather: WeatherCondition): PlannerResult {
    let bestOutfit: OutfitRecommendation = {
      tops: null, bottoms: null, outerwear: null, shoes: null, accessory: null, one_piece: null
    };
    let maxConfidence = 0;
    let bestBreakdown = { color: 0, formality: 0, weather: 0, silhouette: 0, style: 0, feedback: 0 };

    const notRejected = (i: WardrobeItem) => !FeedbackEngine.isRejected(i, this.feedbackWeights);

    // Hard-filter: weather-unsafe AND net-disliked-twice-or-more items never enter the pool,
    // unless doing so would leave a category completely empty (fallback below).
    const applyFeedbackFilter = (items: WardrobeItem[]) => {
      const filtered = items.filter(notRejected);
      return filtered.length > 0 ? filtered : items; // don't leave user with nothing to wear
    };

    const tops = applyFeedbackFilter(this.wardrobe.filter(i => i.meta.category === "Tops" && WeatherEngine.isSafe(i, weather.temp)));
    const bottoms = applyFeedbackFilter(this.wardrobe.filter(i => i.meta.category === "Bottoms" && WeatherEngine.isSafe(i, weather.temp)));
    const shoes = applyFeedbackFilter(this.wardrobe.filter(i => i.meta.category === "Footwear" && WeatherEngine.isSafe(i, weather.temp)));
    const outerwear = applyFeedbackFilter(this.wardrobe.filter(i => i.meta.category === "Outerwear" && WeatherEngine.isSafe(i, weather.temp)));

    const queryLower = query.toLowerCase();

    const scoreItem = (item: WardrobeItem) => {
      let score = 0;
      const m = item.meta;

      if (queryLower.match(/formal|business|meeting|interview|wedding/)) {
        if (m.formality === "Formal" || m.formality === "Business Casual") score += 3;
        if (m.formality === "Athletic" || m.formality === "Casual") score -= 5;
      } else if (queryLower.match(/beach|lounge|home|lazy|chill|party|casual|gym|workout/)) {
        if (m.formality === "Casual" || m.formality === "Athletic") score += 3;
        if (m.formality === "Formal") score -= 5;
      } else if (queryLower.match(/date|dinner|smart|evening|night/)) {
        if (m.formality === "Smart Casual" || m.formality === "Business Casual") score += 3;
        if (m.formality === "Athletic") score -= 3;
      }

      if (queryLower.match(/avoid black|no black/) && m.color.toLowerCase().includes("black")) score -= 10;

      if (queryLower.includes(m.color.toLowerCase())) score += 1;
      if (queryLower.includes(m.sub_category.toLowerCase())) score += 2;
      if (queryLower.includes(m.style.toLowerCase())) score += 1;

      const sub = m.sub_category.toLowerCase();
      if (queryLower.match(/beach|summer party/)) {
        if (sub.includes("linen") || sub.includes("short") || sub.includes("sandal") || sub.includes("tank")) score += 5;
        if (sub.includes("cargo") || sub.includes("jeans") || sub.includes("boot") || sub.includes("long sleeve") || sub.includes("polo")) score -= 3;
      }

      if (queryLower.match(/lounge|home|lazy|chill/)) {
        if (sub.includes("sweatpant") || sub.includes("jogger") || sub.includes("hoodie") || sub.includes("slipper") || sub.includes("t-shirt") || sub.includes("tee")) score += 5;
        if (sub.includes("jeans") || sub.includes("chinos") || sub.includes("cargo") || sub.includes("boot") || sub.includes("leather") || sub.includes("polo") || sub.includes("button")) score -= 4;
      }

      if (queryLower.match(/rain|wet/)) {
        if (sub.includes("rain") || sub.includes("boot") || sub.includes("waterproof")) score += 4;
        if (sub.includes("suede") || sub.includes("white") || sub.includes("canvas") || sub.includes("linen")) score -= 3;
      }

      if (queryLower.match(/date|dinner/)) {
        if (sub.includes("button") || sub.includes("blazer") || sub.includes("oxford") || sub.includes("chelsea") || sub.includes("chinos") || sub.includes("henley")) score += 4;
        if (sub.includes("sweat") || sub.includes("graphic") || sub.includes("cargo") || sub.includes("running") || sub.includes("athletic")) score -= 5;
      }

      if (queryLower.match(/summer|hot|warm|beach/) && m.seasonality.includes("Summer")) score += 2;
      if (queryLower.match(/winter|cold|snow|freezing/) && m.seasonality.includes("Winter")) score += 2;
      if (queryLower.match(/rain|wet|monsoon/) && m.weather?.toLowerCase().includes("rain")) score += 2;

      // Personal memory: fold feedback directly into the ranking heuristic too,
      // so disliked-but-not-yet-rejected items still sink to the bottom of topN.
      score += FeedbackEngine.scoreItem(item, this.feedbackWeights) * 3;

      return score;
    };

    const topTops = tops.sort((a, b) => scoreItem(b) - scoreItem(a)).slice(0, 3);
    const topBottoms = bottoms.sort((a, b) => scoreItem(b) - scoreItem(a)).slice(0, 3);
    const topShoes = shoes.sort((a, b) => scoreItem(b) - scoreItem(a)).slice(0, 3);
    const topOuter = outerwear.sort((a, b) => scoreItem(b) - scoreItem(a)).slice(0, 2);

    for (const top of (topTops.length > 0 ? topTops : [null])) {
      for (const bottom of (topBottoms.length > 0 ? topBottoms : [null])) {
        for (const shoe of (topShoes.length > 0 ? topShoes : [null])) {
          for (const outer of (topOuter.length > 0 ? topOuter : [null])) {

            const currentOutfitItems = [top, bottom, shoe, outer].filter(Boolean) as WardrobeItem[];
            if (currentOutfitItems.length === 0) continue;

            const colorScore = ColorHarmonyEngine.evaluate(currentOutfitItems);
            const formalityScore = FormalityEngine.evaluate(currentOutfitItems);
            const styleScore = StyleProfileEngine.evaluateBias(currentOutfitItems, this.styleProfile);
            const feedbackScore = FeedbackEngine.averageScore(currentOutfitItems, this.feedbackWeights);

            const queryRelevance = currentOutfitItems.reduce((acc, item) => acc + scoreItem(item), 0) / Math.max(1, currentOutfitItems.length);

            const totalScore =
              (colorScore * 0.25) +
              (formalityScore * 0.25) +
              (styleScore * 0.15) +
              (Math.min(Math.max(queryRelevance, 0), 1) * 0.20) +
              (feedbackScore * 0.15);

            if (totalScore > maxConfidence) {
              maxConfidence = totalScore;
              bestOutfit = { tops: top || null, bottoms: bottom || null, outerwear: outer || null, shoes: shoe || null, accessory: null, one_piece: null };
              bestBreakdown = {
                color: colorScore,
                formality: formalityScore,
                weather: 1.0,
                silhouette: 0.8,
                style: styleScore,
                feedback: feedbackScore,
              };
            }
          }
        }
      }
    }

    return {
      outfit: bestOutfit,
      confidence: {
        score: maxConfidence,
        percentage: Math.round(maxConfidence * 100),
        breakdown: bestBreakdown
      },
      weather: weather,
      shopping_tip: maxConfidence < 0.6 ? "Consider adding more versatile neutral pieces to your wardrobe to increase combination possibilities." : "This outfit perfectly matches your style profile and the weather!"
    };
  }
}