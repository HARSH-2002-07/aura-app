"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoUploadStep, type PhotosState, type UploadedPhoto } from "@/components/onboarding/PhotoUploadStep";
import { ProfileStep } from "@/components/onboarding/ProfileStep";
import { ReviewStep } from "@/components/onboarding/ReviewStep";
import type { ApiErrorResponse, PhotoSlot, ProfileData, StyleResult } from "@/types";

type Step = "photos" | "profile" | "review";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("photos");
  const [photos, setPhotos] = useState<PhotosState>({});
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const photosRef = useRef<PhotosState>(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      Object.values(photosRef.current).forEach((p) => {
        if (p) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, []);

  const handleSetPhoto = useCallback((slot: PhotoSlot, photo: UploadedPhoto) => {
    setPhotos((prev) => {
      const existing = prev[slot];
      if (existing) URL.revokeObjectURL(existing.previewUrl);
      return { ...prev, [slot]: photo };
    });
  }, []);

  const handleRemovePhoto = useCallback((slot: PhotoSlot) => {
    setPhotos((prev) => {
      const existing = prev[slot];
      if (existing) URL.revokeObjectURL(existing.previewUrl);
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting || !profile) return;
    const slots: PhotoSlot[] = ["face-front", "face-side", "body-front", "body-side"];
    if (slots.some((s) => !photos[s])) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: {
            "face-front": {
              base64: photos["face-front"]!.base64,
              mimeType: photos["face-front"]!.mimeType,
            },
            "face-side": {
              base64: photos["face-side"]!.base64,
              mimeType: photos["face-side"]!.mimeType,
            },
            "body-front": {
              base64: photos["body-front"]!.base64,
              mimeType: photos["body-front"]!.mimeType,
            },
            "body-side": {
              base64: photos["body-side"]!.base64,
              mimeType: photos["body-side"]!.mimeType,
            },
          },
          profile,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        if (res.status === 402) {
          setSubmitError("You've used your free analysis. Upgrade to Pro for unlimited analyses.");
        } else if (res.status === 429) {
          setSubmitError("Too many analyses in a short time — please try again in a bit.");
        } else {
          setSubmitError(body?.error ?? "Something went wrong. Please try again.");
        }
        setSubmitting(false);
        return;
      }

      const data = (await res.json()) as { analysisId: string; result: StyleResult };
      router.push(`/dashboard?newAnalysis=${data.analysisId}`);
    } catch (err) {
      console.error(err);
      setSubmitError("Network error — check your connection and try again.");
      setSubmitting(false);
    }
  }, [photos, profile, submitting, router]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background py-12 px-4">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-lg shadow-black/5">
          <Stepper current={step} />

          <div className="mt-10">
            {step === "photos" && (
              <PhotoUploadStep
                photos={photos}
                onSetPhoto={handleSetPhoto}
                onRemovePhoto={handleRemovePhoto}
                onNext={() => setStep("profile")}
              />
            )}

            {step === "profile" && (
              <ProfileStep
                initialValue={profile ?? {}}
                onBack={() => setStep("photos")}
                onNext={(p) => {
                  setProfile(p);
                  setStep("review");
                }}
              />
            )}

            {step === "review" && profile && (
              <ReviewStep
                photos={photos}
                profile={profile}
                submitting={submitting}
                submitError={submitError}
                onBack={() => setStep("profile")}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Stepper({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "photos", label: "Photos" },
    { key: "profile", label: "Profile" },
    { key: "review", label: "Review" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center justify-between">
      {steps.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold border transition-all duration-300 ${
              i <= currentIndex
                ? "bg-foreground border-foreground text-background shadow-md scale-110"
                : "bg-background border-border text-foreground/40"
            }`}
          >
            {i + 1}
          </div>
          <span className={`ml-3 text-sm font-semibold transition-colors hidden sm:block ${i <= currentIndex ? "text-foreground" : "text-foreground/40"}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && <div className={`mx-3 sm:mx-4 h-px flex-1 transition-colors ${i < currentIndex ? "bg-foreground" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}
