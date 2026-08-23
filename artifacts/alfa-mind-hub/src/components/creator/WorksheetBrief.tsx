import { summaryFields, type WorksheetSpec } from "@/lib/creator-options";
import { paletteSwatches } from "@/lib/creator-visuals";

export function briefTitle(spec: WorksheetSpec) {
  const pages = spec.pages.trim() || "1";
  const pageLabel = pages === "1" ? "1-page" : `${pages}-page`;
  // An empty prompt is the short handoff between two Quick Create requests,
  // not a generic "Worksheet" request. Avoid briefly presenting a fallback
  // type while the teacher is replacing a previous named activity.
  const activityType = spec.prompt.trim() ? spec.activityType.trim() : "";
  return [pageLabel, spec.approach, activityType, "Activity"].filter(Boolean).join(" ");
}

export function briefChips(spec: WorksheetSpec) {
  const duration = spec.duration.replace(" minutes", " min");
  return [spec.level, spec.theme, spec.difficulty, duration, spec.paper].filter(Boolean);
}

type Props = {
  spec: WorksheetSpec;
  loading: boolean;
  onGenerate: () => void;
};

export function WorksheetBrief({ spec, loading, onGenerate }: Props) {
  const swatches = paletteSwatches[spec.palette];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Your Worksheet
        </p>
        <h2 className="mt-1.5 font-display text-xl leading-snug text-foreground">
          {briefTitle(spec)}
        </h2>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {briefChips(spec).map((chip, i) => (
            <span
              key={`${chip}-${i}`}
              className="rounded-full bg-cream px-2.5 py-1 text-xs text-secondary-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {spec.prompt.trim() ? (
        <p className="rounded-xl border border-border/70 bg-background p-3 text-[13px] leading-relaxed text-muted-foreground">
          “{spec.prompt.trim()}”
        </p>
      ) : null}

      <button
        type="button"
        onClick={onGenerate}
        disabled={loading}
        className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Creating your worksheet…" : "Generate My Worksheet"}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Builds a print-ready worksheet you can edit, save and download.
      </p>

      <details className="group border-t border-border pt-3">
        <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          <span className="group-open:hidden">Show full configuration</span>
          <span className="hidden group-open:inline">Hide full configuration</span>
        </summary>
        <dl className="mt-3 space-y-2">
          {summaryFields.map((f) => (
            <div key={f.key} className="flex items-baseline justify-between gap-4 text-[13px]">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="flex max-w-[62%] items-center gap-2 text-right font-medium text-foreground">
                {f.key === "palette" && swatches ? (
                  <span className="flex overflow-hidden rounded-full border border-border/70">
                    {swatches.map((c) => (
                      <span key={c} className="size-2.5" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                ) : null}
                {spec[f.key] || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
