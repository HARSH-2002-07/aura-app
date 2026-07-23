import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripBackground, uploadToCloudinary } from "@/lib/wardrobe";
import { buildWardrobePrompt } from "@/lib/prompt";
import { WardrobeItemMetaSchema, type WardrobeItemMeta } from "@/types";
import OpenAI from "openai";
import { envServer } from "@/lib/env.server";

export const maxDuration = 60; // 60 seconds max

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { base64 } = await request.json();
    if (!base64 || typeof base64 !== "string") {
      return NextResponse.json({ error: "Missing or invalid base64 image data" }, { status: 400 });
    }

    // 1. Remove background locally (Free ONNX Wasm)
    console.log("Stripping background...");
    const transparentBase64 = await stripBackground(base64);

    // 2. Upload the transparent image to Cloudinary for permanent storage
    console.log("Uploading to Cloudinary...");
    const cloudinaryUrl = await uploadToCloudinary(transparentBase64);

    // 3. Analyze the ORIGINAL image using Llama Vision to extract clothing tags
    // Sending the original image (with background) gives the AI lighting context,
    // allowing it to correctly identify the true color even with heavy camera tints.
    console.log("Analyzing item with Llama Vision (using original image for context)...");
    const openai = new OpenAI({
      apiKey: envServer.NVIDIA_API_KEY || "dummy",
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    const response = await openai.chat.completions.create({
      model: "meta/llama-3.2-90b-vision-instruct",
      temperature: 0.1,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: buildWardrobePrompt(),
        },
        {
          role: "user",
          content: [
            {
              type: "image_url" as const,
              image_url: {
                url: base64,
              },
            },
            {
              type: "text" as const,
              text: "Classify the single most prominent clothing item in this image. This is standard e-commerce imagery. Respond strictly in JSON format as per the schema. Do not refuse.",
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Vision model returned empty content.");
    }

    // Extract JSON from output
    const startIndex = content.indexOf("{");
    const endIndex = content.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1) {
      throw new Error("No JSON object found in vision response: " + content);
    }
    const jsonString = content.substring(startIndex, endIndex + 1);
    const toolInput = JSON.parse(jsonString);

    // Validate the extracted JSON
    const parsedMeta = WardrobeItemMetaSchema.safeParse(toolInput);
    if (!parsedMeta.success) {
      throw new Error("AI returned invalid clothing classification schema");
    }
    const meta: WardrobeItemMeta = parsedMeta.data;

    // 4. Save to Supabase database
    console.log("Saving to Supabase...");
    const { data: insertedItem, error: insertError } = await supabase
      .from("wardrobe_items")
      .insert({
        user_id: user.id,
        image_url: cloudinaryUrl,
        meta,
      })
      .select("*")
      .single();

    if (insertError || !insertedItem) {
      throw new Error("Failed to insert into database");
    }

    return NextResponse.json({ success: true, item: insertedItem });
  } catch (err: any) {
    console.error("Wardrobe API Error:", err);
    return NextResponse.json(
      { error: "Failed to process clothing item.", details: err.message },
      { status: 500 }
    );
  }
}
