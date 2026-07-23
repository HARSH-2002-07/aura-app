"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

export function Uploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const router = useRouter();

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        const file = files[i];

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
        });
        reader.readAsDataURL(file);
        const base64 = await base64Promise;
        
        // Set preview URL to show exactly what the browser sees
        setPreviewUrl(base64);

      // We'll use "Tops" as a default category for now, or let Llama Vision auto-detect it
      const category = "Tops";

      const res = await fetch("/api/wardrobe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64: base64,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || "Failed to process image");
      }

      }
      
      // Refresh only once after all uploads are done
      router.refresh();
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload one or more images.");
    } finally {
      setIsUploading(false);
      setPreviewUrl(null);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div
      className={`relative rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-border bg-card/50"
      }`}
      style={{ minHeight: "300px" }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) handleFiles(files);
      }}
    >
      {isUploading ? (
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium text-center">
            {uploadProgress.total > 1 
              ? `Processing image ${uploadProgress.current} of ${uploadProgress.total}...`
              : "Removing background & AI tagging..."}
          </p>
        </div>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">Add to Wardrobe</p>
          <p className="text-muted-foreground text-sm text-center mb-6">
            Drag and drop a photo of a clothing item
          </p>
          <label className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium cursor-pointer hover:bg-primary/90 transition-colors">
            Browse Files
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) handleFiles(files);
              }}
            />
          </label>
        </>
      )}
    </div>
  );
}
