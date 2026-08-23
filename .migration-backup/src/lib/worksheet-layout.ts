/**
 * PRE-RENDER LAYOUT VALIDATION
 * ----------------------------
 * Worksheets are printed, not scrolled: nothing may overlap, be clipped, or
 * escape the printable safe area. This module measures every generated page
 * geometrically (in millimetres, exactly like the renderer) BEFORE the page is
 * drawn, reports bounding-box collisions / overflow, and reflows the page by
 * shrinking illustration + card sizes until the content fits.
 *
 * It never changes what is taught: the planner, mechanics and skill fidelity
 * layers are untouched. Only presentation geometry is adjusted.
 */

import { resolveAgeTokens, type AgeDesignTokens } from "./age-tokens";
import { paperSizes, type WorksheetPageModel } from "./worksheet-model";

export const PAGE_MARGIN_MM = 12;
export const PAGE_FOOTER_MM = 8;
/** 1mm ≈ 3.7795px at 96dpi — the renderer uses the same conversion */
const MM_PER_PX = 1 / 3.7795;

export type LayoutBox = { id: string; xMm: number; yMm: number; wMm: number; hMm: number };

export type LayoutIssueCode = "layout-collision" | "layout-overflow" | "layout-outside-safe-area";

export type LayoutIssue = { code: LayoutIssueCode; message: string };

export function headerHeightMm(t: AgeDesignTokens) {
  return 8 + 2.4 + t.titleMm * 1.2 + t.instructionMm * 1.5;
}

export function paperOf(paper: string) {
  return paperSizes[paper as keyof typeof paperSizes] ?? paperSizes.A4;
}

export function bodyHeightMm(paper: string, t: AgeDesignTokens) {
  return paperOf(paper).h - 2 * PAGE_MARGIN_MM - headerHeightMm(t) - PAGE_FOOTER_MM - t.blockGapMm;
}

export function printableWidthMm(paper: string) {
  return paperOf(paper).w - 2 * PAGE_MARGIN_MM;
}

/** Presentation-only shrink applied by the reflow pass. */
export function scaleTokens(t: AgeDesignTokens, scale: number): AgeDesignTokens {
  if (scale === 1) return t;
  return {
    ...t,
    objectSize: t.objectSize * scale,
    objectGapMm: t.objectGapMm * scale,
    numberCardMm: t.numberCardMm * scale,
    choiceCardMm: t.choiceCardMm * scale,
  };
}

/** rough but stable text width for a short uppercase display label */
export function labelWidthMm(label: string, fontMm: number) {
  return label.length * fontMm * 0.68 + 4;
}

type Block = { id: string; wMm: number; hMm: number };

/**
 * Artwork cluster geometry. `maxWidthMm` mirrors the renderer's wrapping: a
 * cluster never draws wider than the space it was given, it wraps onto more
 * lines instead (which is what can then collide vertically).
 */
function objectBlock(count: number, t: AgeDesignTokens, maxWidthMm: number) {
  const objectMm = t.objectSize * MM_PER_PX;
  const fitPerLine = Math.max(
    1,
    Math.floor((maxWidthMm + t.objectGapMm) / (objectMm + t.objectGapMm)),
  );
  const perLine = Math.max(1, Math.min(count, t.maxObjectsPerLine, fitPerLine));
  const lines = Math.max(1, Math.ceil(count / perLine));
  return {
    wMm: perLine * objectMm + (perLine - 1) * t.objectGapMm,
    hMm: lines * objectMm + (lines - 1) * t.objectGapMm * 0.75,
  };
}

/** MORE / FEWER prompt column — must match the renderer exactly. */
export function promptLabelColumnMm(label: string, t: AgeDesignTokens) {
  if (!label) return 0;
  const fontMm = Math.max(4, Math.min(t.numberCardMm * 0.36, 26 / (label.length * 0.68)));
  return Math.min(32, labelWidthMm(label, fontMm) + 4);
}

/**
 * Required (not allocated) size of every activity block on the page.
 * Kinds whose renderer is fully fluid return no blocks: they cannot collide.
 */
function blocksForPage(page: WorksheetPageModel, t: AgeDesignTokens, widthMm: number): Block[] {
  const a = page.activity;
  switch (a.kind) {
    case "count-match": {
      const bank = t.numberCardMm + 14 + 24; // answer bank + drawing corridor
      return a.groups.map((group) => {
        const o = objectBlock(group.renderedObjects.length, t, Math.max(20, widthMm - bank));
        return { id: group.id, wMm: o.wMm + bank, hMm: Math.max(o.hMm, t.numberCardMm) + 4 };
      });
    }
    case "count-circle": {
      const choices = t.choiceCardMm * 3 + 18;
      return a.rows.map((row) => {
        const o = objectBlock(row.renderedObjects.length, t, Math.max(20, widthMm - choices - 6));
        return { id: row.id, wMm: o.wMm + 6 + choices, hMm: Math.max(o.hMm, t.choiceCardMm) + 4 };
      });
    }
    case "pick-one": {
      return a.rows.map((row) => {
        const promptMm = promptLabelColumnMm(row.promptLabel ?? "", t);
        const optionCount = Math.max(1, row.options.length);
        const promptObjectsMm = row.promptObjects?.length ? 40 : 0;
        const perOption = Math.max(
          14,
          (widthMm - 20 - promptMm - promptObjectsMm) / optionCount - 14,
        );
        const options = row.options.map((option) =>
          objectBlock(option.renderedObjects.length, t, perOption),
        );
        const optionsMm = options.reduce((sum, o) => sum + o.wMm + 14, 0);
        return {
          id: row.id,
          wMm: promptMm + promptObjectsMm + optionsMm + 10,
          hMm: Math.max(...options.map((o) => o.hMm), 12) + 6,
        };
      });
    }
    case "order-sequence": {
      return a.rows.map((row) => {
        const perItem = Math.max(14, (widthMm - 10) / Math.max(1, row.items.length) - 14);
        const items = row.items.map((item) => objectBlock(item.renderedObjects.length, t, perItem));
        return {
          id: row.id,
          wMm: items.reduce((sum, o) => sum + o.wMm + 14, 0) + 10,
          hMm: Math.max(...items.map((o) => o.hMm), 12) + 10,
        };
      });
    }
    default:
      return [];
  }
}

