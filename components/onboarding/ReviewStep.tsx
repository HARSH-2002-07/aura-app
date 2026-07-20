"use client";

import { Loader2 } from "lucide-react";
import type { ProfileData } from "@/types";
import type { PhotosState } from "./PhotoUploadStep";

interface ReviewStepProps {
  photos: PhotosState;
  profile: ProfileData;
  submitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onSubmit: () => void;
}

export function ReviewStep({
  photos,
  profile,
  submitting,
  submitError,
  onBack,
  onSubmit,
}: ReviewStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-serif font-medium text-foreground">Review & Submit</h2>
        <p className="mt-2 text-sm text-foreground/60">
          Almost there! Review your information before our AI starts analyzing your profile.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4">Your Photos</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {Object.values(photos).map((p, i) => (
              p && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={p.previewUrl}
                  alt="Upload preview"
                  className="h-24 w-24 object-cover rounded-lg border border-border/50 shadow-sm shrink-0"
                />
              )
            ))}
          </div>
        </div>

        <div className="h-px bg-border w-full" />

        <div>
          <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4">Your Profile</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
            <div>
              <span className="text-foreground/50 block">Age</span>
              <span className="font-medium text-foreground">{profile.age}</span>
            </div>
            <div>
              <span className="text-foreground/50 block">Gender</span>
              <span className="font-medium text-foreground capitalize">{profile.gender}</span>
            </div>
            <div>
              <span className="text-foreground/50 block">Height</span>
              <span className="font-medium text-foreground">{profile.height} cm</span>
            </div>
            <div>
              <span className="text-foreground/50 block">Budget</span>
              <span className="font-medium text-foreground capitalize">{profile.budget}</span>
            </div>
            <div>
              <span className="text-foreground/50 block">Climate</span>
              <span className="font-medium text-foreground capitalize">{profile.climate}</span>
            </div>
            <div className="col-span-2">
              <span className="text-foreground/50 block">Context</span>
              <span className="font-medium text-foreground">{profile.context}</span>
            </div>
            <div className="col-span-2">
              <span className="text-foreground/50 block">Intent</span>
              <span className="font-medium text-foreground">{profile.intent}</span>
            </div>
          </div>
        </div>
      </div>

      {submitError && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
          {submitError}
        </div>
      )}

      <div className="pt-4 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-full px-6 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze My Style"
          )}
        </button>
      </div>
    </div>
  );
}
