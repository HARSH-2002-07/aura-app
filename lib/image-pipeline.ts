import "server-only";
import sharp from "sharp";
import type { PhotoData, SupportedMimeType } from "@/types";

sharp.cache(false);
sharp.concurrency(1);

const MAX_DECODED_BYTES = 8 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const MIN_DIMENSION_PX = 200;
const LLM_MAX_EDGE_PX = 1568;
const LLM_JPEG_QUALITY = 85;

const SHARP_FORMAT_TO_MIME: Record<string, SupportedMimeType | undefined> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export class ImageValidationError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function toRawBase64(value: string): string {
  const match = value.match(/^data:[^;]+;base64,([\s\S]*)$/);
  return match && match[1] ? match[1] : value;
}

export async function validateAndNormalizePhoto(
  slot: string,
  photo: PhotoData
): Promise<{ base64: string; mimeType: SupportedMimeType }> {
  const rawBase64 = toRawBase64(photo.base64);

  let buffer: Buffer;
  try {
    buffer = Buffer.from(rawBase64, "base64");
  } catch {
    throw new ImageValidationError(`${slot}: could not decode image data`, 400);
  }

  if (buffer.length === 0) {
    throw new ImageValidationError(`${slot}: empty image data`, 400);
  }

  if (buffer.length > MAX_DECODED_BYTES) {
    throw new ImageValidationError(`${slot}: image exceeds 8MB after decoding`, 413);
  }

  let metadata: import("sharp").Metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new ImageValidationError(`${slot}: file is not a readable image`, 415);
  }

  const realMime = metadata.format ? SHARP_FORMAT_TO_MIME[metadata.format as string] : undefined;
  if (!realMime) {
    throw new ImageValidationError(
      `${slot}: unsupported image format (only JPEG, PNG, WebP allowed)`,
      415
    );
  }

  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width < MIN_DIMENSION_PX ||
    metadata.height < MIN_DIMENSION_PX
  ) {
    throw new ImageValidationError(`${slot}: image resolution too low to analyse`, 400);
  }

  const normalized = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .resize({ width: LLM_MAX_EDGE_PX, height: LLM_MAX_EDGE_PX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: LLM_JPEG_QUALITY })
    .toBuffer();

  return {
    base64: normalized.toString("base64"),
    mimeType: "image/jpeg",
  };
}

export async function stitchImagesIntoGrid(base64Images: string[]): Promise<string> {
  if (base64Images.length === 0) throw new Error("No images to stitch");
  if (base64Images.length === 1) return base64Images[0];

  const buffers = base64Images.map(b => Buffer.from(b, "base64"));
  
  const cellWidth = 512;
  const cellHeight = 512;
  
  const resizedBuffers: Buffer[] = [];
  for (const b of buffers) {
    resizedBuffers.push(
      await sharp(b)
        .resize({ width: cellWidth, height: cellHeight, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .toBuffer()
    );
  }

  const gridWidth = cellWidth * 2;
  const gridHeight = cellHeight * Math.ceil(base64Images.length / 2);

  const composites = resizedBuffers.map((b, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    return {
      input: b,
      top: row * cellHeight,
      left: col * cellWidth,
    };
  });

  const gridBuffer = await sharp({
    create: {
      width: gridWidth,
      height: gridHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toBuffer();

  return gridBuffer.toString("base64");
}
