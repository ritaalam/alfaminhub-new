import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Calculator,
  Gamepad2,
  Hash,
  Palette,
  PencilLine,
  Shuffle,
  Sparkles,
  Type,
  type LucideIcon,
} from "lucide-react";
import { quickStartPresets } from "@/lib/quick-start";

const icons: Record<string, LucideIcon> = {
  hash: Hash,
  type: Type,
  shuffle: Shuffle,
  "pencil-line": PencilLine,
  palette: Palette,
  "book-open": BookOpen,
  calculator: Calculator,
  "gamepad-2": Gamepad2,
  sparkles: Sparkles,
};

/**
 * One-tap entry points into the Creator. Each preset is only a partial spec,
 * so the existing generator and Studio flow stay exactly the same.
 */
export function QuickStart({ classId }: { classId?: string | null }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl text-foreground">Quick start</h2>
        <p className="text-xs text-muted-foreground">
          Pick a starting point — you can change every option before generating.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {quickStartPresets.map((p) => {
          const Icon = icons[p.icon] ?? Sparkles;
          return (
            <li key={p.id}>
              <Link
                to="/"
                search={classId ? { preset: p.id, classId } : { preset: p.id }}
                className="surface-card flex h-full flex-col gap-1.5 p-3.5 transition-colors hover:bg-cream"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-sage-soft text-secondary-foreground">
                  <Icon className="size-4" strokeWidth={1.8} />
                </span>
                <span className="text-sm font-medium leading-tight text-foreground">{p.label}</span>
                <span className="text-[11px] leading-snug text-muted-foreground">{p.hint}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
