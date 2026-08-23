import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { WorkspaceDashboard } from "@/components/workspace/WorkspaceDashboard";
import { useSession } from "@/lib/cloud/session";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "My Workspace — Alfa Mind Hub Teacher Studio" },
      {
        name: "description",
        content:
          "Your calm teacher workspace: continue recent worksheet drafts, organise folders, favourites and collections, and pick up exactly where you left off.",
      },
      { property: "og:title", content: "My Workspace — Alfa Mind Hub Teacher Studio" },
      {
        property: "og:description",
        content:
          "Continue recent worksheet drafts, organise folders and favourites, and resume editing in the Worksheet Studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const { user, loading } = useSession();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        {!loading && !user ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-cream/50 px-5 py-4">
            <p className="text-sm text-muted-foreground">
              You're working in this browser only. Sign in to keep every worksheet, folder and
              favourite saved to your teacher account on all your devices.
            </p>
            <Link
              to="/auth"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Log in or sign up
            </Link>
          </div>
        ) : null}
        <WorkspaceDashboard />
      </main>
    </div>
  );
}
