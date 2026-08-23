import { useState } from "react";
import { cn } from "@/lib/utils";
import type { OptionGroup } from "@/lib/creator-options";
import {
  activityIcons,
  approachDescriptions,
  inspirationMoods,
  paletteSwatches,
  themeIcons,
} from "@/lib/creator-visuals";

type Props = {
  group: OptionGroup;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
};

const activeChip =
  "border-sage bg-sage-soft font-medium text-secondary-foreground ring-1 ring-sage/40";
const idleChip =
  "border-border bg-card text-muted-foreground hover:border-sage/50 hover:bg-cream hover:text-foreground";

function Swatches({ colors }: { colors: string[] }) {
  return (
    <span className="flex shrink-0 overflow-hidden rounded-full border border-border/70">
      {colors.map((c) => (
        <span key={c} className="size-3.5" style={{ backgroundColor: c }} />
      ))}
    </span>
  );
}

export function OptionChips({ group, value, onChange, compact }: Props) {
  const isCustom = Boolean(group.allowCustom) && !group.options.includes(value);
  const [customOpen, setCustomOpen] = useState(isCustom);

  const select = (option: string) => {
    setCustomOpen(false);
    onChange(option);
  };

  const variant: "palette" | "theme" | "approach" | "activity" | "inspiration" | "plain" =
    group.key === "palette"
      ? "palette"
      : group.key === "theme"
        ? "theme"
        : group.key === "approach"
          ? "approach"
          : group.key === "activityType"
            ? "activity"
            : group.key === "inspiration"
              ? "inspiration"
              : "plain";

  const customButton = group.allowCustom ? (
    <button
      type="button"
      aria-pressed={customOpen}
      onClick={() => setCustomOpen(true)}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        customOpen
          ? "border-terracotta bg-terracotta-soft font-medium text-accent-foreground"
          : "border-dashed border-border bg-card text-muted-foreground hover:border-terracotta/50 hover:text-foreground",
      )}
    >
      Custom
    </button>
  ) : null;

  return (
    <fieldset className={compact ? "space-y-2" : "space-y-2.5"}>
      <legend className="text-[13px] font-semibold tracking-wide text-foreground">
        {group.label}
      </legend>
      {group.helper ? (
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">{group.helper}</p>
      ) : null}

      {variant === "plain" ? (
        <div className="flex flex-wrap gap-1.5">
          {group.options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              onClick={() => select(option)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                value === option ? activeChip : idleChip,
              )}
            >
              {option}
            </button>
          ))}
          {customButton}
        </div>
      ) : null}

      {variant === "palette" ? (
        <div className="flex flex-wrap gap-1.5">
          {group.options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              onClick={() => select(option)}
              className={cn(
                "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm transition-colors",
                value === option ? activeChip : idleChip,
              )}
            >
              <Swatches colors={paletteSwatches[option] ?? ["#eee", "#ddd", "#ccc"]} />
              {option}
            </button>
          ))}
          {customButton}
        </div>
      ) : null}

      {variant === "theme" || variant === "activity" ? (
        <div className="flex flex-wrap gap-1.5">
          {group.options.map((option) => {
            const Icon = (variant === "theme" ? themeIcons : activityIcons)[option];
            return (
              <button
                key={option}
                type="button"
                aria-pressed={value === option}
                onClick={() => select(option)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  value === option ? activeChip : idleChip,
                )}
              >
                {Icon ? <Icon className="size-3.5 shrink-0" strokeWidth={1.7} /> : null}
                {option}
              </button>
            );
          })}
          {customButton}
        </div>
      ) : null}

      {variant === "approach" ? (
        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {group.options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              onClick={() => select(option)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                value === option ? activeChip : idleChip,
              )}
            >
              <span className="block text-sm font-medium text-foreground">{option}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                {approachDescriptions[option]}
              </span>
            </button>
          ))}
          {customButton}
        </div>
      ) : null}

      {variant === "inspiration" ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {group.options.map((option) => {
            const mood = inspirationMoods[option];
            const Icon = mood?.icon;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={value === option}
                onClick={() => select(option)}
                className={cn(
                  "overflow-hidden rounded-xl border text-left transition-colors",
                  value === option ? activeChip : idleChip,
                )}
              >
                <span
                  className="flex h-11 items-end gap-1 p-1.5"
                  style={{
                    background: `linear-gradient(120deg, ${(mood?.colors ?? ["#f4f4f2", "#e6e6e2", "#cfcfc9"]).join(", ")})`,
                  }}
                >
                  {Icon ? (
                    <span className="flex size-7 items-center justify-center rounded-lg bg-background/85 text-foreground">
                      <Icon className="size-4" strokeWidth={1.6} />
                    </span>
                  ) : null}
                </span>
                <span className="block px-3 py-2">
                  <span className="block text-[13px] font-medium leading-snug text-foreground">
                    {option}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{mood?.mood}</span>
                </span>
              </button>
            );
          })}
          <div className="flex items-center">{customButton}</div>
        </div>
      ) : null}

      {group.allowCustom && customOpen ? (
        <input
          autoFocus
          value={group.options.includes(value) ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Your own ${group.label.toLowerCase()}…`}
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-sage focus:ring-2 focus:ring-ring/25"
        />
      ) : null}
    </fieldset>
  );
}
