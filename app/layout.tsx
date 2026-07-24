import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "AURA | Personal AI Stylist & Wardrobe Intelligence",
  description: "Transform your digital closet with AI-driven color season analysis, body archetype fitting, real-time weather adaptation, and personalized generative outfits.",
  keywords: ["AI Stylist", "Wardrobe Assistant", "Color Season Analysis", "Fashion AI", "Outfit Planner"],
  openGraph: {
    title: "AURA | Personal AI Stylist & Wardrobe Intelligence",
    description: "Your hyper-personalized AI fashion advisor and digital closet manager.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
