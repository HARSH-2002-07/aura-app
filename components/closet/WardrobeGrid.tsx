"use client";

import Image from "next/image";
import { type WardrobeItem, type WardrobeItemMeta, WARDROBE_CATEGORIES, WARDROBE_FORMALITIES } from "@/types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Edit2, X, Heart } from "lucide-react";

export function WardrobeGrid({ items }: { items: WardrobeItem[] }) {
  const router = useRouter();
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", ...WARDROBE_CATEGORIES];

  const filteredItems = selectedCategory === "All" 
    ? items 
    : items.filter(item => item.meta.category === selectedCategory);

  const handleToggleFavorite = async (item: WardrobeItem) => {
    try {
      const updatedMeta = { ...item.meta, is_favorite: !item.meta.is_favorite };
      const res = await fetch(`/api/wardrobe/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedMeta),
      });
      if (!res.ok) throw new Error("Failed to update");
      router.refresh();
    } catch (error) {
      alert("Failed to update favorite status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/wardrobe/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.refresh();
    } catch (error) {
      alert("Failed to delete item.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;

    const formData = new FormData(e.currentTarget);
    const meta: WardrobeItemMeta = {
      category: formData.get("category") as any,
      sub_category: formData.get("sub_category") as string,
      color: formData.get("color") as string,
      hex_color: formData.get("hex_color") as string,
      formality: formData.get("formality") as any,
      pattern: formData.get("pattern") as string,
      fabric: formData.get("fabric") as string || "Unknown",
      style: formData.get("style") as string || "Unknown",
      weather: formData.get("weather") as string || "Unknown",
      seasonality: ["Spring", "Summer", "Autumn", "Winter"].filter(s => formData.get(`season_${s}`)) as any,
      confidence_score: editingItem.meta.confidence_score, // keep original
      is_favorite: editingItem.meta.is_favorite, // preserve favorite state
    };

    if (meta.seasonality.length === 0) meta.seasonality = ["Spring"]; // ensure at least 1

    try {
      const res = await fetch(`/api/wardrobe/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingItem(null);
      router.refresh();
    } catch (error) {
      alert("Failed to update item.");
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-12 text-center col-span-full">
        <p className="text-muted-foreground">Your virtual closet is empty.</p>
        <p className="text-muted-foreground text-sm mt-1">Upload a clothing item to get started.</p>
      </div>
    );
  }

  return (
    <div className="col-span-full space-y-6">
      {/* Category Filter */}
      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat 
                  ? "bg-foreground text-background" 
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredItems.map((item) => (
        <div
          key={item.id}
          className="group relative rounded-3xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Action Buttons */}
          <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button
              onClick={() => handleToggleFavorite(item)}
              className="p-2 bg-background/80 backdrop-blur-sm hover:bg-background border border-border rounded-full shadow-sm transition-colors"
            >
              <Heart className={`w-4 h-4 ${item.meta.is_favorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
            </button>
            <button
              onClick={() => setEditingItem(item)}
              className="p-2 bg-background/80 backdrop-blur-sm hover:bg-background border border-border rounded-full shadow-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              disabled={isDeleting === item.id}
              className="p-2 bg-background/80 backdrop-blur-sm hover:bg-destructive/10 border border-border rounded-full shadow-sm text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="aspect-[4/5] w-full relative bg-secondary/20 p-4">
            <Image
              src={item.image_url}
              alt={item.meta.sub_category}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          </div>
          <div className="p-4 border-t border-border">
            <h3 className="font-medium text-foreground">{item.meta.sub_category}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="w-4 h-4 rounded-full border border-border"
                style={{ backgroundColor: item.meta.hex_color }}
                title={item.meta.color}
              />
              <span className="text-sm text-muted-foreground">{item.meta.color}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full">
                {item.meta.category}
              </span>
              <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full">
                {item.meta.formality}
              </span>
              {item.meta.fabric && (
                <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full">
                  {item.meta.fabric}
                </span>
              )}
              {item.meta.style && (
                <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full">
                  {item.meta.style}
                </span>
              )}
              {item.meta.weather && (
                <span className="text-xs px-2 py-1 bg-secondary/50 text-secondary-foreground rounded-full border border-secondary">
                  ☁️ {item.meta.weather}
                </span>
              )}
            </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-lg overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="font-serif text-xl font-medium">Edit Wardrobe Item</h2>
              <button onClick={() => setEditingItem(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Category</label>
                  <select name="category" defaultValue={editingItem.meta.category} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm">
                    {WARDROBE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Formality</label>
                  <select name="formality" defaultValue={editingItem.meta.formality} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm">
                    {WARDROBE_FORMALITIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Item Name / Sub-category</label>
                <input name="sub_category" defaultValue={editingItem.meta.sub_category} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
              </div>

              <div className="grid grid-cols-[1fr,auto] gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Color Name</label>
                  <input name="color" defaultValue={editingItem.meta.color} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Hex</label>
                  <input type="color" name="hex_color" defaultValue={editingItem.meta.hex_color} required className="w-16 h-10 p-1 rounded-lg border border-border bg-background cursor-pointer" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Pattern</label>
                  <input name="pattern" defaultValue={editingItem.meta.pattern} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Fabric</label>
                  <input name="fabric" defaultValue={editingItem.meta.fabric} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Style</label>
                  <input name="style" defaultValue={editingItem.meta.style} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Weather</label>
                  <input name="weather" defaultValue={editingItem.meta.weather} required className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Seasonality</label>
                <div className="flex gap-4">
                  {["Spring", "Summer", "Autumn", "Winter"].map(season => (
                    <label key={season} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name={`season_${season}`} defaultChecked={editingItem.meta.seasonality.includes(season as any)} className="rounded border-border text-foreground focus:ring-foreground" />
                      {season}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-full transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 text-sm font-medium bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
