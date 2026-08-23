import { SignIn } from "@clerk/react";
import { createFileRoute } from "@tanstack/react-router";
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

function AuthPage() {
  const { next } = Route.useSearch();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const redirectTarget =
    safeNext(next) ?? (basePath ? `${basePath}/workspace` : "/workspace");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content" className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-5 py-14 sm:px-8">
        <SignIn
          routing="path"
          path={`${basePath}/auth`}
          signUpUrl={`${basePath}/auth`}
          forceRedirectUrl={redirectTarget}
        />
      </main>
    </div>
  );
}
