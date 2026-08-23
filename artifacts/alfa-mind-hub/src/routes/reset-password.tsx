import { createFileRoute, Link } from "@tanstack/react-router";
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
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-md px-5 py-14 sm:px-8">
        <h1 className="font-display text-2xl font-semibold text-foreground">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Continue to account access to reset your Alfa Mind Hub password securely.
        </p>
        <Link
          to="/auth"
          className="mt-7 inline-flex rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Continue to account access
        </Link>
      </main>
    </div>
  );
}
