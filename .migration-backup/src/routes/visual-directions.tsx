import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AlfaCharacterArt } from "@/components/studio/AlfaCharacterArt";
import { alfaCharacterList } from "@/lib/alfa-characters";
import {
  applyPrintMode,
  printModes,
  resolveIllustrationStyle,
  visualDirections,
  type PrintModeId,
} from "@/lib/visual-directions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/visual-directions")({
  component: VisualDirectionsPage,
  head: () => ({
    meta: [
      { title: "Visual Directions — Alfa Mind Hub Illustration Presets" },
      {
        name: "description",
        content:
          "Ten original Alfa Mind Hub visual directions and the Alfa character library, each with structured visual DNA and four print modes.",
      },
      { property: "og:title", content: "Alfa Visual Directions" },
      {
        property: "og:description",
        content:
          "Original illustration presets for Alfa Mind Hub worksheets, with visual DNA and print-mode previews.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function VisualDirectionsPage() {
  const [mode, setMode] = useState<PrintModeId>("premium");

  return (
    <main id="main-content" className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.8} /> Back to Alfa Mind Hub
        </Link>

        <header className="mt-6 max-w-2xl">
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">
            Alfa visual directions
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Ten original art directions for Alfa worksheets. Each preset declares a full visual DNA
            — palette, line quality, shape language, proportions, expression, texture, lighting,
            environment, background, detail and print suitability — kept separate from the
            educational content, the illustration assets and the page layout.
          </p>
        </header>

        <div className="mt-6 inline-flex flex-wrap gap-1 rounded-full border border-border p-1">
          {printModes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              title={m.hint}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs transition-colors",
                mode === m.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visualDirections.map((d) => {
            const pal = applyPrintMode(d.palette, mode);
            const style = resolveIllustrationStyle({
              direction: d,
              purpose: "cover",
              ageId: "preschool-4-5",
            });
            return (
              <article key={d.id} className="surface-card overflow-hidden p-4">
                <div
                  className="flex items-end justify-center gap-1 rounded-xl px-3 pt-4"
                  style={{ background: pal.surface, border: `1px solid ${pal.rule}` }}
                >
                  {d.signatureCharacters.map((key) => (
                    <AlfaCharacterArt
                      key={key}
                      character={key as never}
                      palette={pal}
                      style={style}
                      size={78}
                    />
                  ))}
                </div>
                <h2 className="mt-3 font-display text-lg text-foreground">{d.name}</h2>
                <p className="text-xs text-muted-foreground">{d.tagline}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {d.description}
                </p>
                <dl className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                  <Row label="Line" value={d.dna.lineQuality.label} />
                  <Row label="Shapes" value={d.dna.shapeLanguage.label} />
                  <Row label="Proportions" value={d.dna.characterProportions.label} />
                  <Row label="Texture" value={d.dna.texture.label} />
                  <Row label="Lighting" value={d.dna.lighting.label} />
                  <Row
                    label="Expression"
                    value={`${Math.round(d.dna.expressionIntensity * 100)}%`}
                  />
                  <Row
                    label="Environment"
                    value={`${Math.round(d.dna.environmentalRichness * 100)}% · background ${Math.round(
                      d.dna.backgroundComplexity * 100,
                    )}%`}
                  />
                  <Row label="Detail" value={`${Math.round(d.dna.objectDetailLevel * 100)}%`} />
                  <Row
                    label="Print"
                    value={`grayscale ${Math.round(
                      d.dna.printSuitability.grayscaleSafety * 100,
                    )}% · ink ${Math.round(d.dna.printSuitability.inkLoad * 100)}%`}
                  />
                </dl>
              </article>
            );
          })}
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl text-foreground">Original Alfa characters</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A growing cast with a consistent visual identity — original to Alfa Mind Hub and
            deliberately unlike any existing character. Each one re-renders in whichever visual
            direction and print mode a worksheet uses.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alfaCharacterList.map((c) => {
              const d = visualDirections[2]!;
              const pal = applyPrintMode(d.palette, mode);
              const style = resolveIllustrationStyle({
                direction: d,
                purpose: "reward",
                ageId: "preschool-4-5",
              });
              return (
                <article key={c.key} className="surface-card flex gap-4 p-4">
                  <div
                    className="flex size-24 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: pal.surface, border: `1px solid ${pal.rule}` }}
                  >
                    <AlfaCharacterArt
                      character={c.key}
                      palette={pal}
                      style={style}
                      size={82}
                      title={`${c.name} the ${c.species}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg text-foreground">
                      {c.name} <span className="text-muted-foreground">· {c.species}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">{c.personality}</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {c.identity.silhouette}. {c.identity.signatureFeature}.
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 uppercase tracking-[0.1em]">{label}</dt>
      <dd className="min-w-0 text-foreground/80">{value}</dd>
    </div>
  );
}
