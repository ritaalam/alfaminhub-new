import { Link } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { addToWeek, removeFromWeek, useWorkspace } from "@/lib/workspace/store";
import { weekDays, type WeekDay } from "@/lib/workspace/types";

/**
 * A deliberately lightweight weekly plan — five days, no calendar engine.
 * Items are references, so opening one always reopens the existing saved
 * project instead of creating a new worksheet.
 */
export function WeeklyPlan() {
  const ws = useWorkspace();
  const [addingTo, setAddingTo] = useState<WeekDay | null>(null);

  const draft = (id: string) => ws.drafts.find((d) => d.id === id);
  const idea = (id: string) => ws.ideas.find((i) => i.id === id);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl text-foreground">This week</h2>
        <p className="text-xs text-muted-foreground">
          Place saved worksheets and saved ideas into a day. Nothing is duplicated.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {weekDays.map((day) => {
          const items = ws.weekly[day];
          return (
            <div key={day} className="surface-card flex flex-col p-3">
              <h3 className="text-sm font-medium text-foreground">{day}</h3>

              <ul className="mt-2 flex-1 space-y-1.5">
                {items.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-border px-2.5 py-3 text-[11px] text-muted-foreground">
                    Nothing planned
                  </li>
                ) : (
                  items.map((item) => {
                    const d = item.kind === "draft" ? draft(item.refId) : undefined;
                    const i = item.kind === "idea" ? idea(item.refId) : undefined;
                    const label = d?.title ?? i?.idea.title ?? "Removed item";
                    return (
                      <li
                        key={item.id}
                        className="flex items-start gap-1.5 rounded-lg bg-cream px-2.5 py-1.5"
                      >
                        <span className="min-w-0 flex-1">
                          {d ? (
                            <Link
                              to="/"
                              search={{ draft: d.id }}
                              className="block truncate text-xs font-medium text-foreground underline-offset-4 hover:underline"
                            >
                              {label}
                            </Link>
                          ) : i ? (
                            <Link
                              to="/"
                              search={{ idea: i.idea.id }}
                              className="block truncate text-xs font-medium text-foreground underline-offset-4 hover:underline"
                            >
                              {label}
                            </Link>
                          ) : (
                            <span className="block truncate text-xs text-muted-foreground">
                              {label}
                            </span>
                          )}
                          <span className="block text-[10px] text-muted-foreground">
                            {item.kind === "draft" ? "Worksheet" : "Idea"}
                          </span>
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${label} from ${day}`}
                          onClick={() => removeFromWeek(day, item.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3.5" strokeWidth={1.8} />
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

              <button
                type="button"
                onClick={() => setAddingTo(addingTo === day ? null : day)}
                className={cn(
                  "mt-2 flex items-center justify-center gap-1 rounded-lg border border-dashed border-border py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-cream hover:text-foreground",
                  addingTo === day && "bg-cream text-foreground",
                )}
              >
                <Plus className="size-3.5" strokeWidth={1.8} /> Add to {day}
              </button>

              {addingTo === day ? (
                <div className="mt-2 space-y-1.5">
                  <select
                    aria-label={`Add a worksheet to ${day}`}
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) addToWeek(day, "draft", e.target.value);
                      e.target.value = "";
                    }}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px]"
                  >
                    <option value="">Add a worksheet…</option>
                    {ws.drafts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={`Add an idea to ${day}`}
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) addToWeek(day, "idea", e.target.value);
                      e.target.value = "";
                    }}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px]"
                  >
                    <option value="">Add a saved idea…</option>
                    {ws.ideas.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.idea.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
