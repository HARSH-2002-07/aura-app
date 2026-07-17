import { FadeUp } from "@/components/ui/fade-up";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center pt-24 pb-16">
      {/* Hero Section */}
      <section className="container mx-auto px-4 text-center">
        <FadeUp delay={0.1}>
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-sm font-medium text-foreground backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-accent" />
            <span>Discover your true style season</span>
          </div>
        </FadeUp>

        <FadeUp delay={0.2}>
          <h1 className="mx-auto max-w-4xl text-balance font-serif text-5xl leading-tight tracking-tight text-foreground md:text-7xl">
            Your wardrobe, <br />
            <span className="text-accent italic">curated by intelligence.</span>
          </h1>
        </FadeUp>

        <FadeUp delay={0.3}>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-foreground/70 md:text-xl">
            AURA combines personal color analysis with a digital closet to tell you exactly what looks best on you, every single day.
          </p>
        </FadeUp>

        <FadeUp delay={0.4} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth/signup"
            className="group flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-8 font-medium text-background transition-all hover:scale-105 hover:bg-foreground/90 hover:shadow-lg"
          >
            Start your style analysis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/onboarding"
            className="flex h-12 items-center justify-center rounded-full border border-border bg-background px-8 font-medium text-foreground transition-all hover:bg-muted"
          >
            See how it works
          </Link>
        </FadeUp>
      </section>

      {/* Visual Preview / Paper-doll mockup */}
      <section className="container mx-auto mt-24 px-4">
        <FadeUp delay={0.5}>
          <div className="relative mx-auto aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-2xl border border-border/50 bg-muted/30 shadow-2xl backdrop-blur-sm">
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background via-background/90 to-muted">
              {/* Abstract representation of the UI mockup */}
              <div className="flex h-full w-full items-center justify-center gap-8 p-8">
                {/* Palette Panel */}
                <div className="hidden h-full w-1/4 flex-col gap-4 rounded-xl bg-background p-6 shadow-sm md:flex border border-border/40">
                  <div className="h-4 w-24 rounded-full bg-muted"></div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="aspect-square rounded-lg bg-accent/20"></div>
                    <div className="aspect-square rounded-lg bg-success/20"></div>
                    <div className="aspect-square rounded-lg bg-[#C9A66B]/20"></div>
                    <div className="aspect-square rounded-lg bg-destructive/20"></div>
                  </div>
                </div>
                
                {/* Paper-doll Panel */}
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-background/50 p-6 shadow-sm border border-border/40">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-32 w-32 rounded-lg bg-muted"></div>
                    <div className="h-40 w-32 rounded-lg bg-muted"></div>
                    <div className="h-16 w-32 rounded-lg bg-muted"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>
    </div>
  );
}
