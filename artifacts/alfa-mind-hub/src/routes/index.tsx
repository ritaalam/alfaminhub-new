import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { WorksheetCreator } from "@/components/creator/WorksheetCreator";

type CreateSearch = {
  draft?: string;
  idea?: string;
  classId?: string;
  preset?: string;
  print?: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): CreateSearch => ({
    ...(typeof search["draft"] === "string" ? { draft: search["draft"] } : {}),
    ...(typeof search["idea"] === "string" ? { idea: search["idea"] } : {}),
    ...(typeof search["classId"] === "string" ? { classId: search["classId"] } : {}),
    ...(typeof search["preset"] === "string" ? { preset: search["preset"] } : {}),
    ...(typeof search["print"] === "string" ? { print: search["print"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Alfa Mind Hub — Create Printable Learning Activities" },
      {
        name: "description",
        content:
          "Create exactly what your students need: beautiful, age-appropriate printable activities built in minutes.",
      },
      { property: "og:title", content: "Alfa Mind Hub — Worksheet Creator" },
      {
        property: "og:description",
        content:
          "Build beautiful, age-appropriate printable activities in minutes with Quick or Advanced Create.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { draft, idea, classId, preset, print } = Route.useSearch();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main id="main-content" className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
        <section className="pt-8 pb-6 sm:pt-10">
          <span className="inline-flex rounded-full bg-sage-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary-foreground">
            Worksheet creator
          </span>
          <h1 className="mt-3 max-w-3xl font-display text-3xl leading-[1.15] text-foreground sm:text-4xl">
            Create exactly what your students need.
          </h1>
          <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Build beautiful, age-appropriate printable activities in minutes.
          </p>
        </section>

        <WorksheetCreator
          draftId={draft ?? null}
          ideaId={idea ?? null}
          classId={classId ?? null}
          presetId={preset ?? null}
          autoPrint={print === "1"}
        />
      </main>
    </div>
  );
}
