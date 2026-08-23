/**
 * Quick Start presets — one-tap entry points into the Worksheet Creator.
 *
 * A preset is only a partial `WorksheetSpec`; the Creator merges it over the
 * defaults (or the active class profile), so nothing about the generation
 * pipeline changes and a real AI service can consume the same spec later.
 */

import type { WorksheetSpec } from "@/lib/creator-options";

export type QuickStartPreset = {
  id: string;
  label: string;
  hint: string;
  /** lucide icon name rendered by the dashboard */
  icon:
    | "hash"
    | "type"
    | "shuffle"
    | "pencil-line"
    | "palette"
    | "book-open"
    | "calculator"
    | "gamepad-2"
    | "sparkles";
  patch: Partial<WorksheetSpec>;
};

export const quickStartPresets: QuickStartPreset[] = [
  {
    id: "counting",
    label: "Counting Activity",
    hint: "Count & match groups",
    icon: "hash",
    patch: { skill: "Counting", activityType: "Worksheet", theme: "Insects" },
  },
  {
    id: "letters",
    label: "Letter Practice",
    hint: "Trace and recognise letters",
    icon: "type",
    patch: { skill: "Alphabet", activityType: "Tracing" },
  },
  {
    id: "matching",
    label: "Matching",
    hint: "Pair pictures and ideas",
    icon: "shuffle",
    patch: { skill: "Visual Discrimination", activityType: "Matching" },
  },
  {
    id: "tracing",
    label: "Tracing",
    hint: "Pre-writing lines & shapes",
    icon: "pencil-line",
    patch: { skill: "Pre-Writing", activityType: "Tracing" },
  },
  {
    id: "coloring",
    label: "Coloring",
    hint: "Calm creative pages",
    icon: "palette",
    patch: { skill: "Creativity", activityType: "Coloring", printing: "Ink-saver" },
  },
  {
    id: "vocabulary",
    label: "Vocabulary",
    hint: "Words with pictures",
    icon: "book-open",
    patch: { skill: "Vocabulary", activityType: "Flashcards" },
  },
  {
    id: "math",
    label: "Math Practice",
    hint: "Numbers and first sums",
    icon: "calculator",
    patch: { skill: "Addition", activityType: "Worksheet", level: "Kindergarten" },
  },
  {
    id: "game",
    label: "Classroom Game",
    hint: "Print & play together",
    icon: "gamepad-2",
    patch: { skill: "Logic", activityType: "Bingo", duration: "20 minutes" },
  },
  {
    id: "custom",
    label: "Custom Activity",
    hint: "Start from a blank brief",
    icon: "sparkles",
    patch: {},
  },
];

export function quickStartPatch(id: string | null | undefined): Partial<WorksheetSpec> | null {
  if (!id) return null;
  return quickStartPresets.find((p) => p.id === id)?.patch ?? null;
}
