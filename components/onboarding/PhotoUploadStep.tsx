"use client";

import { ChangeEvent, useRef } from "react";
import { Upload, X, CheckCircle2 } from "lucide-react";
import { PHOTO_SLOTS, PHOTO_SLOT_LABELS, type PhotoSlot, type SupportedMimeType } from "@/types";

export interface UploadedPhoto {
  base64: string;
  mimeType: SupportedMimeType;
  previewUrl: string;
}

export type PhotosState = Partial<Record<PhotoSlot, UploadedPhoto>>;

interface PhotoUploadStepProps {
  photos: PhotosState;
  onSetPhoto: (slot: PhotoSlot, photo: UploadedPhoto) => void;
  onRemovePhoto: (slot: PhotoSlot) => void;
  onNext: () => void;
}

export function PhotoUploadStep({
  photos,
  onSetPhoto,
  onRemovePhoto,
  onNext,
}: PhotoUploadStepProps) {
  const fileInputRefs = useRef<Record<PhotoSlot, HTMLInputElement | null>>({
    "face-front": null,
    "face-side": null,
    "body-front": null,
    "body-side": null,
  });

  const handleFile = async (slot: PhotoSlot, file: File) => {
    if (!file.type.startsWith("image/")) return;
    
    // We expect JPEG, PNG, or WEBP
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Please upload a JPEG, PNG, or WebP image.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    
    // Resize image on the client side using a canvas to prevent OOM errors on the server.
    const img = document.createElement("img");
    img.src = previewUrl;
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      const MAX_EDGE = 1568;

      if (width > MAX_EDGE || height > MAX_EDGE) {
        const ratio = Math.min(MAX_EDGE / width, MAX_EDGE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const resizedBase64 = canvas.toDataURL("image/jpeg", 0.85);
        
        onSetPhoto(slot, {
          base64: resizedBase64,
          mimeType: "image/jpeg",
          previewUrl,
        });
      }
    };
  };

  const allFilled = PHOTO_SLOTS.every((slot) => !!photos[slot]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-serif font-medium text-foreground">Upload Your Photos</h2>
        <p className="mt-2 text-sm text-foreground/60">
          We need 4 distinct photos to accurately analyze your color profile, face shape, and body archetype.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {PHOTO_SLOTS.map((slot) => {
          const photo = photos[slot];
          return (
            <div
              key={slot}
              className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/50 p-6 transition-colors hover:bg-card hover:border-foreground/30 aspect-[3/4] overflow-hidden"
            >
              {photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt={PHOTO_SLOT_LABELS[slot]}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onRemovePhoto(slot)}
                      className="rounded-full bg-destructive p-2 text-destructive-foreground hover:scale-105 transition-transform"
                      title="Remove photo"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1 shadow-md">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                </>
              ) : (
                <div 
                  className="flex flex-col items-center text-center cursor-pointer h-full justify-center w-full"
                  onClick={() => fileInputRefs.current[slot]?.click()}
                >
                  <Upload className="h-8 w-8 text-foreground/40 mb-3" />
                  <span className="text-sm font-medium text-foreground/80">{PHOTO_SLOT_LABELS[slot]}</span>
                  <span className="text-xs text-foreground/40 mt-1">Tap to upload</span>
                </div>
              )}
              
              <input
                ref={(el) => {
                  fileInputRefs.current[slot] = el;
                }}
                type="file"
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(slot, file);
                  e.target.value = "";
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="pt-4 flex justify-end">
        <button
          onClick={onNext}
          disabled={!allFilled}
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
