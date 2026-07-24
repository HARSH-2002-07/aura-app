import { redirect } from "next/navigation";

// The standalone outfit planner has been merged into the AURA Stylist chat
// experience (see app/stylist). This route now just forwards users there so
// any old bookmarks/links keep working.
export default function OutfitPage() {
  redirect("/stylist");
}