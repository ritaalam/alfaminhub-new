import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

/** Only same-origin relative paths may be used as a post-auth return target. */
function safeNext(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = safeNext(s["next"]);
    return next ? { next } : {};
  },

  head: () => ({
    meta: [
      { title: "Teacher Account — Sign in to Alfa Mind Hub" },
      {
        name: "description",
        content:
          "Sign in or create a free teacher account to keep your Alfa Mind Hub worksheets, folders and favourites saved to the cloud on every device.",
      },
      { property: "og:title", content: "Teacher Account — Sign in to Alfa Mind Hub" },
      {
        property: "og:description",
        content: "Keep your worksheets, folders and favourites saved to your teacher account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const returnTo = safeNext(next);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function goAfterAuth() {
    if (returnTo) window.location.href = returnTo;
    else void navigate({ to: "/workspace" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        goAfterAuth();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: returnTo
              ? `${window.location.origin}${returnTo}`
              : window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) goAfterAuth();
        else setNotice("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create your teacher account"
        : "Reset your password";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-md px-5 py-14 sm:px-8">
        <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your worksheets, folders and favourites stay saved to your account — on desktop, tablet
          and mobile.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "signup" ? (
            <label className="block">
              <span className="text-sm text-muted-foreground">Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-sm text-muted-foreground">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>

          {mode !== "forgot" ? (
            <label className="block">
              <span className="text-sm text-muted-foreground">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {notice ? <p className="text-sm text-sage">{notice}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Log in"
                : mode === "signup"
                  ? "Sign up"
                  : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-sm">
          {mode !== "signin" ? (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Already have an account? Log in
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="block text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                New here? Create a teacher account
              </button>
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="block text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot your password?
              </button>
            </>
          )}
          <Link
            to="/workspace"
            className="block text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Continue without an account
          </Link>
        </div>
      </main>
    </div>
  );
}
