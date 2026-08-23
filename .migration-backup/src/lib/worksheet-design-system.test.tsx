/**
 * ALFA MIND HUB WORKSHEET DESIGN SYSTEM — visual regression.
 *
 * These tests render real generated packs (1, 2, 5, 10 and 20 pages) across
 * counting, phonics, tracing, matching and comparison activities and assert
 * that every printed page shares the same design language: one hierarchy, one
 * card style, one illustration scale, brand footer, and no collisions in any
 * of the four print modes.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultSpec, type WorksheetSpec } from "./creator-options";
import { buildValidWorksheetProject } from "./worksheet-service";
import { layoutIssuesForPage } from "./worksheet-layout";
import { PrintablePage } from "@/components/studio/PrintablePage";
import type { RenderMode, WorksheetProject } from "./worksheet-model";

const PRINT_MODES: RenderMode[] = ["premium", "soft", "ink", "bw"];

function spec(extra: Partial<WorksheetSpec>): WorksheetSpec {
  return { ...defaultSpec, ...extra };
}

const families: Array<{ name: string; spec: WorksheetSpec }> = [
  {
    name: "counting",
    spec: spec({
      theme: "Insects",
      activityType: "Counting",
      level: "Ages 4–5",
      pages: "2",
      prompt: "Count the butterflies in each group from 1 to 10.",
    }),
  },
  {
    name: "matching",
    spec: spec({
      theme: "Animals",
      activityType: "Matching",
      level: "Ages 4–5",
      pages: "2",
      prompt: "Count the animals and match each group to the right number.",
    }),
  },
  {
    name: "phonics",
    spec: spec({
      level: "Ages 4–5",
      pages: "2",
      prompt:
        "Create a beginning phonics activity teaching the letter B and the /b/ sound. Children circle pictures whose names begin with /b/. This is a phonics activity, not counting.",
    }),
  },
  {
    name: "tracing",
    spec: spec({
      level: "Ages 4–5",
      pages: "2",
      prompt: "Children trace the letter B, uppercase B and lowercase b.",
    }),
  },
  {
    name: "comparison",
    spec: spec({
      theme: "Insects",
      level: "Ages 4–5",
      pages: "2",
      prompt: "Which group has more? Compare two groups and circle the one with more.",
    }),
  },
];

function renderPack(project: WorksheetProject, mode: RenderMode) {
  return project.pages.map((page, index) =>
    renderToStaticMarkup(<PrintablePage project={project} page={page} index={index} mode={mode} />),
  );
}

function styleOf(markup: string, marker: string) {
  const at = markup.indexOf(marker);
  if (at < 0) return "";
  const style = markup.indexOf('style="', at);
  return markup.slice(style + 7, markup.indexOf('"', style + 7));
}

function numbers(markup: string, pattern: RegExp) {
  return [...markup.matchAll(pattern)].map((match) => Number(match[1]));
}

describe("Alfa Mind Hub worksheet design system", () => {
  it.each(families)("$name pages follow the shared hierarchy and identity", ({ spec: s }) => {
    const project = buildValidWorksheetProject(s, 5);
    for (const [index, markup] of renderPack(project, "premium").entries()) {
      expect(markup).not.toContain("data-worksheet-runtime-error");

      // 1 — hierarchy: quiet category label, title, discreet age/time
      expect(markup).toContain("data-page-eyebrow");
      expect(markup).toContain("data-page-meta");
      expect(markup).toContain("<h1");
      const eyebrow = Number(
        styleOf(markup, "data-page-eyebrow").match(/font-size:([\d.]+)mm/)?.[1],
      );
      const meta = Number(styleOf(markup, "data-page-meta").match(/font-size:([\d.]+)mm/)?.[1]);
      const title = Number(markup.match(/<h1[^>]*font-size:([\d.]+)mm/)?.[1]);
      expect(title).toBeGreaterThan(eyebrow * 2);
      expect(meta).toBeLessThanOrEqual(eyebrow);

      // 8 — understated identity: brand left, page number right
      expect(markup).toContain("data-worksheet-footer");
      const footer = markup.slice(markup.indexOf("data-worksheet-footer"));
      expect(footer.indexOf("Alfa Mind Hub")).toBeLessThan(footer.indexOf(`Page ${index + 1}`));
      const brandSize = Number(
        styleOf(markup, "data-worksheet-footer").match(/font-size:([\d.]+)mm/)?.[1],
      );
      expect(brandSize).toBeLessThan(title);

      // 3 — one card language: light hairlines, soft consistent corners
      const widths = numbers(markup, /border:([\d.]+)mm (?:solid|dashed)/g);
      for (const width of widths) expect(width).toBeLessThanOrEqual(0.6);
      const radii = new Set(numbers(markup, /border-radius:([\d.]+)mm/g));
      expect(radii.size).toBeLessThanOrEqual(4);
    }
  });

  it.each(families)("$name artwork keeps one consistent scale per page", ({ spec: s }) => {
    const project = buildValidWorksheetProject(s, 7);
    for (const [index, page] of project.pages.entries()) {
      if ("mechanic" in page.activity && page.activity.mechanic === "compare-size") continue;
      const markup = renderToStaticMarkup(
        <PrintablePage project={project} page={page} index={index} mode="premium" />,
      );
      const sizes = [
        ...markup.matchAll(/data-rendered-object-id="[^"]*"[\s\S]{0,240}?width="([\d.]+)"/g),
      ]
        .map((match) => Number(match[1]))
        .filter((value) => Number.isFinite(value));
      if (sizes.length < 2) continue;
      const min = Math.min(...sizes);
      const max = Math.max(...sizes);
      expect(max - min, `${page.title}: ${min} → ${max}`).toBeLessThanOrEqual(min * 0.07);
    }
  });

  it.each(["1", "2", "5", "10", "20"])("a %s-page pack is one coherent family", (pages) => {
    const project = buildValidWorksheetProject(
      spec({ theme: "Insects", level: "Ages 4–5", pages, activityType: "Counting" }),
      3,
    );
    expect(project.pages).toHaveLength(Number(pages));

    const eyebrowStyles = new Set<string>();
    const footerStyles = new Set<string>();
    for (const [index, markup] of renderPack(project, "premium").entries()) {
      expect(markup).not.toContain("data-worksheet-runtime-error");
      eyebrowStyles.add(styleOf(markup, "data-page-eyebrow"));
      footerStyles.add(styleOf(markup, "data-worksheet-footer"));
      expect(markup).toContain(`Page ${index + 1}`);
      // 2, 6, 7 — balanced composition with zero collisions or clipping
      expect(
        layoutIssuesForPage(project.pages[index]!, {
          level: project.meta.level,
          paper: project.meta.paper,
        }),
      ).toEqual([]);
    }
    expect(eyebrowStyles.size).toBe(1);
    expect(footerStyles.size).toBe(1);
  });

  it("renders every activity family in all four print modes", () => {
    for (const family of families) {
      const project = buildValidWorksheetProject(family.spec, 11);
      for (const mode of PRINT_MODES) {
        for (const markup of renderPack(project, mode)) {
          expect(markup, `${family.name} · ${mode}`).not.toContain("data-worksheet-runtime-error");
          expect(markup).toContain("Alfa Mind Hub");
          // 9 — answers never depend on colour alone: choices stay outlined
          expect(markup).toMatch(/border:[\d.]+mm (solid|dashed)/);
        }
      }
    }
  }, 30_000);

  it("never prints oversized decorative text behind comparison cards", () => {
    const project = buildValidWorksheetProject(families[4]!.spec, 13);
    for (const [index, page] of project.pages.entries()) {
      const markup = renderToStaticMarkup(
        <PrintablePage project={project} page={page} index={index} mode="premium" />,
      );
      if (!markup.includes("data-pick-prompt-label")) continue;
      const label = markup.slice(markup.indexOf("data-pick-prompt-label"));
      expect(label).not.toContain("position:absolute");
      const font = Number(label.match(/font-size:([\d.]+)mm/)?.[1]);
      const titleMm = Number(markup.match(/<h1[^>]*font-size:([\d.]+)mm/)?.[1]);
      expect(font).toBeLessThan(titleMm);
    }
  });
});
