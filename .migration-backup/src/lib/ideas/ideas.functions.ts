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

import { createServerFn } from "@tanstack/react-start";
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

export const planIdeas = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PlanInput.parse(data))
  .handler(async ({ data }): Promise<PlanResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return {
        source: "unavailable",
        plans: [],
        strategies: [],
        message: "AI planning is not configured.",
      };
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "openai/gpt-5.6-sol",
          stream: true,
          instructions: systemPrompt,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text:
                    data.mode === "challenge"
                      ? `Classroom challenge: ${data.request}\nReturn json with supportive strategies and activity plans that help.`
                      : `Teacher request: ${data.request}\nReturn json with activity plans.`,
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "idea_plans",
              strict: true,
              schema: planSchema,
            },
          },
        }),
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        return {
          source: "unavailable",
          plans: [],
          strategies: [],
          message:
            res.status === 429
              ? "AI planning is busy right now — showing instant ideas instead."
              : res.status === 402
                ? "AI credits are exhausted — showing instant ideas instead."
                : `AI planning unavailable (${res.status}). ${detail.slice(0, 120)}`,
        };
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload) as {
              type?: string;
              delta?: string;
              response?: { output_text?: string };
            };
            if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
              text += evt.delta;
            } else if (evt.type === "response.completed" && evt.response?.output_text) {
              if (!text) text = evt.response.output_text;
            }
          } catch {
            /* ignore keep-alive / partial frames */
          }
        }
      }

      if (!text.trim()) {
        return {
          source: "unavailable",
          plans: [],
          strategies: [],
          message: "AI returned no plan.",
        };
      }

      const parsed = JSON.parse(text) as { plans?: IdeaPlan[]; strategies?: string[] };
      return {
        source: "ai",
        plans: Array.isArray(parsed.plans) ? parsed.plans.slice(0, 6) : [],
        strategies: Array.isArray(parsed.strategies) ? parsed.strategies.slice(0, 6) : [],
      };
    } catch (error) {
      return {
        source: "unavailable",
        plans: [],
        strategies: [],
        message: error instanceof Error ? error.message : "AI planning failed.",
      };
    }
  });
