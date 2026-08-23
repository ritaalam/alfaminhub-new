import { resolveVisualDirection } from "@/lib/visual-directions";
import { cn } from "@/lib/utils";

type Props = {
  directionId?: string | undefined;
  pages?: number;
  className?: string;
};

/**
 * Lightweight, deterministic worksheet thumbnail. It mirrors the printable
 * page rhythm (title, instruction rule, activity rows) using the project's
 * visual-direction palette — no heavy re-render of the real A4 page.
 */
export function DraftThumb({ directionId, pages = 1, className }: Props) {
  const direction = resolveVisualDirection(directionId ?? "magical-nature");
  const p = direction.palette;

  return (
    <div
      className={cn(
        "relative aspect-[210/297] w-full overflow-hidden rounded-lg border border-border bg-white",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 p-[8%]">
        <div className="h-[7%] w-[70%] rounded-full" style={{ background: p.ink, opacity: 0.75 }} />
        <div
          className="mt-[4%] h-[4%] w-[52%] rounded-full"
          style={{ background: p.inkSoft, opacity: 0.5 }}
        />
        <div className="mt-[8%] space-y-[6%]">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-[4%]">
              <div className="flex flex-1 gap-[4%]">
                {Array.from({ length: row + 2 }).map((_, i) => (
                  <span
                    key={i}
                    className="block size-[10px] rounded-full sm:size-[12px]"
                    style={{ background: i % 2 ? p.wingAlt : p.wing }}
                  />
                ))}
              </div>
              <span
                className="block h-[14px] w-[14px] rounded-[4px] sm:h-4 sm:w-4"
                style={{ border: `2px solid ${p.accent}` }}
              />
            </div>
          ))}
        </div>
        <div
          className="absolute inset-x-[8%] bottom-[7%] h-[3%] rounded-full"
          style={{ background: p.rule }}
        />
      </div>
      {pages > 1 ? (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-background/90 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {pages}p
        </span>
      ) : null}
    </div>
  );
}
