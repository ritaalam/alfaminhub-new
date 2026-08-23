# Alfa Mind Hub — Full Audit Report + Staged Repair Plan

No code was changed. Everything below is based on reading the current project files, routes, database migrations and the latest build log.

## 1. What actually works today

- **Build is green.** The latest build log says `build OK`, and no runtime or console errors were captured from the current preview session.
- **Routes exist and are wired:** `/` (Creator), `/auth`, `/reset-password`, `/workspace`, `/classes`, `/ideas`, `/idea-lab`, `/library`, `/visual-directions`, plus MCP/OAuth/email service routes. Every page renders a `SiteHeader`, a `#main-content` landmark, and its own `head()` metadata (unique title + description + og tags) — SEO basics are in place on all content routes.
- **Worksheet generation engine:** deterministic mechanics (counting, phonics, patterns, cut & create, memory pairs), page-directive parsing, skill/theme fidelity guards, semantic QA, and a large regression test suite.
- **Worksheet Studio:** A4 print-accurate canvas in millimetres, page thumbnails, visual direction presets, print/colour modes, and a guard that pauses download until the worksheet matches the request.
- **Workspace/Classes/Library:** local persistence plus cloud sync, folders, favourites, collections, class profiles that prefill the Creator, Idea Lab handoff into the Creator.
- **Backend:** `profiles`, `workspaces`, `workspace_revisions` tables, each with owner-scoped RLS policies and explicit grants. Email/password auth and password reset flow present.
- **Accessibility groundwork:** skip-to-content link, focus-visible system, reduced-motion support, 40px minimum tap targets, labelled mobile nav toggle.

## 2. Findings by priority

### P0 — blocks real users
1. **"Download PDF" is really "open the browser print dialog."** Both the Studio and the Workspace card actions trigger printing; there is no generated PDF file. On iOS/Android browsers this often produces a poor or failed result, and the label promises something the app does not deliver.
2. **No Google sign-in.** `auth.tsx` offers email/password only. For teachers this is the highest-friction part of onboarding, and the project standard is to offer Google.
3. **Old-site expectation gap.** The public domain historically implied a browsable printable library / shop. In this codebase `/library` is a personal favourites-and-collections view fed by the teacher's own drafts — there is no public catalogue, no product/detail pages, no file downloads. Any inbound link or expectation pointing at those surfaces has nowhere to land.

### P1 — significant quality problems
4. **Empty-state dead ends.** `/library`, `/workspace` and `/classes` show text-only empty states with no primary action button, so a new signed-up teacher sees blank panels rather than a next step.
5. **No account management.** There is no profile page, no email change, no account deletion, and no way to see what is stored in the cloud — a gap for privacy expectations and app-store/GDPR-style requests.
6. **Cloud sync is invisible on mobile.** The `CloudSaveStatus` indicator is hidden below `md`, so on phones a teacher cannot tell whether work is saved locally or to the account.
7. **Generation failure copy is still generic.** When a page fails validation the user sees one broad "we couldn't perfectly generate this" message with no indication of which page failed or what to change.
8. **No sitemap, no canonical tags, no OG image.** `robots.txt` allows crawling but references no sitemap; no route sets `og:image`/`twitter:image`, so shared links render without a preview card.

### P2 — polish and consistency
9. Long pages (`ideas.tsx` at ~715 lines, the Workspace dashboard) mix layout, state and data logic in single files, making regressions likely as features grow.
10. Header actions ("Inspire Me", "Log in", "Start creating") appear only at `lg`/`xl`; on tablet the header loses its primary CTA while the burger menu carries everything.
11. No global 404-recovery links beyond "Go home", and no loading skeletons on Workspace/Library while cloud data hydrates.
12. Print output has not been verified against real A4 paper margins for every mechanic — the print CSS is in place but there is no automated print-layout check.

### P3 — nice to have
13. No analytics, no error reporting dashboard surface for the owner.
14. No commerce/entitlements (Stripe, paid packs) despite the old-site framing.
15. AI illustration/generation service is architected for but not connected.
16. No multi-language support (the UI is English-only while you communicate in Arabic).

## 3. Staged repair plan (no work starts until you approve a stage)

**Stage A — truthful core actions (P0)**
- Real PDF export: render the existing printable pages to a downloadable PDF file, keeping the current print path as fallback; keep the "paused until it matches your request" guard.
- Add Google sign-in to `/auth` and configure the provider in the same change.
- Decide the fate of the public library: either a public printable catalogue with stable URLs, or explicit copy clarifying that Library is the teacher's personal space.

**Stage B — account and confidence (P1)**
- Empty states with a primary action on Workspace, Library and Classes.
- Account panel: profile, email, sign-out everywhere, delete account with confirmation.
- Show cloud save status on mobile.
- Per-page generation failure messaging naming the page and the constraint that failed.

**Stage C — discoverability (P1/P2)**
- Sitemap, canonical tags, one shared OG image, and `og:image`/`twitter:image` on content routes.
- Tablet-width header CTA fix, loading skeletons, richer 404 links.

**Stage D — growth (P2/P3)**
- Component/file decomposition for the largest routes, print-layout regression coverage, analytics, then commerce or AI illustration if you want them.

Design language (white base, sage, cream, beige, muted terracotta), existing data, the custom domain configuration and all current worksheet URLs stay untouched throughout. No destructive database actions at any stage.

## 4. Technical notes

- Verified read-only: `src/routes/*`, `src/components/SiteHeader.tsx`, `src/routes/library.tsx`, `supabase/migrations/*.sql`, `public/robots.txt`, and the build log.
- Database: three tables, all with RLS enabled and owner-scoped `FOR ALL` policies plus explicit `authenticated`/`service_role` grants — no missing-grant issue found.
- No open build errors and no captured runtime/console errors at audit time; the P0 items are product gaps, not crashes.
- Items I could not verify without running interactive flows: real print output on physical A4, and cloud sync behaviour under an authenticated session. Both can be checked in Stage A if you want evidence first.
