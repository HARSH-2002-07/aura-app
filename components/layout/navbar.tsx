import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 group">
          <Sparkles className="h-5 w-5 text-accent transition-transform group-hover:scale-110" />
          <span className="font-serif text-xl font-medium tracking-wide text-foreground">
            AURA
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-6">
          <Link
            href="/onboarding"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            How it works
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform hover:-translate-y-px hover:shadow-md"
            >
              Get started
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
