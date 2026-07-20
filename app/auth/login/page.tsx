import Link from "next/link";
import { Sparkles } from "lucide-react";
import { login } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const { message } = await searchParams;
  return (
    <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border/50 bg-background/50 p-8 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2 group mb-6">
            <Sparkles className="h-6 w-6 text-accent transition-transform group-hover:scale-110" />
            <span className="font-serif text-2xl font-medium tracking-wide text-foreground">
              AURA
            </span>
          </Link>
          <h2 className="mt-2 text-center font-serif text-3xl font-bold tracking-tight text-foreground">
            Sign in to your account
          </h2>
        </div>

        <form className="mt-8 space-y-6" action={login}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground/80">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder-foreground/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground/80">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder-foreground/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
              />
            </div>
          </div>

          {message && (
            <p className={`mt-4 text-center text-sm p-3 rounded-md ${
              message.startsWith("Check") 
                ? "text-accent bg-accent/10" 
                : "text-destructive bg-destructive/10"
            }`}>
              {message}
            </p>
          )}

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors"
            >
              Sign in
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-foreground/60">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="font-medium text-accent hover:text-accent/80 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
