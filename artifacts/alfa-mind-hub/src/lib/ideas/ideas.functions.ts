/**
 * AI idea planning.
 *
 * The AI never invents the activity itself: it *interprets* the teacher's
 * request and returns structured constraints (age, subject, skill, theme,
 * duration, difficulty, grouping). The deterministic Alfa Idea Engine then
 * composes the real activity from those constraints, so every idea remains
 * pedagogically valid, printable and connected to the Worksheet Creator.
 *
 * If the AI gateway is unavailable, the caller falls back to the local
 * natural-language interpreter — the feature always works.
 */

import { z } from "zod";

const PlanInput = z.object({
  request: z.string().min(1).max(600),
  mode: z.enum(["ideas", "challenge"]).default("ideas"),
});

export type IdeaPlan = {
  title: string;
  angle: string;
  level: string;
  subject: string;
  skill: string;
  theme: string;
  season: string;
  duration: string;
  difficulty: string;
  grouping: string;
  approach: string;
};

export type PlanResult = {
  source: "ai" | "unavailable";
  plans: IdeaPlan[];
  /** teacher-facing strategies, only for the challenge mode */
  strategies: string[];
  message?: string;
};

const planSchema = {
  type: "object",
  additionalProperties: false,
  required: ["plans", "strategies"],
  properties: {
    strategies: {
      type: "array",
      items: { type: "string" },
    },
    plans: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "angle",
          "level",
          "subject",
          "skill",
          "theme",
          "season",
          "duration",
          "difficulty",
          "grouping",
          "approach",
        ],
        properties: {
          title: { type: "string" },
          angle: { type: "string" },
          level: {
            type: "string",
            enum: [
              "Ages 2–3",
              "Ages 3–4",
              "Ages 4–5",
              "Preschool",
              "Pre-K",
              "Kindergarten",
              "Grade 1",
              "Grade 2",
              "Grade 3",
              "Grade 4",
              "Grade 5",
              "Grade 6",
            ],
          },
          subject: {
            type: "string",
            enum: [
              "Early Math",
              "Early Literacy",
              "Fine Motor",
              "SEL",
              "Science",
              "Nature",
              "Seasonal Learning",
              "Problem Solving",
              "Creative Thinking",
            ],
          },
          skill: {
            type: "string",
            enum: [
              "Counting",
              "Number Recognition",
              "Patterns",
              "Shapes",
              "Logic",
              "Phonics",
              "Reading",
              "Vocabulary",
              "Handwriting",
              "Fine Motor",
              "SEL/Emotions",
              "Science",
              "Visual Discrimination",
              "Creativity",
              "Problem Solving",
            ],
          },
          theme: {
            type: "string",
            enum: [
              "Insects",
              "Nature",
              "Woodland",
              "Farm",
              "Ocean",
              "Space",
              "Dinosaurs",
              "Flowers",
              "Seasons",
              "Animals",
              "Transportation",
              "Fairy-tale Garden",
              "Emotions",
              "School",
            ],
          },
          season: {
            type: "string",
            enum: [
              "Any season",
              "Autumn",
              "Winter",
              "Spring",
              "Summer",
              "Back to school",
              "Christmas",
              "Easter",
            ],
          },
          duration: {
            type: "string",
            enum: ["5 minutes", "10 minutes", "15 minutes", "20 minutes"],
          },
          difficulty: {
            type: "string",
            enum: ["Very Easy", "Easy", "Standard", "Challenge"],
          },
          grouping: {
            type: "string",
            enum: ["Individual", "Small group", "Whole class"],
          },
          approach: {
            type: "string",
            enum: [
              "Montessori",
              "Reggio Emilia",
              "Play-Based Learning",
              "Inquiry-Based Learning",
              "Project-Based Learning",
            ],
          },
        },
      },
    },
  },
} as const;

const systemPrompt = `You are an early-years curriculum specialist helping a teacher plan classroom activities in Alfa Mind Hub.
Read the teacher's request and return json describing 5 genuinely DIFFERENT activity directions.
Rules:
- Each plan must target a different skill or a different way of working; never five versions of one page.
- Respect any age, duration, theme or preparation constraint stated by the teacher.
- Keep everything age appropriate: under-fives get one-step tasks in 5-10 minutes.
- "angle" is one short sentence for the teacher explaining why this direction helps.
- Never diagnose, label or describe a child medically. Stay educational and supportive.
- In challenge mode also return 4-5 concrete classroom strategies in "strategies"; otherwise return an empty strategies array.`;

export async function planIdeas({ data }: { data: unknown }): Promise<PlanResult> {
  PlanInput.parse(data);
  return {
    source: "unavailable",
    plans: [],
    strategies: [],
    message: "AI planning is not configured. Showing instant classroom ideas instead.",
  };
}
