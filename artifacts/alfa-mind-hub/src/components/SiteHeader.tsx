import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useClerk } from "@clerk/react";
import { Menu, X } from "lucide-react";
import { useSession } from "@/lib/cloud/session";
import { CloudSaveStatus } from "@/components/workspace/CloudSaveStatus";

const navItems = [
  { label: "Create", to: "/" },
  { label: "Ideas", to: "/ideas" },
  { label: "My Workspace", to: "/workspace" },
  { label: "My Classes", to: "/classes" },
  { label: "Idea Lab", to: "/idea-lab" },
  { label: "Library", to: "/library" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useSession();
  const { signOut: clerkSignOut } = useClerk();
  const navigate = useNavigate();

  const signOut = async () => {
    setOpen(false);
    await clerkSignOut();
    void navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="flex size-9 items-center justify-center rounded-xl bg-sage-soft text-sage">
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M12 4c2.5 2 4 4.4 4 7a4 4 0 0 1-8 0c0-2.6 1.5-5 4-7Z" />
              <path d="M12 15v5" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold text-foreground">
              Alfa Mind Hub
            </span>
            <span className="hidden text-[11px] tracking-wide text-muted-foreground sm:block">
              Calm learning materials
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Main">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-foreground font-semibold" }}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <CloudSaveStatus className="hidden md:inline" />
          <Link
            to="/idea-lab"
            className="hidden rounded-full border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-cream hover:text-foreground xl:block"
          >
            Inspire Me ✨
          </Link>
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              title={user.email ?? undefined}
              className="hidden rounded-full border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-cream hover:text-foreground lg:block"
            >
              Log out
            </button>
          ) : (
            <Link
              to="/auth"
              className="hidden rounded-full border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-cream hover:text-foreground lg:block"
            >
              Log in
            </Link>
          )}
          <Link
            to="/"
            className="hidden rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 lg:block"
          >
            Start creating
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-cream lg:hidden"
          >
            {open ? (
              <X className="size-5" strokeWidth={1.8} />
            ) : (
              <Menu className="size-5" strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t border-border/70 bg-background lg:hidden"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col px-5 py-3 sm:px-8">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "text-foreground font-semibold bg-cream" }}
                className="rounded-xl px-3 py-3 text-[15px] text-muted-foreground transition-colors hover:bg-cream hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/idea-lab"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full border border-border px-3 py-2.5 text-center text-sm text-muted-foreground transition-colors hover:bg-cream hover:text-foreground"
            >
              Inspire Me ✨
            </Link>
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
            >
              Start creating
            </Link>
            {user ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-2 rounded-full border border-border px-4 py-2.5 text-center text-sm text-muted-foreground"
              >
                Log out ({user.email})
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full border border-border px-4 py-2.5 text-center text-sm text-muted-foreground"
              >
                Log in / Sign up
              </Link>
            )}
            <CloudSaveStatus className="mt-2 text-center" />
          </div>
        </nav>
      ) : null}
    </header>
  );
}
