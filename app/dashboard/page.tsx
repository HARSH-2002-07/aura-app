import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "../auth/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex flex-1 flex-col p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground">
            Welcome to AURA
          </h1>
          <p className="text-foreground/60 mt-2">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder cards for future phases */}
        <div className="p-6 rounded-2xl border border-border bg-card">
          <h3 className="font-medium text-lg text-card-foreground">Style Profile</h3>
          <p className="text-muted-foreground mt-2">Complete your onboarding to unlock your personal style profile.</p>
        </div>
        <div className="p-6 rounded-2xl border border-border bg-card">
          <h3 className="font-medium text-lg text-card-foreground">Virtual Closet</h3>
          <p className="text-muted-foreground mt-2">0 items in your wardrobe.</p>
        </div>
        <div className="p-6 rounded-2xl border border-border bg-card">
          <h3 className="font-medium text-lg text-card-foreground">Subscription</h3>
          <p className="text-muted-foreground mt-2">Free Tier</p>
        </div>
      </div>
    </div>
  );
}
