import type { WorksheetDocument } from "@/lib/worksheet-service";

export function WorksheetPreview({ doc }: { doc: WorksheetDocument }) {
  return (
    <section aria-labelledby="preview-heading" className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-cream px-5 py-4 sm:px-7">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-terracotta-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">
            Demo worksheet preview
          </span>
          <h2
            id="preview-heading"
            className="mt-3 font-display text-xl text-foreground sm:text-2xl"
          >
            {doc.title}
          </h2>
          <p className="text-sm text-muted-foreground">{doc.subtitle}</p>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          Sample structured content only — no AI generation service is connected yet.
        </p>
      </div>

      <div className="grid gap-8 px-5 py-7 sm:px-7 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {doc.pages.map((page) => (
            <article
              key={page.pageNumber}
              className="rounded-2xl border border-border bg-background p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-base text-foreground">{page.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {doc.spec.paper} · {doc.spec.printing}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{page.objective}</p>

              <div className="mt-4 space-y-4">
                {page.exercises.map((ex, i) => (
                  <div key={i} className="rounded-xl bg-muted/60 p-4">
                    <p className="text-sm font-medium text-foreground">{ex.instruction}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{ex.prompt}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ex.items.map((item, j) => (
                        <span
                          key={j}
                          className="flex min-w-14 items-center justify-center rounded-lg border border-dashed border-sage/60 bg-background px-3 py-2 font-display text-sm text-muted-foreground"
                        >
                          {ex.answerFormat === "count-boxes" ? `${item} ▢` : item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs italic text-muted-foreground">{page.illustrationNote}</p>
            </article>
          ))}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-sage-soft/60 p-5">
            <h3 className="font-display text-sm text-foreground">Overview</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{doc.overview}</p>
          </div>
          <div>
            <h3 className="font-display text-sm text-foreground">Materials</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {doc.materials.map((m) => (
                <li key={m}>· {m}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-sm text-foreground">Teacher notes</h3>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {doc.teacherNotes.map((n) => (
                <li key={n}>· {n}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
