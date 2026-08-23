import { resolveAgeTokens } from "@/lib/age-tokens";
import {
  paperSizes,
  resolvePalette,
  type RenderedCountObject,
  type RenderMode,
  type WorksheetPageModel,
  type WorksheetProject,
} from "@/lib/worksheet-model";
import { resolveVisualDirection } from "@/lib/visual-directions";
import { validateFinalizedPageData } from "@/lib/worksheet-service";
import { pageContractBreach } from "@/lib/worksheet-page-contract";
import { labelWidthMm, scaleTokens } from "@/lib/worksheet-layout";
import { AlfaCharacterArt } from "./AlfaCharacterArt";
import { ComposedRenderer } from "./ComposedRenderer";
import { WorksheetArt } from "./WorksheetArt";

type Props = {
  project: WorksheetProject;
  page: WorksheetPageModel;
  index: number;
  mode: RenderMode;
  /** screen scale factor; printing always renders at 1 */
  scale?: number;
  showAnswers?: boolean;
};

const MARGIN = 12; // mm safe print margin

export function PrintablePage({ project, page, index, mode, scale = 1, showAnswers }: Props) {
  // IMMUTABLE PAGE PLAN CONTRACT — an explicitly specified page may only be
  // drawn when the rendered mechanic equals the requested one.
  const contractBreach = pageContractBreach(project, page, index);
  if (contractBreach) {
    return (
      <div data-worksheet-contract-blocked role="alert">
        {contractBreach.message} This page was blocked and not rendered.
      </div>
    );
  }
  const runtimeErrors = validateFinalizedPageData(page);
  if (runtimeErrors.length > 0) {
    return (
      <div data-worksheet-runtime-error role="alert">
        Internal worksheet validation error. This page was not rendered.
      </div>
    );
  }
  const size = paperSizes[project.meta.paper];
  const p = resolvePalette(project.meta.palette, mode, project.visualDirection);
  const direction = resolveVisualDirection(project.visualDirection);
  const art = page.illustrationStyle ?? project.illustrationStyle;
  const t = scaleTokens(resolveAgeTokens(project.meta.level), page.layoutFit?.objectScale ?? 1);
  const answerFor = (id: string) => page.answerKey.find((a) => a.groupId === id)?.answer;

  /** keeps a group on as few lines as possible, shrinking art only when needed */
  /**
   * Vertical budget for the activity area, so groups always fit one printed
   * page instead of spilling past the footer.
   */
  // +2.4mm reserves room for the accent rule under the title so the activity
  // area still ends safely above the footer
  const headerMm = 8 + 2.4 + t.titleMm * 1.2 + t.instructionMm * 1.5;

  const footerMm = 8;
  const bodyMm = size.h - 2 * MARGIN - headerMm - footerMm - t.blockGapMm;
  const rowHeightMm = (rows: number) => Math.max(12, (bodyMm - (rows - 1) * t.blockGapMm) / rows);

  /**
   * ALFA MIND HUB WORKSHEET DESIGN SYSTEM — presentation only.
   * One card language for the whole product family: very light hairline
   * borders, soft corners, quiet surfaces. Never heavy boxes.
   */
  const RADIUS_MM = 4.5;
  const HAIRLINE = `0.3mm solid ${p.rule}`;
  const HAIRLINE_DASHED = `0.3mm dashed ${p.rule}`;
  const card = {
    border: HAIRLINE,
    borderRadius: `${RADIUS_MM}mm`,
    background: p.surface,
  } as const;
  const cardQuiet = { ...card, background: p.paper } as const;

  /**
   * ILLUSTRATION CONSISTENCY — every comparable object on a page is drawn at
   * the same size, so artwork never varies in scale by accident. The page is
   * composed twice: the first pass measures what each cluster could take, the
   * second pass redraws everything at the shared size. Pages where size itself
   * is the lesson opt out.
   */
  const sizeIsTaught = "mechanic" in page.activity && page.activity.mechanic === "compare-size";
  const measuredSizes: number[] = [];
  let sharedObjectSize: number | undefined;

  const objects = (
    renderedObjects: RenderedCountObject[],
    availableMm: number,
    availableWidthMm: number,
  ) => {
    // pick the line split that yields the biggest countable object
    const count = renderedObjects.length;
    let best = { size: 0, perLine: count, gap: t.objectGapMm };
    const maxLines = Math.min(3, count);
    for (let lines = 1; lines <= maxLines; lines++) {
      const perLine = Math.ceil(count / lines);
      if (perLine > t.maxObjectsPerLine) continue;
      const gap = lines > 1 ? t.objectGapMm * 0.75 : t.objectGapMm;
      const fitPx = ((availableMm - (lines - 1) * gap) / lines) * 3.7795;
      const widthPx = ((availableWidthMm - (perLine - 1) * gap) / perLine) * 3.7795;
      const size = Math.min(t.objectSize, fitPx, widthPx);
      if (size > best.size) best = { size, perLine, gap };
    }
    // Use the exact size selected by the fit solver. A separate minimum here
    // used to make the actual SVG wider than the calculated wrapping width,
    // allowing a final object to be painted beneath the next card.
    measuredSizes.push(Math.max(1, best.size));
    const objectSize = sizeIsTaught
      ? Math.max(1, best.size)
      : Math.max(1, Math.min(best.size, sharedObjectSize ?? best.size));
    const rowWidthMm = (objectSize / 3.7795) * best.perLine + best.gap * (best.perLine - 1);

    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: `${best.gap}mm`,
          width: `${rowWidthMm}mm`,
          maxWidth: "100%",
        }}
      >
        {renderedObjects.map((object) => (
          <span key={object.id} data-rendered-object-id={object.id} style={{ display: "flex" }}>
            <WorksheetArt object={object} palette={p} style={art} size={objectSize} />
          </span>
        ))}
      </div>
    );
  };

  /** drawing corridor between the group column and the number bank */
  const corridorMm = 24;
  /** the number bank is its own panel, wider than a single card */
  const bankColMm = t.numberCardMm + 14;
  /** usable width of the illustration column, after the answer bank + corridor */
  const groupColMm = size.w - 2 * MARGIN - bankColMm - corridorMm - 10;
  const choiceColMm = t.choiceCardMm * 3 + 18;
  const circleColMm = size.w - 2 * MARGIN - choiceColMm - 6 - 12;

  const groupRowMm =
    page.activity.kind === "count-match" ? rowHeightMm(page.activity.groups.length) - 5 : 0;
  const circleRowMm =
    page.activity.kind === "count-circle"
      ? rowHeightMm(page.activity.rows.length + (page.activity.challenge ? 0.4 : 0)) - 5
      : 0;

  const buildPage = () => (
    <div
      className="worksheet-page"
      style={{
        width: `${size.w}mm`,
        height: `${size.h}mm`,
        transform: scale === 1 ? undefined : `scale(${scale})`,
        transformOrigin: "top left",
        background: p.paper,
        color: p.ink,
        padding: `${MARGIN}mm`,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header — deliberately compact: the child's work owns the page.
          Hierarchy: quiet category label → title → accent rule → instruction,
          with age and time kept discreet on the far right. */}
      <header style={{ borderBottom: HAIRLINE, paddingBottom: "3.4mm" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "8mm",
          }}
        >
          <span
            data-page-eyebrow
            style={{
              fontSize: "2.4mm",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: p.inkSoft,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {page.activityType}
          </span>
          <span
            data-page-meta
            style={{
              fontSize: "2.1mm",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: p.inkSoft,
              opacity: 0.7,
              whiteSpace: "nowrap",
            }}
          >
            {project.meta.ageRange} · {project.meta.duration}
          </span>
        </div>
        {page.mascot && art?.allowDecoration ? (
          <div
            style={{
              position: "absolute",
              right: `${MARGIN}mm`,
              top: `${MARGIN + 4}mm`,
              opacity: 0.9,
            }}
          >
            <AlfaCharacterArt
              character={page.mascot}
              palette={p}
              style={art}
              size={t.titleMm * 3.7795 * 1.35}
            />
          </div>
        ) : null}
        <h1
          style={{
            margin: "2mm 0 0",
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: `${t.titleMm}mm`,
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
            color: p.ink,
            maxWidth: page.mascot && art?.allowDecoration ? "76%" : "100%",
          }}
        >
          {page.title}
        </h1>
        {/* short accent rule: gives the title clear hierarchy over the instruction */}
        <div
          style={{
            width: `${t.titleMm * 2.2}mm`,
            height: "0.7mm",
            marginTop: "1.6mm",
            borderRadius: "0.35mm",
            background: p.accent,
          }}
        />
        <p
          style={{
            margin: "1.8mm 0 0",
            fontSize: `${t.instructionMm}mm`,
            color: p.inkSoft,
            lineHeight: 1.35,
            maxWidth: "82%",
          }}
        >
          {page.instruction}
        </p>
      </header>

      {/* Body */}
      <main
        style={{
          flex: 1,
          paddingTop: `${t.blockGapMm}mm`,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {page.activity.kind === "composed" ? (
          // dynamically composed page: the specification had no matching
          // template, so it is printed from reusable components instead
          <ComposedRenderer
            activity={page.activity}
            palette={p}
            style={art}
            tokens={t}
            answerKey={page.answerKey}
            {...(showAnswers ? { showAnswers } : {})}
            widthMm={size.w - 2 * MARGIN}
          />
        ) : page.activity.kind === "count-match" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `minmax(0, 1fr) ${bankColMm}mm`,
              alignItems: "stretch",
              flex: 1,
              minHeight: 0,
              // generous drawing corridor between the two columns
              columnGap: `${corridorMm}mm`,
            }}
          >
            <div
              style={{
                display: "grid",
                gap: `${t.blockGapMm}mm`,
                height: `${bodyMm}mm`,
                gridTemplateRows: `repeat(${page.activity.groups.length}, minmax(0, 1fr))`,
              }}
            >
              {page.activity.groups.map((g) => (
                <div
                  key={g.id}
                  data-count-exercise-id={g.id}
                  data-correct-answer={g.correctAnswer}
                  style={{
                    border: HAIRLINE,
                    borderRadius: `${RADIUS_MM}mm`,
                    background: p.surface,
                    padding: "2mm 4mm",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    minHeight: 0,
                    overflow: "hidden",
                  }}
                >
                  {objects(g.renderedObjects, groupRowMm, groupColMm)}
                  <span
                    style={{
                      position: "absolute",
                      right: "-2.5mm",
                      top: "50%",
                      width: "2.8mm",
                      height: "2.8mm",
                      borderRadius: "50%",
                      background: p.accent,
                      transform: "translateY(-50%)",
                    }}
                  />
                  {showAnswers ? (
                    <span
                      style={{
                        position: "absolute",
                        left: "2mm",
                        top: "1mm",
                        fontSize: "3mm",
                        color: p.accent,
                      }}
                    >
                      {answerFor(g.id)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            {/* ANSWER BANK — a separate panel, never row-aligned with the
                groups: the cards are shuffled and offset so no number appears
                to belong to the group beside it before the child draws a line. */}
            <div
              style={{
                height: `${bodyMm}mm`,
                border: HAIRLINE_DASHED,
                borderRadius: `${RADIUS_MM}mm`,
                background: p.paper,
                padding: `${t.blockGapMm}mm 2mm`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                // deliberately NOT the same rhythm as the group rows
                justifyContent: "space-between",
                boxSizing: "border-box",
                minHeight: 0,
              }}
            >
              {page.activity.numberChoices.map((n, i) => (
                <div
                  key={`${n}-${i}`}
                  style={{
                    border: `0.6mm solid ${p.rule}`,
                    borderRadius: "50%",
                    height: `${t.numberCardMm}mm`,
                    width: `${t.numberCardMm}mm`,
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-display)",
                    fontSize: `${t.numberCardMm * 0.55}mm`,
                    color: p.ink,
                    background: p.surface,
                    position: "relative",
                  }}
                >
                  {n}
                  <span
                    style={{
                      position: "absolute",
                      left: "-2.5mm",
                      top: "50%",
                      width: "2.8mm",
                      height: "2.8mm",
                      borderRadius: "50%",
                      background: p.accent,
                      transform: "translateY(-50%)",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : page.activity.kind === "count-circle" ? (
          <div
            style={{
              display: "grid",
              gap: `${t.blockGapMm}mm`,
              gridTemplateRows: `repeat(${page.activity.rows.length}, minmax(0, 1fr))${page.activity.challenge ? " auto" : ""}`,
              height: `${bodyMm}mm`,
            }}
          >
            {page.activity.rows.map((row) => (
              <div
                key={row.id}
                data-count-exercise-id={row.id}
                data-correct-answer={row.correctAnswer}
                style={{
                  display: "grid",
                  gridTemplateColumns: `minmax(0, 1fr) ${choiceColMm}mm`,
                  alignItems: "center",
                  gap: "6mm",
                  border: HAIRLINE,
                  borderRadius: `${RADIUS_MM}mm`,
                  background: p.surface,
                  padding: "2mm 5mm",
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                {objects(row.renderedObjects, circleRowMm, circleColMm)}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "6mm",
                  }}
                >
                  {page.activity.kind === "count-circle" &&
                  page.activity.responseMode === "draw" ? (
                    // COUNT & DRAW: the child produces the answer, so the row
                    // ends in an empty box instead of printed number cards.
                    <div
                      data-draw-answer-box={row.id}
                      style={{
                        width: `${choiceColMm - 4}mm`,
                        height: `${Math.max(16, t.choiceCardMm * 1.6)}mm`,
                        flex: "0 0 auto",
                        borderRadius: `${RADIUS_MM}mm`,
                        background: p.paper,
                        border: `0.6mm dashed ${p.rule}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontSize: `${t.choiceCardMm * 0.5}mm`,
                        color: showAnswers ? p.accent : "transparent",
                      }}
                    >
                      {showAnswers ? answerFor(row.id) : ""}
                    </div>
                  ) : null}
                  {row.choices.map((c) => (
                    <span
                      key={c}
                      style={{
                        width: `${t.choiceCardMm}mm`,
                        height: `${t.choiceCardMm}mm`,
                        flex: "0 0 auto",
                        borderRadius: "50%",
                        background: p.paper,
                        border:
                          showAnswers && c === answerFor(row.id)
                            ? `1mm solid ${p.accent}`
                            : `0.5mm solid ${p.rule}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontSize: `${t.choiceCardMm * 0.55}mm`,
                        color: p.ink,
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {page.activity.challenge ? (
              <div
                style={{
                  background: p.accentSoft,
                  border: `0.3mm solid ${p.rule}`,
                  borderRadius: "3mm",
                  padding: "3mm 5mm",
                  fontSize: "3.6mm",
                  color: p.ink,
                }}
              >
                <strong style={{ fontWeight: 600 }}>Little challenge · </strong>
                {page.activity.challenge}
              </div>
            ) : null}
          </div>
        ) : page.activity.kind === "pick-one" ? (
          /* OBJECTIVE MECHANICS — compare, size, same/different, sounds,
             patterns. The child circles one option per row. */
          <div
            style={{
              display: "grid",
              gap: `${t.blockGapMm}mm`,
              gridTemplateRows: `repeat(${page.activity.rows.length}, minmax(0, 1fr))`,
              height: `${bodyMm}mm`,
            }}
          >
            {page.activity.rows.map((row, rowIndex) => {
              const rowMm =
                rowHeightMm(page.activity.kind === "pick-one" ? page.activity.rows.length : 1) - 6;
              // The MORE / FEWER prompt is a real column, never oversized text
              // laid behind the cards: it is sized to its own content and can
              // never overlap the comparison options.
              const label = row.promptLabel ?? "";
              const labelFontMm = label
                ? Math.max(4, Math.min(t.numberCardMm * 0.36, 26 / (label.length * 0.68)))
                : 0;
              const labelColMm = label ? Math.min(32, labelWidthMm(label, labelFontMm) + 4) : 0;
              const promptObjectsMm = row.promptObjects?.length ? 40 : 0;
              const optionWidthMm =
                (size.w - 2 * MARGIN - 20 - labelColMm - promptObjectsMm) /
                Math.max(1, row.options.length);
              return (
                <div
                  key={row.id}
                  data-pick-row-id={row.id}
                  data-correct-option-id={row.answerOptionId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6mm",
                    border: HAIRLINE,
                    borderRadius: `${RADIUS_MM}mm`,
                    background: p.surface,
                    padding: "2mm 5mm",
                    minHeight: 0,
                    overflow: "hidden",
                  }}
                >
                  {label ? (
                    <span
                      data-pick-prompt-label
                      style={{
                        flex: "0 0 auto",
                        fontFamily: "var(--font-display)",
                        fontSize: `${labelFontMm}mm`,
                        letterSpacing: "0.3mm",
                        lineHeight: 1.1,
                        color: p.ink,
                        width: `${labelColMm}mm`,
                        paddingRight: "3mm",
                        borderRight: `0.4mm dashed ${p.rule}`,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                    >
                      {label}
                    </span>
                  ) : null}
                  {row.promptObjects?.length ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3mm",
                        paddingRight: "4mm",
                        borderRight: `0.4mm dashed ${p.rule}`,
                      }}
                    >
                      {objects(row.promptObjects, rowMm, 40)}
                      {row.promptGap ? (
                        <span
                          style={{
                            width: `${t.choiceCardMm}mm`,
                            height: `${t.choiceCardMm}mm`,
                            border: `0.6mm dashed ${p.rule}`,
                            borderRadius: "3mm",
                            display: "inline-block",
                          }}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "space-around",
                      alignItems: "center",
                      gap: "6mm",
                    }}
                  >
                    {row.options.map((option) => (
                      <div
                        key={option.id}
                        data-pick-option-id={option.id}
                        style={{
                          border:
                            showAnswers && option.id === row.answerOptionId
                              ? `1mm solid ${p.accent}`
                              : `0.5mm solid ${p.rule}`,
                          borderRadius: `${RADIUS_MM}mm`,
                          background: p.paper,
                          padding: "2mm",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: `${Math.max(18, optionWidthMm * 0.7)}mm`,
                          transform:
                            option.scale && option.scale !== 1
                              ? `scale(${option.scale})`
                              : undefined,
                        }}
                      >
                        {objects(option.renderedObjects, rowMm, optionWidthMm)}
                      </div>
                    ))}
                  </div>
                  {rowIndex < 0 ? null : null}
                </div>
              );
            })}
          </div>
        ) : page.activity.kind === "cut-create" ? (
          /* CUT & CREATE — a large build area, then well-spaced cut-out pieces */
          (() => {
            const activity = page.activity;
            const pieces = activity.pieces;
            const columns = pieces.length <= 4 ? 2 : pieces.length <= 6 ? 3 : 4;
            const rows = Math.ceil(pieces.length / columns);
            const targets = activity.targets ?? [];
            const targetsMm = targets.length ? 22 : 0;
            const cardMm = rows > 2 ? 30 : 36;
            const stripMm = rows * cardMm + (rows - 1) * 4;
            const baseMm = Math.max(60, bodyMm - stripMm - targetsMm - t.blockGapMm * 3 - 12);
            // WorksheetArt takes pixels; 1mm ≈ 3.78px at 96dpi
            const pieceMm = Math.min(t.objectSize, Math.round((cardMm - 13) * 3.78));
            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: `${t.blockGapMm}mm`,
                  height: `${bodyMm}mm`,
                }}
              >
                {targets.length ? (
                  <div style={{ display: "flex", justifyContent: "center", gap: "10mm" }}>
                    {targets.map((target) => (
                      <div
                        key={target.id}
                        data-cut-target-id={target.id}
                        data-correct-answer={target.quantity}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "3mm",
                          padding: "2.5mm 5mm",
                          borderRadius: `${RADIUS_MM}mm`,
                          border: `0.5mm solid ${p.rule}`,
                          background: p.surface,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "9mm",
                            lineHeight: 1,
                            color: showAnswers ? p.accent : p.ink,
                          }}
                        >
                          {target.quantity}
                        </span>
                        <span style={{ fontSize: "4mm", color: p.ink }}>{target.label}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* build area */}
                <div
                  data-cut-base={activity.base.shape}
                  style={{
                    position: "relative",
                    height: `${baseMm}mm`,
                    border: `0.9mm solid ${p.rule}`,
                    borderRadius: activity.base.shape === "plate" ? "50%" : "8mm",
                    background: p.surface,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  {activity.base.shape === "aquarium" ? (
                    <>
                      {/* water line */}
                      <span
                        style={{
                          position: "absolute",
                          left: "4mm",
                          right: "4mm",
                          top: "9mm",
                          borderTop: `0.4mm dashed ${p.rule}`,
                        }}
                      />
                      {/* sand bed */}
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: "13mm",
                          background: p.accentSoft,
                          borderTop: `0.4mm solid ${p.rule}`,
                          borderRadius: "0 0 7mm 7mm",
                        }}
                      />
                      {/* seaweed */}
                      {[10, 18, 82, 90].map((left, i) => (
                        <span
                          key={left}
                          style={{
                            position: "absolute",
                            left: `${left}%`,
                            bottom: "11mm",
                            width: "1.2mm",
                            height: `${i % 2 === 0 ? 20 : 14}mm`,
                            borderRadius: "1mm",
                            background: p.rule,
                            opacity: 0.45,
                          }}
                        />
                      ))}
                    </>
                  ) : null}
                  {activity.base.shape === "plate" ? (
                    <span
                      style={{
                        position: "absolute",
                        inset: "6mm",
                        borderRadius: "50%",
                        border: HAIRLINE_DASHED,
                      }}
                    />
                  ) : null}
                </div>

                <span
                  style={{ fontSize: "3.6mm", color: p.ink, textAlign: "center", opacity: 0.85 }}
                >
                  {activity.base.caption}
                </span>

                {/* cut-out pieces — dashed cutting boundaries, generous spacing */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gap: "4mm",
                  }}
                >
                  {pieces.map((piece) => (
                    <div
                      key={piece.id}
                      data-cut-piece-id={piece.id}
                      data-cut-piece-asset={piece.asset}
                      style={{
                        height: `${cardMm}mm`,
                        border: `0.5mm dashed ${p.rule}`,
                        borderRadius: "3mm",
                        background: p.paper,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "1.5mm",
                        padding: "2mm",
                        overflow: "hidden",
                      }}
                    >
                      <WorksheetArt
                        object={piece}
                        palette={p as never}
                        style={art}
                        size={pieceMm}
                      />
                      <span style={{ fontSize: "3.2mm", color: p.ink, textAlign: "center" }}>
                        {piece.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        ) : page.activity.kind === "find-count" ? (
          /* FIND & COUNT — one calm garden scene, then large number choices */
          (() => {
            const activity = page.activity;
            const sceneMm = bodyMm - t.numberCardMm - t.blockGapMm - 6;
            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: `${t.blockGapMm}mm`,
                  height: `${bodyMm}mm`,
                }}
              >
                <div
                  data-find-scene-id={activity.group.id}
                  data-correct-answer={activity.group.correctAnswer}
                  style={{
                    position: "relative",
                    height: `${sceneMm}mm`,
                    border: `0.5mm solid ${p.rule}`,
                    borderRadius: "5mm",
                    background: p.surface,
                    overflow: "hidden",
                  }}
                >
                  {activity.sceneObjects.map((object) => (
                    <div
                      key={object.id}
                      {...(object.decorative ? {} : { "data-rendered-object-id": object.id })}
                      style={{
                        position: "absolute",
                        left: `${object.xPct}%`,
                        top: `${object.yPct}%`,
                        transform: "translate(-50%, -50%)",
                        opacity: object.decorative ? 0.55 : 1,
                      }}
                    >
                      <WorksheetArt
                        object={object}
                        palette={p as never}
                        style={art}
                        size={object.decorative ? t.objectSize * 0.7 : t.objectSize}
                      />
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8mm",
                  }}
                >
                  {activity.choices.map((choice) => (
                    <span
                      key={choice}
                      data-choice-value={choice}
                      style={{
                        width: `${t.numberCardMm}mm`,
                        height: `${t.numberCardMm}mm`,
                        borderRadius: "50%",
                        border:
                          showAnswers && choice === activity.group.correctAnswer
                            ? `1mm solid ${p.accent}`
                            : `0.6mm solid ${p.rule}`,
                        background: p.paper,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontSize: `${t.numberCardMm * 0.5}mm`,
                        color: p.ink,
                      }}
                    >
                      {choice}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()
        ) : page.activity.kind === "sort-groups" ? (
          /* SORTING — one mixed strip and two clearly labelled sorting areas */
          (() => {
            const activity = page.activity;
            // EVERY sortable picture must be visible: the strip wraps into rows
            // and shrinks its artwork instead of clipping items away.
            const columns = Math.min(activity.items.length || 1, 4);
            const stripRows = Math.ceil((activity.items.length || 1) / columns);
            const itemSize = t.objectSize * (activity.items.length > 6 ? 0.72 : 1);
            const stripMm = Math.max(itemSize / 3.7795 + 8, bodyMm * 0.22) * stripRows;
            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: `${t.blockGapMm}mm`,
                  height: `${bodyMm}mm`,
                }}
              >
                <div
                  style={{
                    minHeight: `${stripMm}mm`,
                    display: "grid",
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    justifyItems: "center",
                    alignItems: "center",
                    gap: "3mm",
                    padding: "3mm 4mm",
                    border: `0.5mm solid ${p.rule}`,
                    borderRadius: `${RADIUS_MM}mm`,
                    background: p.surface,
                  }}
                >
                  {activity.items.map((item) => (
                    <div
                      key={item.id}
                      data-sort-item-id={item.id}
                      data-sort-item-asset={item.asset}
                    >
                      <WorksheetArt
                        object={item}
                        palette={p as never}
                        style={art}
                        size={itemSize}
                      />
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6mm",
                    minHeight: 0,
                  }}
                >
                  {activity.bins.map((bin) => (
                    <div
                      key={bin.id}
                      data-sort-bin-id={bin.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "2mm",
                        border: `0.7mm dashed ${p.rule}`,
                        borderRadius: "5mm",
                        background: p.paper,
                        padding: "3mm",
                        minHeight: 0,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
                        <WorksheetArt
                          object={{ id: `${bin.id}-icon`, asset: bin.asset }}
                          palette={p as never}
                          style={art}
                          size={t.objectSize * 0.6}
                        />
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "5mm",
                            color: p.ink,
                          }}
                        >
                          {bin.label}
                        </span>
                      </div>
                      {showAnswers ? (
                        <span style={{ fontSize: "3.4mm", color: p.accent }}>
                          {page.answerKey.find((entry) => entry.groupId === bin.id)?.answer ?? 0}{" "}
                          pictures
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        ) : page.activity.kind === "letter-search" ? (
          /* LETTER RECOGNITION — the child circles every target letter */
          (() => {
            const activity = page.activity;
            return (
              <div
                style={{
                  display: "grid",
                  gap: `${t.blockGapMm}mm`,
                  gridTemplateRows: `repeat(${activity.rows.length}, minmax(0, 1fr))`,
                  height: `${bodyMm}mm`,
                }}
              >
                {activity.rows.map((row) => (
                  <div
                    key={row.id}
                    data-letter-row-id={row.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-around",
                      gap: "4mm",
                      border: HAIRLINE,
                      borderRadius: `${RADIUS_MM}mm`,
                      background: p.surface,
                      padding: "2mm 5mm",
                      overflow: "hidden",
                    }}
                  >
                    {row.glyphs.map((glyph) => (
                      <span
                        key={glyph.id}
                        data-letter-glyph-id={glyph.id}
                        data-letter-target={glyph.isTarget ? "1" : "0"}
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: `${Math.min(18, rowHeightMm(activity.rows.length) * 0.5)}mm`,
                          lineHeight: 1,
                          color: showAnswers && glyph.isTarget ? p.accent : p.ink,
                          border:
                            showAnswers && glyph.isTarget ? `0.6mm solid ${p.accent}` : "none",
                          borderRadius: "50%",
                          padding: showAnswers && glyph.isTarget ? "1.5mm 2.5mm" : undefined,
                        }}
                      >
                        {glyph.glyph}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()
        ) : page.activity.kind === "memory-pairs" ? (
          /* MEMORY PAIRS — identical picture cards on dotted cut lines */
          (() => {
            const activity = page.activity;
            const columns = activity.cards.length <= 12 ? 4 : 5;
            const rows = Math.ceil(activity.cards.length / columns);
            // fill the sheet: cards grow until either the width or the height runs out
            // keep a safety band so a wrapped instruction can never push the last row
            // of cards past the footer
            const budgetMm = bodyMm - 20;
            const cardMm = Math.min(
              (budgetMm - (rows - 1) * 5) / rows,
              (170 - (columns - 1) * 5) / columns,
            );
            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, ${cardMm}mm)`,
                  gap: "5mm",
                  justifyContent: "center",
                  alignContent: "start",
                  height: `${bodyMm}mm`,
                }}
              >
                {activity.cards.map((card) => (
                  <div
                    key={card.id}
                    data-memory-card-id={card.id}
                    data-memory-pair-id={card.pairId}
                    style={{
                      width: `${cardMm}mm`,
                      height: `${cardMm}mm`,
                      border: `0.6mm dashed ${p.rule}`,
                      borderRadius: `${RADIUS_MM}mm`,
                      background: p.surface,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "1.5mm",
                      padding: "3mm",
                      overflow: "hidden",
                    }}
                  >
                    <WorksheetArt
                      object={{ id: card.id, asset: card.asset }}
                      palette={p as never}
                      style={art}
                      size={cardMm * 2.4}
                    />
                    {activity.showLabels ? (
                      <span
                        style={{
                          fontSize: `${t.instructionMm}mm`,
                          color: p.ink,
                          letterSpacing: "0.02em",
                          textAlign: "center",
                        }}
                      >
                        {card.label}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            );
          })()
        ) : page.activity.kind === "letter-trace" ? (
          /* LETTER FORMATION — ruled handwriting bands with a solid model
             letter, dashed construction letters to trace and free writing
             space. Baseline, midline and a green start dot give real
             early-handwriting guidance instead of faded font copies. */
          (() => {
            const activity = page.activity;
            const bandMm = Math.min(34, (bodyMm * 0.7) / activity.rows.length);
            const SLOT = 80;
            const H = 120;
            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: `${t.blockGapMm}mm`,
                  height: `${bodyMm}mm`,
                }}
              >
                {activity.rows.map((row) => {
                  // INDEPENDENT WRITING: at most one dashed reminder, the rest
                  // is empty ruled space the child writes in unaided.
                  const independent = activity.mode === "independent";
                  const traceSlots = independent
                    ? (row.traceSlots ?? 0)
                    : Math.max(2, row.repeats - 1);
                  const freeSlots = independent ? Math.max(3, row.blankSlots ?? 4) : 2;
                  // the closing "your turn" row is fully unaided: no model letter
                  const showModel = !(independent && traceSlots === 0);
                  const slots = (showModel ? 1 : 0) + traceSlots + freeSlots;
                  const width = slots * SLOT;
                  return (
                    <div
                      key={row.id}
                      data-trace-row-id={row.id}
                      data-writing-mode={activity.mode ?? "guided"}
                      data-blank-slots={
                        activity.mode === "independent" ? Math.max(3, row.blankSlots ?? 4) : 2
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4mm",
                        background: p.paper,
                        minHeight: 0,
                      }}
                    >
                      {row.caption ? (
                        <span style={{ fontSize: "3.6mm", color: p.inkSoft, width: "20mm" }}>
                          {row.caption}
                        </span>
                      ) : null}
                      <svg
                        viewBox={`0 0 ${width} ${H}`}
                        style={{ flex: 1, height: `${bandMm}mm` }}
                        preserveAspectRatio="none"
                      >
                        {/* ruled guidance: ascender, dashed midline, solid baseline */}
                        <line x1="0" y1="12" x2={width} y2="12" stroke={p.rule} strokeWidth="0.8" />
                        <line
                          x1="0"
                          y1="56"
                          x2={width}
                          y2="56"
                          stroke={p.rule}
                          strokeWidth="0.8"
                          strokeDasharray="6 6"
                        />
                        <line
                          x1="0"
                          y1="100"
                          x2={width}
                          y2="100"
                          stroke={p.ink}
                          strokeWidth="1.4"
                        />
                        {Array.from({ length: slots }, (_, i) => {
                          const cx = i * SLOT + SLOT / 2;
                          const isModel = showModel && i === 0;
                          const isTrace =
                            i >= (showModel ? 1 : 0) && i < (showModel ? 1 : 0) + traceSlots;
                          return (
                            <g key={`${row.id}-slot-${i}`} data-trace-slot={i}>
                              {isModel || isTrace ? (
                                <text
                                  x={cx}
                                  y="100"
                                  textAnchor="middle"
                                  fontFamily="var(--font-display)"
                                  fontSize="98"
                                  fill={isModel ? p.ink : "none"}
                                  stroke={isModel ? "none" : p.rule}
                                  strokeWidth={isModel ? 0 : 2.4}
                                  strokeDasharray={isModel ? undefined : "7 7"}
                                  strokeLinecap="round"
                                >
                                  {row.glyph}
                                </text>
                              ) : null}
                              {isModel || isTrace ? (
                                <>
                                  {/* start here */}
                                  <circle cx={cx - 24} cy="20" r="5" fill={p.accent} />
                                  {/* stroke direction */}
                                  <path
                                    d={`M${cx - 24} 28 L${cx - 24} 44 M${cx - 28} 38 L${cx - 24} 44 L${cx - 20} 38`}
                                    fill="none"
                                    stroke={p.accent}
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                  />
                                </>
                              ) : null}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })}
                {activity.words.length ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-around",
                      border: HAIRLINE,
                      borderRadius: `${RADIUS_MM}mm`,
                      background: p.surface,
                      padding: "2mm",
                      minHeight: 0,
                      overflow: "hidden",
                    }}
                  >
                    {activity.words.map((word) => (
                      <div
                        key={word.id}
                        data-trace-word-id={word.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "1.5mm",
                        }}
                      >
                        <WorksheetArt
                          object={{ id: word.id, asset: word.asset }}
                          palette={p as never}
                          style={art}
                          size={t.objectSize * 0.8}
                        />
                        <span style={{ fontSize: "3.6mm", color: p.ink }}>{word.word}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })()
        ) : page.activity.kind === "find-target" ? (
          <div
            data-rendered-mechanic="find-target"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 38mm)",
              justifyContent: "center",
              alignContent: "center",
              gap: "8mm",
              height: `${bodyMm}mm`,
            }}
          >
            {page.activity.items.map((item) => (
              <div
                key={item.id}
                data-find-item-id={item.id}
                data-is-target={item.isTarget ? "1" : "0"}
                style={{
                  width: "38mm",
                  height: "38mm",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: showAnswers && item.isTarget ? `0.8mm solid ${p.accent}` : HAIRLINE,
                  borderRadius: "50%",
                  background: p.surface,
                }}
              >
                <WorksheetArt object={item} palette={p as never} style={art} size={82} />
              </div>
            ))}
          </div>
        ) : page.activity.kind === "match-pairs" ? (
          <div
            data-rendered-mechanic="match-pairs"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 42mm 1fr",
              gap: "5mm",
              height: `${bodyMm}mm`,
            }}
          >
            <div style={{ display: "grid", gap: "5mm" }}>
              {page.activity.left.map((item) => (
                <div
                  key={item.id}
                  data-match-item-id={item.id}
                  data-pair-id={item.pairId}
                  data-match-side="left"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: HAIRLINE,
                    borderRadius: `${RADIUS_MM}mm`,
                    background: p.surface,
                  }}
                >
                  {item.letter ? (
                    <span
                      data-letter-card={item.letter}
                      style={{ fontSize: "18mm", lineHeight: 1, fontWeight: 700, color: p.ink }}
                    >
                      {item.letter}
                    </span>
                  ) : (
                    <WorksheetArt object={item} palette={p as never} style={art} size={72} />
                  )}
                  {item.label ? (
                    <span style={{ fontSize: "3.2mm", color: p.ink }}>{item.label}</span>
                  ) : null}
                </div>
              ))}
            </div>
            <div
              aria-hidden="true"
              style={{ borderLeft: `0.4mm dashed ${p.rule}`, margin: "4mm auto" }}
            />
            <div style={{ display: "grid", gap: "5mm" }}>
              {page.activity.right.map((item) => (
                <div
                  key={item.id}
                  data-match-item-id={item.id}
                  data-pair-id={item.pairId}
                  data-match-side="right"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: HAIRLINE,
                    borderRadius: `${RADIUS_MM}mm`,
                    background: p.surface,
                  }}
                >
                  {item.letter ? (
                    <span
                      data-letter-card={item.letter}
                      style={{ fontSize: "18mm", lineHeight: 1, fontWeight: 700, color: p.ink }}
                    >
                      {item.letter}
                    </span>
                  ) : (
                    <WorksheetArt object={item} palette={p as never} style={art} size={72} />
                  )}
                  {item.label ? (
                    <span style={{ fontSize: "3.2mm", color: p.ink }}>{item.label}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : page.activity.kind === "trace-draw" ? (
          <div
            data-rendered-mechanic="trace-draw"
            data-trace-subtype={page.activity.subtype}
            style={{ display: "grid", gap: "5mm", height: `${bodyMm}mm` }}
          >
            {page.activity.paths?.map((path, pathIndex) => (
              <div
                key={path.id}
                data-trace-path-id={path.id}
                data-trace-relationship={path.relationship}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32mm 1fr 32mm",
                  alignItems: "center",
                  gap: "4mm",
                  border: HAIRLINE,
                  borderRadius: `${RADIUS_MM}mm`,
                  background: p.surface,
                  padding: "3mm 6mm",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {path.from.letter ? (
                    <span
                      data-letter-card={path.from.letter}
                      style={{ fontSize: "16mm", lineHeight: 1, fontWeight: 700, color: p.ink }}
                    >
                      {path.from.letter}
                    </span>
                  ) : (
                    <>
                      <WorksheetArt object={path.from} palette={p as never} style={art} size={58} />
                      <span style={{ fontSize: "3mm" }}>{path.from.label}</span>
                    </>
                  )}
                </div>
                <svg
                  viewBox="0 0 240 60"
                  style={{ width: "100%", height: "20mm" }}
                  aria-label={`Trace path ${pathIndex + 1}`}
                >
                  <path
                    d={
                      pathIndex % 2
                        ? "M4 30 C60 2 110 58 160 30 S215 8 236 30"
                        : "M4 30 C55 55 105 5 155 30 S210 54 236 30"
                    }
                    fill="none"
                    stroke={p.rule}
                    strokeWidth="4"
                    strokeDasharray="9 8"
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <WorksheetArt object={path.to} palette={p as never} style={art} size={58} />
                  <span style={{ fontSize: "3mm" }}>{path.to.label}</span>
                </div>
              </div>
            ))}
            {page.activity.shapes.map((shape) => (
              <div
                key={shape.id}
                data-trace-shape={shape.asset}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8mm",
                  alignItems: "center",
                  border: HAIRLINE,
                  borderRadius: `${RADIUS_MM}mm`,
                  background: p.surface,
                  padding: "3mm 8mm",
                }}
              >
                <div
                  style={{
                    opacity: 0.35,
                    border: `0.5mm dashed ${p.rule}`,
                    borderRadius: `${RADIUS_MM}mm`,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <WorksheetArt object={shape} palette={p as never} style={art} size={52} />
                </div>
                <div
                  aria-label={`Draw a ${shape.label}`}
                  style={{
                    height: "100%",
                    minHeight: "30mm",
                    border: `0.5mm dashed ${p.rule}`,
                    borderRadius: `${RADIUS_MM}mm`,
                  }}
                />
              </div>
            ))}
          </div>
        ) : page.activity.kind === "sound-hunt" ? (
          /* BEGINNING-SOUND DISCRIMINATION — say each word, circle the ones
             that start with the target sound. Nothing on the child's sheet
             reveals which pictures are correct. */
          (() => {
            const activity = page.activity;
            const requestedGrid = page.semanticRequirements?.requiredGrid;
            const columns = requestedGrid?.columns ?? (activity.items.length <= 6 ? 3 : 4);
            const rows = requestedGrid?.rows ?? Math.ceil(activity.items.length / columns);
            const cellMm = Math.min(
              (bodyMm - 14 - (rows - 1) * 6) / rows,
              (170 - (columns - 1) * 6) / columns,
            );
            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "5mm",
                  height: `${bodyMm}mm`,
                }}
              >
                <div
                  data-sound-target={activity.targetLetter}
                  style={{
                    alignSelf: "center",
                    display: "flex",
                    alignItems: "baseline",
                    gap: "3mm",
                    border: `0.5mm solid ${p.rule}`,
                    borderRadius: `${RADIUS_MM}mm`,
                    background: p.surface,
                    padding: "1.5mm 6mm",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "10mm",
                      lineHeight: 1,
                      color: p.ink,
                    }}
                  >
                    {activity.targetLetter} {activity.targetLetter.toLowerCase()}
                  </span>
                  <span style={{ fontSize: "4mm", color: p.inkSoft }}>
                    {activity.targetPhoneme}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${columns}, ${cellMm}mm)`,
                    gap: "6mm",
                    justifyContent: "center",
                    alignContent: "center",
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  {activity.items.map((item) => (
                    <div
                      key={item.id}
                      data-sound-item-id={item.id}
                      data-sound-word={item.word}
                      data-sound-target-item={item.isTarget ? "1" : "0"}
                      style={{
                        width: `${cellMm}mm`,
                        height: `${cellMm}mm`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "1.5mm",
                        border:
                          showAnswers && item.isTarget
                            ? `0.8mm solid ${p.accent}`
                            : `0.4mm solid ${p.rule}`,
                        borderRadius: "50%",
                        background: p.surface,
                        padding: "3mm",
                        overflow: "hidden",
                      }}
                    >
                      <WorksheetArt
                        object={{ id: item.id, asset: item.asset }}
                        palette={p as never}
                        style={art}
                        size={cellMm * 2.2}
                      />
                      <span style={{ fontSize: "3.4mm", color: p.ink }}>{item.word}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        ) : page.activity.kind === "picture-letter-match" ? (
          /* PICTURE → LETTER MATCHING — pictures on the left, letter cards on
             the right, one drawn line each. A real matching mechanic. */
          (() => {
            const activity = page.activity;
            const rowMm = Math.min(
              34,
              (bodyMm - (activity.pictures.length - 1) * 5) / activity.pictures.length,
            );
            return (
              <div
                data-match-target-letter={activity.targetLetter}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 34mm 1fr",
                  gap: "6mm",
                  alignItems: "center",
                  height: `${bodyMm}mm`,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "5mm" }}>
                  {activity.pictures.map((picture) => (
                    <div
                      key={picture.id}
                      data-match-picture-id={picture.id}
                      data-match-picture-word={picture.word}
                      data-match-picture-letter={picture.letter}
                      style={{
                        height: `${rowMm}mm`,
                        display: "flex",
                        alignItems: "center",
                        gap: "3mm",
                        border: HAIRLINE,
                        borderRadius: `${RADIUS_MM}mm`,
                        background: p.surface,
                        padding: "0 4mm",
                        overflow: "hidden",
                      }}
                    >
                      <WorksheetArt
                        object={{ id: picture.id, asset: picture.asset }}
                        palette={p as never}
                        style={art}
                        size={rowMm * 2.4}
                      />
                      <span style={{ fontSize: "4mm", color: p.ink }}>{picture.word}</span>
                      <span
                        style={{
                          marginLeft: "auto",
                          width: "4mm",
                          height: "4mm",
                          borderRadius: "50%",
                          border: `0.5mm solid ${p.rule}`,
                          background: p.paper,
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: "center", fontSize: "3.4mm", color: p.inkSoft }}>
                  draw a line
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5mm",
                    justifyContent: "center",
                  }}
                >
                  {activity.letterCards.map((card) => (
                    <div
                      key={card.id}
                      data-match-letter-card={card.letter}
                      style={{
                        height: `${rowMm}mm`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3mm",
                        border: `0.5mm solid ${p.rule}`,
                        borderRadius: `${RADIUS_MM}mm`,
                        background: p.paper,
                      }}
                    >
                      <span
                        style={{
                          width: "4mm",
                          height: "4mm",
                          borderRadius: "50%",
                          border: `0.5mm solid ${p.rule}`,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: `${Math.min(14, rowMm * 0.55)}mm`,
                          lineHeight: 1,
                          color: p.ink,
                        }}
                      >
                        {card.letter} {card.letter.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        ) : page.activity.kind === "word-complete" ? (
          /* WORD COMPLETION — the child writes the missing first letter. */
          (() => {
            const activity = page.activity;
            const columns = activity.items.length <= 4 ? 2 : 3;
            const rows = Math.ceil(activity.items.length / columns);
            const cellMm = Math.min(
              (bodyMm - (rows - 1) * 6) / rows,
              (170 - (columns - 1) * 6) / columns,
            );
            return (
              <div
                data-complete-target-letter={activity.targetLetter}
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, ${cellMm}mm)`,
                  gap: "6mm",
                  justifyContent: "center",
                  alignContent: "center",
                  height: `${bodyMm}mm`,
                }}
              >
                {activity.items.map((item) => (
                  <div
                    key={item.id}
                    data-complete-item-id={item.id}
                    data-complete-word={item.word}
                    style={{
                      width: `${cellMm}mm`,
                      height: `${cellMm}mm`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "2mm",
                      border: HAIRLINE,
                      borderRadius: `${RADIUS_MM}mm`,
                      background: p.surface,
                      padding: "3mm",
                      overflow: "hidden",
                    }}
                  >
                    <WorksheetArt
                      object={{ id: item.id, asset: item.asset }}
                      palette={p as never}
                      style={art}
                      size={cellMm * 2.1}
                    />
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "1.5mm" }}>
                      <span
                        style={{
                          width: "9mm",
                          height: "9mm",
                          borderBottom: `0.6mm solid ${p.rule}`,
                          borderLeft: `0.3mm dashed ${p.rule}`,
                          borderRight: `0.3mm dashed ${p.rule}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-display)",
                          fontSize: "6mm",
                          color: showAnswers ? p.accent : "transparent",
                        }}
                      >
                        {item.missingLetter}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "6mm",
                          color: p.ink,
                        }}
                      >
                        {item.remainder}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        ) : page.activity.kind === "sequence-stages" ? (
          /* STAGE SEQUENCING — numbered slots + shuffled cut-out stage cards.
             No quantities anywhere: each stage is printed exactly once. */
          (() => {
            const activity = page.activity;
            const cardMm = Math.min(
              46,
              Math.max(28, (size.w - 2 * MARGIN - 12) / activity.cards.length - 4),
            );
            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: `${t.blockGapMm}mm`,
                  height: `${bodyMm}mm`,
                }}
              >
                <div
                  data-sequence-slots={activity.slots.length}
                  style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: `repeat(${activity.slots.length}, minmax(0, 1fr))`,
                    gap: "5mm",
                    minHeight: 0,
                  }}
                >
                  {activity.slots.map((slot) => (
                    <div
                      key={slot.id}
                      data-sequence-slot={slot.position}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "2mm",
                        border: `0.6mm solid ${p.rule}`,
                        borderRadius: `${RADIUS_MM}mm`,
                        background: p.surface,
                        minHeight: 0,
                      }}
                    >
                      <span
                        style={{
                          width: "10mm",
                          height: "10mm",
                          borderRadius: "50%",
                          border: `0.6mm solid ${p.rule}`,
                          background: p.paper,
                          color: p.ink,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "5.2mm",
                          fontWeight: 700,
                        }}
                      >
                        {slot.position}
                      </span>
                      <span style={{ fontSize: "3.2mm", color: p.inkSoft }}>
                        {slot.position === 1
                          ? "First"
                          : slot.position === activity.slots.length
                            ? "Last"
                            : "Next"}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: "center", fontSize: "3.4mm", color: p.inkSoft }}>
                  ✁ Cut out the pictures below
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "4mm",
                    borderTop: `0.4mm dashed ${p.rule}`,
                    paddingTop: "4mm",
                  }}
                >
                  {activity.cards.map((card) => (
                    <div
                      key={card.id}
                      data-stage-card-id={card.id}
                      data-stage-id={card.stageId}
                      data-correct-order={card.order}
                      style={{
                        width: `${cardMm}mm`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "1.5mm",
                        border: `0.5mm dashed ${p.rule}`,
                        borderRadius: "3mm",
                        background: p.paper,
                        padding: "2.5mm 1.5mm",
                      }}
                    >
                      <WorksheetArt
                        object={{ id: card.id, asset: card.asset }}
                        palette={p as never}
                        style={art}
                        size={Math.min(t.objectSize, cardMm * 2.2)}
                      />
                      {activity.showLabels ? (
                        <span style={{ fontSize: "3.4mm", color: p.ink, textAlign: "center" }}>
                          {card.label}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        ) : page.activity.kind === "order-sequence" ? (
          /* QUANTITY ORDERING — the child numbers groups from fewest to most */
          <div
            style={{
              display: "grid",
              gap: `${t.blockGapMm}mm`,
              gridTemplateRows: `repeat(${page.activity.rows.length}, minmax(0, 1fr))`,
              height: `${bodyMm}mm`,
            }}
          >
            {page.activity.rows.map((row) => (
              <div
                key={row.id}
                data-order-row-id={row.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-around",
                  gap: "6mm",
                  border: HAIRLINE,
                  borderRadius: `${RADIUS_MM}mm`,
                  background: p.surface,
                  padding: "2mm 5mm",
                  overflow: "hidden",
                }}
              >
                {row.items.map((item) => (
                  <div
                    key={item.id}
                    data-order-item-id={item.id}
                    data-correct-rank={item.rank}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "2mm",
                    }}
                  >
                    {objects(
                      item.renderedObjects,
                      rowHeightMm(
                        page.activity.kind === "order-sequence" ? page.activity.rows.length : 1,
                      ) - 16,
                      50,
                    )}
                    <span
                      style={{
                        width: `${t.choiceCardMm}mm`,
                        height: `${t.choiceCardMm}mm`,
                        border: `0.6mm solid ${p.rule}`,
                        borderRadius: "2mm",
                        background: p.paper,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontSize: `${t.choiceCardMm * 0.5}mm`,
                        color: showAnswers ? p.accent : "transparent",
                      }}
                    >
                      {item.rank}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </main>

      {/* Footer — understated product identity: brand left, page right. */}
      <footer
        data-worksheet-footer
        style={{
          borderTop: HAIRLINE,
          paddingTop: "2.6mm",
          marginTop: "3mm",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "6mm",
          fontSize: "2.2mm",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: p.inkSoft,
        }}
      >
        <span data-footer-brand style={{ fontWeight: 600 }}>
          Alfa Mind Hub
        </span>
        <span
          data-footer-note
          style={{
            opacity: 0.5,
            letterSpacing: "0.12em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {page.footerNote ?? `${direction.name} · ${project.meta.approach}-inspired`}
        </span>
        <span data-footer-page style={{ opacity: 0.8, whiteSpace: "nowrap" }}>
          Page {index + 1}
        </span>
      </footer>
    </div>
  );

  // First pass measures every illustration cluster, second pass redraws them
  // all at one shared size so a pack never mixes artwork scales by accident.
  let content = buildPage();
  if (!sizeIsTaught && measuredSizes.length > 1) {
    const min = Math.min(...measuredSizes);
    const max = Math.max(...measuredSizes);
    if (max - min > min * 0.06) {
      sharedObjectSize = min;
      content = buildPage();
    }
  }

  if (scale === 1) return content;
  return (
    <div
      className="page-fit"
      style={{ width: `${size.w * scale}mm`, height: `${size.h * scale}mm` }}
    >
      {content}
    </div>
  );
}
