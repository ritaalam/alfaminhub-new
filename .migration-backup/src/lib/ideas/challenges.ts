/**
 * "Help me solve a classroom challenge" — educational strategies, never
 * diagnoses. Each challenge maps to supportive teaching strategies AND to idea
 * constraints so the same screen can offer practical activities.
 */

import type { IdeaConstraints } from "./engine";

export type ClassroomChallenge = {
  id: string;
  label: string;
  match: RegExp;
  strategies: string[];
  constraints: IdeaConstraints;
};

export const classroomChallenges: ClassroomChallenge[] = [
  {
    id: "attention",
    label: "Children lose concentration quickly",
    match: /concentrat|focus|attention|distract|fidget|restless/i,
    strategies: [
      "Shorten the task: one clear step, five minutes, then a visible finish line.",
      "Say the instruction once, show it once, then stay quiet while they work.",
      "Reduce what is on the page — fewer items, more white space.",
      "Let children stand or move between two short tasks instead of one long one.",
      "End while attention is still good, not after it has gone.",
    ],
    constraints: { duration: "5 minutes", difficulty: "Easy", intent: "short focused single step" },
  },
  {
    id: "early-finishers",
    label: "Some children finish much earlier than others",
    match: /finish(es|ed)? (much )?(earl|first|fast)|early finisher|nothing to do/i,
    strategies: [
      "Keep a small tray of ready-to-go extension pages next to the shelf.",
      "Offer an open-ended follow-up (draw / build / explain) with no single right answer.",
      "Ask the early finisher to teach one step to a classmate who is still working.",
      "Use the same objective at a harder level so the group stays together conceptually.",
    ],
    constraints: {
      duration: "5 minutes",
      grouping: "Individual",
      difficulty: "Challenge",
      intent: "independent extension no prep",
    },
  },
  {
    id: "letters",
    label: "A child struggles with letter recognition",
    match:
      /letter recognition|confus(e|ing) (b|letters)|b and d|mix(es|ing) up letters|alphabet trouble/i,
    strategies: [
      "Work on one letter at a time until it is secure — never two confusable letters together.",
      "Add a body memory: trace the letter large in the air, in sand, then on paper.",
      "Anchor each letter to one picture the child chose themselves.",
      "Practise for three short minutes daily rather than twenty minutes weekly.",
      "Celebrate the letter they know, and build the next one from it.",
    ],
    constraints: {
      skill: "Visual Discrimination",
      difficulty: "Very Easy",
      intent: "one letter at a time tracing find",
    },
  },
  {
    id: "quantity",
    label: "Children know numbers but not quantities",
    match: /know numbers but|quantit|one[- ]to[- ]one|counts? but|number sense/i,
    strategies: [
      "Separate the skills: first count real objects, only later attach the numeral.",
      "Insist on touching each object while counting — one touch, one word.",
      "Ask “how many altogether?” after counting to build the idea of the last number.",
      "Stay within a small range (1–5) until it is effortless before extending.",
    ],
    constraints: {
      skill: "Counting",
      difficulty: "Easy",
      intent: "one to one correspondence quantity to numeral",
    },
  },
  {
    id: "no-cutting",
    label: "I need something without cutting",
    match: /no cutting|without cutting|no scissors|can'?t cut/i,
    strategies: [
      "Choose tasks that finish with a pencil mark: circle, match, trace, colour.",
      "If a set is useful, cut it once yourself and laminate it for reuse.",
    ],
    constraints: { intent: "circle match trace colour no scissors" },
  },
  {
    id: "mixed-ability",
    label: "My class has very mixed abilities",
    match: /mixed abilit|different levels|some ahead|range of abilit/i,
    strategies: [
      "Keep one shared objective and change only the difficulty of the page.",
      "Print three levels of the same activity so the room looks identical.",
      "Pair a confident child with a developing child for the first example only.",
    ],
    constraints: { intent: "same objective three levels open ended" },
  },
  {
    id: "transitions",
    label: "Transitions are noisy and slow",
    match: /transition|noisy|line up|clean ?up|between activities/i,
    strategies: [
      "Give a two-minute warning and a consistent signal.",
      "Have one silent 5-minute page ready that children start the moment they sit.",
      "Make the first task easy enough that everybody can begin without help.",
    ],
    constraints: {
      duration: "5 minutes",
      grouping: "Individual",
      intent: "calm settle morning independent",
    },
  },
  {
    id: "confidence",
    label: "A child gives up quickly",
    match: /gives? up|no confidence|afraid to try|says i can'?t|frustrat/i,
    strategies: [
      "Start below the child's level so the first answer is certain, then rise slowly.",
      "Praise the strategy (“you counted each one”), not the child.",
      "Allow a rubber, a second attempt and unfinished work without comment.",
      "Keep the page short so finishing is always achievable.",
    ],
    constraints: { difficulty: "Very Easy", intent: "short achievable success first" },
  },
];

export function matchChallenge(text: string): ClassroomChallenge | null {
  return classroomChallenges.find((c) => c.match.test(text)) ?? null;
}

/** Generic, always-safe guidance when no specific challenge matches. */
export const generalStrategies: string[] = [
  "Name the goal in one sentence the children could repeat back.",
  "Model one example, then step back and observe before helping.",
  "Change the difficulty of the material, never the expectation of the child.",
  "Keep the first attempt short — success early makes the second attempt longer.",
];
