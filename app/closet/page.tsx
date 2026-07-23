import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Uploader } from "@/components/closet/Uploader";
import { WardrobeGrid } from "@/components/closet/WardrobeGrid";
import { type WardrobeItem } from "@/types";

export default async function ClosetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch user's wardrobe items
  const { data: items, error } = await supabase
    .from("wardrobe_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch wardrobe:", error);
  }

  const wardrobeItems = (items as WardrobeItem[]) || [];

  return (
    <div className="flex flex-1 flex-col p-8 space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground">
            Virtual Closet
          </h1>
          <p className="text-foreground/60 mt-2">
            Upload clothes to automatically remove the background and tag them.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <Uploader />
        <WardrobeGrid items={wardrobeItems} />
      </div>
    </div>
  );
}