/**
 * Places every block inside the page's evenly divided activity slots and
 * returns real bounding boxes: header, instruction band, and one box per
 * activity block sized at what it actually needs.
 */
export function measurePageLayout(
  page: WorksheetPageModel,
  options: { level: string; paper?: string; objectScale?: number },
): LayoutBox[] {
  const paper = options.paper ?? "A4";
  const t = scaleTokens(resolveAgeTokens(options.level), options.objectScale ?? 1);
  const width = printableWidthMm(paper);
  const header = headerHeightMm(t);
  const body = bodyHeightMm(paper, t);
  const blocks = blocksForPage(page, t, width);

  const boxes: LayoutBox[] = [
    { id: "page-header", xMm: PAGE_MARGIN_MM, yMm: PAGE_MARGIN_MM, wMm: width, hMm: header },
  ];
  if (!blocks.length) return boxes;

  const gap = t.blockGapMm;
  const slot = (body - (blocks.length - 1) * gap) / blocks.length;
  const top = PAGE_MARGIN_MM + header + gap;
  blocks.forEach((block, index) => {
    boxes.push({
      id: block.id,
      xMm: PAGE_MARGIN_MM,
      yMm: top + index * (slot + gap),
      wMm: block.wMm,
      hMm: block.hMm,
    });
  });
  return boxes;
}

function overlaps(a: LayoutBox, b: LayoutBox) {
  return (
    a.xMm < b.xMm + b.wMm && b.xMm < a.xMm + a.wMm && a.yMm < b.yMm + b.hMm && b.yMm < a.yMm + a.hMm
  );
}

/** Collisions, clipping and safe-area escapes for a measured page. */
export function layoutIssuesForBoxes(boxes: LayoutBox[], paper = "A4"): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const size = paperOf(paper);
  const right = size.w - PAGE_MARGIN_MM;
  const bottom = size.h - PAGE_MARGIN_MM - PAGE_FOOTER_MM;

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]!;
    if (box.xMm + box.wMm > right + 0.5 || box.xMm < PAGE_MARGIN_MM - 0.5) {
      issues.push({
        code: "layout-overflow",
        message: `Block ${box.id} is ${Math.round(box.xMm + box.wMm - right)}mm wider than the printable width and would be clipped.`,
      });
    }
    if (box.yMm + box.hMm > bottom + 0.5) {
      issues.push({
        code: "layout-outside-safe-area",
        message: `Block ${box.id} ends ${Math.round(box.yMm + box.hMm - bottom)}mm below the printable safe area.`,
      });
    }
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(box, boxes[j]!)) {
        issues.push({
          code: "layout-collision",
          message: `Block ${box.id} overlaps block ${boxes[j]!.id}; text or artwork would be printed on top of another element.`,
        });
      }
    }
  }
  return issues;
}

export function layoutIssuesForPage(
  page: WorksheetPageModel,
  options: { level: string; paper?: string },
): LayoutIssue[] {
  return layoutIssuesForBoxes(
    measurePageLayout(page, { ...options, objectScale: page.layoutFit?.objectScale ?? 1 }),
    options.paper ?? "A4",
  );
}

/**
 * DENSITY — a page is scaled UP first, so a sparse pack does not print with
 * large empty bands, then down until it fits with no collisions. Preschool
 * whitespace is preserved by the safe area, which every step is measured
 * against.
 */
const GROW_STEPS = [1.25, 1.18, 1.12, 1.06];

const FIT_STEPS = [1, 0.94, 0.88, 0.82, 0.76, 0.7, 0.64, 0.58, 0.52, 0.46, 0.42, 0.38, 0.34, 0.3];

/**
 * Reflow pass: shrink illustration and card geometry (never the pedagogy)
 * until the page fits with no collisions. Returns the page with the chosen
 * presentation scale stamped on it, which the renderer applies.
 */
export function fitPageLayout(
  page: WorksheetPageModel,
  options: { level: string; paper?: string },
): WorksheetPageModel {
  for (const objectScale of [...GROW_STEPS, ...FIT_STEPS]) {
    const boxes = measurePageLayout(page, { ...options, objectScale });
    if (layoutIssuesForBoxes(boxes, options.paper ?? "A4").length === 0) {
      return objectScale === 1
        ? { ...page, layoutFit: undefined }
        : { ...page, layoutFit: { objectScale } };
    }
  }
  return { ...page, layoutFit: { objectScale: FIT_STEPS[FIT_STEPS.length - 1]! } };
}
