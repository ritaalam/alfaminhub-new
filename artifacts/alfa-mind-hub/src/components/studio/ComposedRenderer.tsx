import type { IllustrationStyle } from "@/lib/visual-directions";
import type {
  AnswerKeyEntry,
  ComposedActivity,
  PrintPalette,
  RenderedCountObject,
  WorksheetComponent,
} from "@/lib/worksheet-model";
import { WorksheetArt } from "./WorksheetArt";

type Tokens = {
  objectSize: number;
  objectGapMm: number;
  blockGapMm: number;
  instructionMm: number;
  choiceCardMm: number;
  numberCardMm: number;
};

type Props = {
  activity: ComposedActivity;
  palette: PrintPalette;
  style: IllustrationStyle;
  tokens: Tokens;
  answerKey: AnswerKeyEntry[];
  showAnswers?: boolean;
  /** printable width of the activity area, in millimetres */
  widthMm: number;
};

const RADIUS_MM = 5.5;
/** small caption size shared by every composed component, in mm */
const LABEL_MM = 2.9;

/**
 * UNIVERSAL COMPONENT RENDERER
 * ----------------------------
 * Draws any page assembled by the dynamic composer. Every educational
 * primitive has exactly one printed appearance here, so a composed page looks
 * like the rest of the Alfa Mind Hub family without needing its own template.
 */
