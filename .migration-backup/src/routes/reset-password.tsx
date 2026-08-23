import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a New Password — Alfa Mind Hub" },
      {
        name: "description",
        content:
          "Choose a new password for your Alfa Mind Hub teacher account and get straight back to your saved worksheets.",
      },
      { property: "og:title", content: "Set a New Password — Alfa Mind Hub" },
      {
        property: "og:description",
        content: "Choose a new password for your Alfa Mind Hub teacher account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      void navigate({ to: "/workspace" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-md px-5 py-14 sm:px-8">
        <h1 className="font-display text-2xl font-semibold text-foreground">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open this page from the reset link in your email, then choose a new password.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="text-sm text-muted-foreground">New password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      </main>
    </div>
  );
}
