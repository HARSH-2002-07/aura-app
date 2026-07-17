import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background py-12 mt-auto">
      <div className="container mx-auto max-w-screen-2xl px-4 md:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2 text-foreground/80">
            <Sparkles className="h-4 w-4" />
            <span className="font-serif font-medium tracking-wide">AURA</span>
          </div>
          <p className="text-sm text-foreground/60 text-center md:text-left">
            &copy; {new Date().getFullYear()} AURA. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