export function ComposedRenderer({
  activity,
  palette: p,
  style,
  tokens: t,
  answerKey,
  showAnswers,
  widthMm,
}: Props) {
  const answerFor = (id: string) => answerKey.find((entry) => entry.groupId === id);
  const hairline = `0.35mm solid ${p.rule}`;

  const art = (object: RenderedCountObject, size: number) => (
    <span key={object.id} data-rendered-object-id={object.id} style={{ display: "flex" }}>
      <WorksheetArt object={object} palette={p} style={style} size={size} />
    </span>
  );

  const objectRow = (items: RenderedCountObject[], available: number, captions?: boolean) => {
    const perLine = Math.min(items.length, Math.max(1, Math.floor(available / 18)));
    const size = Math.min(t.objectSize, (available / perLine - t.objectGapMm) * 3.7795);
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: `${t.objectGapMm}mm`,
          maxWidth: `${available}mm`,
        }}
      >
        {items.map((item) =>
          captions ? (
            <span
              key={item.id}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1mm" }}
            >
              {art(item, size)}
              <span style={{ fontSize: `${LABEL_MM}mm`, color: p.inkSoft, fontWeight: 500 }}>
                {item.label ?? ""}
              </span>
            </span>
          ) : (
            art(item, size)
          ),
        )}
      </div>
    );
  };

  const cardShell = {
    border: hairline,
    borderRadius: `${RADIUS_MM}mm`,
    background: p.surface,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 1mm 2mm -0.5mm ${p.rule}40`,
  } as const;

  const render = (component: WorksheetComponent, available: number): React.ReactNode => {
    switch (component.type) {
      case "instruction":
        return (
          <p
            key={component.id}
            style={{
              margin: 0,
              fontSize: `${t.instructionMm * (component.emphasis === "strong" ? 1.05 : 0.92)}mm`,
              color: component.emphasis === "strong" ? p.ink : p.inkSoft,
            }}
          >
            {component.text}
          </p>
        );

      case "card-row":
        return (
          <div key={component.id} style={{ display: "flex", flexDirection: "column", gap: "2mm" }}>
            {component.label ? (
              <span style={{ fontSize: `${LABEL_MM}mm`, color: p.inkSoft }}>{component.label}</span>
            ) : null}
            {objectRow(component.items, available, component.captions)}
          </div>
        );

      case "glyph-card":
        return (
          <div
            key={component.id}
            style={{
              ...cardShell,
              width: `${t.numberCardMm}mm`,
              height: `${t.numberCardMm}mm`,
              fontFamily: "var(--font-display)",
              fontSize: `${t.numberCardMm * 0.55}mm`,
              color: p.ink,
            }}
          >
            {component.glyph}
          </div>
        );

      case "match-columns": {
        const colMm = Math.max(28, (available - 26) / 2);
        const cellMm = Math.max(14, Math.min(24, 90 / Math.max(1, component.left.length)));
        const entry = (
          item: (typeof component.left)[number],
          side: "left" | "right",
          index: number,
        ) => (
          <div
            key={item.id}
            data-match-entry={item.id}
            data-match-target={item.targetId ?? ""}
            style={{
              ...cardShell,
              position: "relative",
              width: `${colMm}mm`,
              height: `${cellMm}mm`,
              justifyContent: side === "left" ? "flex-start" : "flex-end",
              padding: "0 4mm",
              gap: "3mm",
            }}
          >
            {item.object ? art(item.object, Math.min(t.objectSize, cellMm * 3.2)) : null}
            {item.text ? (
              <span style={{ fontFamily: "var(--font-display)", fontSize: `${cellMm * 0.4}mm` }}>
                {item.text}
              </span>
            ) : null}
            {showAnswers && side === "left" ? (
              <span style={{ fontSize: `${LABEL_MM}mm`, color: p.accent }}>
                → {answerFor(item.id)?.answerText ?? answerFor(item.id)?.answer ?? ""}
              </span>
            ) : null}
            <span
              style={{
                position: "absolute",
                [side === "left" ? "right" : "left"]: "-1.8mm",
                top: "50%",
                width: "3.6mm",
                height: "3.6mm",
                borderRadius: "50%",
                background: p.accent,
                border: `0.6mm solid ${p.surface}`,
                boxShadow: `0 0.5mm 1mm -0.2mm ${p.rule}40`,
                transform: "translateY(-50%)",
                zIndex: 2,
              }}
            />
          </div>
        );
        return (
          <div
            key={component.id}
            style={{
              display: "grid",
              gridTemplateColumns: `${colMm}mm 1fr ${colMm}mm`,
              columnGap: "6mm",
              alignItems: "start",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: `${t.blockGapMm}mm` }}>
              {component.left.map((item, index) => entry(item, "left", index))}
            </div>
            <div />
            <div style={{ display: "flex", flexDirection: "column", gap: `${t.blockGapMm}mm` }}>
              {component.right.map((item, index) => entry(item, "right", index))}
            </div>
          </div>
        );
      }

      case "sort-bins": {
        const binMm = Math.max(40, available / component.bins.length - 6);
        return (
          <div key={component.id} style={{ display: "flex", gap: "6mm" }}>
            {component.bins.map((bin) => (
              <div
                key={bin.id}
                data-sort-bin={bin.id}
                style={{
                  width: `${binMm}mm`,
                  minHeight: "42mm",
                  border: `0.5mm dashed ${p.rule}`,
                  borderRadius: `${RADIUS_MM}mm`,
                  padding: "4mm",
                  background: p.paper,
                  boxShadow: `inset 0 0.5mm 1.5mm -0.2mm ${p.rule}40`,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: `${t.instructionMm}mm`,
                    color: p.ink,
                  }}
                >
                  {bin.label}
                </span>
                {showAnswers ? (
                  <div style={{ fontSize: `${LABEL_MM}mm`, color: p.accent, marginTop: "2mm" }}>
                    {answerFor(bin.id)?.answer ?? 0} pictures
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        );
      }

      case "counting-group":
        return (
          <div
            key={component.id}
            data-count-group={component.id}
            style={{ display: "flex", flexDirection: "column", gap: "1.5mm" }}
          >
            {component.label ? (
              <span style={{ fontSize: `${LABEL_MM}mm`, color: p.inkSoft }}>{component.label}</span>
            ) : null}
            {objectRow(component.items, available * 0.6)}
          </div>
        );

      case "comparison-group":
        return (
          <div key={component.id} style={{ display: "flex", gap: "8mm", alignItems: "flex-start" }}>
            {component.groups.map((group) => (
              <div
                key={group.id}
                data-compare-group={group.id}
                style={{ display: "flex", flexDirection: "column", gap: "1.5mm" }}
              >
                {group.label ? (
                  <span style={{ fontSize: `${LABEL_MM}mm`, color: p.inkSoft }}>{group.label}</span>
                ) : null}
                {objectRow(group.items, available / component.groups.length - 8)}
              </div>
            ))}
          </div>
        );

      case "pattern-sequence":
        return (
          <div
            key={component.id}
            data-pattern-row={component.id}
            style={{ display: "flex", alignItems: "center", gap: `${t.objectGapMm}mm` }}
          >
            {component.shown.map((item) => art(item, Math.min(t.objectSize, 46)))}
            <div
              style={{
                width: `${t.choiceCardMm}mm`,
                height: `${t.choiceCardMm}mm`,
                border: `0.6mm dashed ${p.rule}`,
                borderRadius: `${RADIUS_MM}mm`,
                boxShadow: `inset 0 0.5mm 1mm -0.2mm ${p.rule}40`,
                background: p.surface,
              }}
            />
          </div>
        );

      case "answer-choices":
        return (
          <div key={component.id} style={{ display: "flex", gap: "4mm" }}>
            {component.choices.map((choice) => {
              const isAnswer = showAnswers && choice.id === component.answerId;
              return (
                <div
                  key={choice.id}
                  data-answer-choice={choice.id}
                  style={{
                    ...cardShell,
                    width: `${t.choiceCardMm}mm`,
                    height: `${t.choiceCardMm}mm`,
                    borderRadius: "50%",
                    border: isAnswer ? `0.8mm solid ${p.accent}` : hairline,
                    fontFamily: "var(--font-display)",
                    fontSize: `${t.choiceCardMm * 0.45}mm`,
                    color: p.ink,
                  }}
                >
                  {choice.object ? art(choice.object, t.choiceCardMm * 2.6) : choice.text}
                </div>
              );
            })}
          </div>
        );

      case "response-box":
        return (
          <div key={component.id} style={{ display: "flex", flexDirection: "column", gap: "1mm" }}>
            {component.label ? (
              <span style={{ fontSize: `${LABEL_MM}mm`, color: p.inkSoft }}>{component.label}</span>
            ) : null}
            <div
              data-response-box={component.id}
              style={{
                width: `${t.numberCardMm}mm`,
                height: `${component.heightMm ?? t.numberCardMm}mm`,
                border: `0.6mm dashed ${p.rule}`,
                borderRadius: `${RADIUS_MM}mm`,
                boxShadow: `inset 0 0.5mm 1mm -0.2mm ${p.rule}40`,
                background: p.surface,
              }}
            />
          </div>
        );

      case "drawing-area":
        return (
          <div key={component.id} style={{ display: "flex", flexDirection: "column", gap: "1mm" }}>
            {component.label ? (
              <span style={{ fontSize: `${LABEL_MM}mm`, color: p.inkSoft }}>{component.label}</span>
            ) : null}
            <div
              data-drawing-area={component.id}
              style={{
                width: `${Math.min(available * 0.34, 60)}mm`,
                height: `${component.heightMm ?? 24}mm`,
                border: `0.6mm dashed ${p.rule}`,
                borderRadius: `${RADIUS_MM}mm`,
                background: p.paper,
                boxShadow: `inset 0 0.5mm 1mm -0.2mm ${p.rule}40`,
              }}
            />
          </div>
        );

      case "handwriting-line":
        return (
          <div
            key={component.id}
            data-handwriting-line={component.id}
            style={{ display: "flex", gap: "4mm", alignItems: "flex-end" }}
          >
            {Array.from({ length: component.slots }).map((_, index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: "16mm",
                  position: "relative",
                  borderBottom: `0.6mm solid ${p.rule}`,
                  borderTop: `0.6mm solid ${p.rule}`,
                }}
              >
                {/* middle dashed line */}
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  borderTop: `0.4mm dashed ${p.rule}`,
                  opacity: 0.6,
                }} />
              </div>
            ))}
          </div>
        );

      case "tracing-row":
        return (
          <div
            key={component.id}
            data-tracing-row={component.id}
            style={{ display: "flex", alignItems: "center", gap: "5mm" }}
          >
            {component.label ? (
              <span style={{ fontSize: `${LABEL_MM}mm`, color: p.inkSoft, width: "20mm" }}>
                {component.label}
              </span>
            ) : null}
            {Array.from({ length: component.traceSlots }).map((_, index) => (
              <div
                key={`trace-${index}`}
                style={{
                  width: "20mm",
                  height: "20mm",
                  border: `0.6mm dashed ${p.rule}`,
                  borderRadius: `${RADIUS_MM}mm`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: p.inkSoft,
                  opacity: 0.6,
                  fontFamily: "var(--font-display)",
                  fontSize: "9mm",
                  background: p.surface,
                }}
              >
                {component.glyph ?? ""}
              </div>
            ))}
            {Array.from({ length: component.blankSlots }).map((_, index) => (
              <div
                key={`blank-${index}`}
                style={{
                  width: "20mm",
                  height: "20mm",
                  border: `0.4mm solid ${p.rule}`,
                  borderRadius: `${RADIUS_MM}mm`,
                  background: p.paper,
                  boxShadow: `inset 0 0.5mm 1.5mm -0.2mm ${p.rule}40`,
                }}
              />
            ))}
          </div>
        );

      case "cut-out-strip":
        return (
          <div
            key={component.id}
            data-cut-strip={component.id}
            style={{
              border: `0.5mm dashed ${p.rule}`,
              borderRadius: `${RADIUS_MM}mm`,
              padding: "4mm",
              display: "flex",
              flexDirection: "column",
              gap: "2mm",
              boxShadow: `inset 0 0.5mm 1.5mm -0.2mm ${p.rule}40`,
            }}
          >
            {objectRow(component.items, available - 8)}
            {component.note ? (
              <span style={{ fontSize: `${LABEL_MM}mm`, color: p.inkSoft, fontWeight: 500 }}>{component.note}</span>
            ) : null}
          </div>
        );

      case "row":
        return (
          <div
            key={component.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                component.align === "between" ? "space-between" : (component.align ?? "flex-start"),
              gap: "6mm",
            }}
          >
            {component.children.map((child) =>
              render(child, available / component.children.length),
            )}
          </div>
        );

      case "stack":
      default:
        return (
          <div
            key={component.id}
            style={{ display: "flex", flexDirection: "column", gap: `${t.blockGapMm * 0.7}mm` }}
          >
            {component.type === "stack"
              ? component.children.map((child) => render(child, available))
              : null}
          </div>
        );
    }
  };

  return (
    <div
      data-composed-activity={activity.mechanic}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${t.blockGapMm}mm`,
        flex: 1,
        minHeight: 0,
      }}
    >
      {activity.components.map((component) => render(component, widthMm))}
    </div>
  );
}
