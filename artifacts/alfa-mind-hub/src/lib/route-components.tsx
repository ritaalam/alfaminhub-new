import { Link } from "wouter";

export function IntegrationUnavailablePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <section className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage">Alfa Mind Hub</p>
        <h1 className="mt-3 font-display text-3xl text-foreground">This integration is unavailable</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This developer-only Lovable integration was not part of the teacher workspace and is not
          available in the Replit version.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Return to the worksheet creator
        </Link>
      </section>
    </main>
  );
}