"use client";

import { useState } from "react";
import { type ProfileData, GENDERS, BUDGETS, CLIMATES } from "@/types";

interface ProfileStepProps {
  initialValue: Partial<ProfileData>;
  onNext: (profile: ProfileData) => void;
  onBack: () => void;
}

export function ProfileStep({ initialValue, onNext, onBack }: ProfileStepProps) {
  const [formData, setFormData] = useState<Partial<ProfileData>>(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app we'd validate with Zod here before submitting
    onNext(formData as ProfileData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ["age", "height"].includes(name) ? parseInt(value) || "" : value,
    }));
  };

  const isComplete = 
    formData.age && 
    formData.gender && 
    formData.height && 
    formData.budget && 
    formData.context && 
    formData.climate && 
    formData.intent;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-serif font-medium text-foreground">Tell us about yourself</h2>
        <p className="mt-2 text-sm text-foreground/60">
          This context helps our AI tailor your style profile specifically to your lifestyle and needs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">Age</label>
          <input
            type="number"
            name="age"
            min={13}
            max={100}
            required
            value={formData.age || ""}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="e.g. 28"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">Gender</label>
          <select
            name="gender"
            required
            value={formData.gender || ""}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          >
            <option value="" disabled>Select gender...</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">Height (cm)</label>
          <input
            type="number"
            name="height"
            min={100}
            max={250}
            required
            value={formData.height || ""}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="e.g. 175"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">Budget Tier</label>
          <select
            name="budget"
            required
            value={formData.budget || ""}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          >
            <option value="" disabled>Select budget...</option>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">Climate</label>
          <select
            name="climate"
            required
            value={formData.climate || ""}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          >
            <option value="" disabled>Select climate...</option>
            {CLIMATES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium text-foreground/80">Primary Dressing Context</label>
          <input
            type="text"
            name="context"
            required
            minLength={2}
            maxLength={80}
            value={formData.context || ""}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="e.g. Corporate office, remote work, college campus..."
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium text-foreground/80">Styling Intent</label>
          <textarea
            name="intent"
            required
            minLength={2}
            maxLength={300}
            rows={3}
            value={formData.intent || ""}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="e.g. I want to look more approachable but authoritative. Trying to move away from graphic tees."
          />
        </div>
      </div>

      <div className="pt-4 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full px-6 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!isComplete}
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
