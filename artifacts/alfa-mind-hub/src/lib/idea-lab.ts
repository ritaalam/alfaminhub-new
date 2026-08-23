/**
 * Idea Lab — deterministic demo ideas.
 *
 * NO AI is connected. Every idea below is a hand-written Alfa demo whose
 * `spec` is a partial WorksheetSpec, so "Create this activity" feeds the
 * existing Worksheet Creator instead of a parallel worksheet system.
 */

import type { WorksheetSpec } from "@/lib/creator-options";

export type WorksheetIdea = {
  id: string;
  title: string;
  objective: string;
  age: string;
  time: string;
  prep: "No prep" | "Low prep" | "Some prep";
  activityType: string;
  spec: Partial<WorksheetSpec>;
  tags: { skill: string; theme: string; approach: string };
};

export const demoIdeas: WorksheetIdea[] = [
  {
    id: "butterfly-number-hunt",
    title: "Butterfly Number Hunt",
    objective: "Match quantities 1–10 to written numerals.",
    age: "Ages 4–5",
    time: "10 minutes",
    prep: "No prep",
    activityType: "Match",
    spec: {
      level: "Ages 4–5",
      duration: "10 minutes",
      pages: "2",
      skill: "Counting",
      theme: "Insects",
      approach: "Montessori",
      difficulty: "Easy",
      activityType: "Match",
      prompt: "A butterfly number hunt where children count and match numerals 1–10.",
    },
    tags: { skill: "Counting", theme: "Insects", approach: "Montessori" },
  },
  {
    id: "spring-pattern-garden",
    title: "Spring Pattern Garden",
    objective: "Continue simple AB and ABC patterns using garden shapes.",
    age: "Ages 4–5",
    time: "15 minutes",
    prep: "Low prep",
    activityType: "Circle",
    spec: {
      level: "Ages 4–5",
      duration: "15 minutes",
      pages: "2",
      skill: "Patterns",
      theme: "Nature",
      approach: "Montessori",
      difficulty: "Easy",
      activityType: "Circle",
      prompt: "A spring garden pattern activity with AB and ABC sequences.",
    },
    tags: { skill: "Patterns", theme: "Nature", approach: "Montessori" },
  },
  {
    id: "ladybug-count-match",
    title: "Ladybug Count & Match",
    objective: "Count spots up to 6 and match to the correct number card.",
    age: "Ages 3–4",
    time: "10 minutes",
    prep: "No prep",
    activityType: "Match",
    spec: {
      level: "Ages 3–4",
      duration: "10 minutes",
      pages: "1",
      skill: "Counting",
      theme: "Insects",
      approach: "Montessori",
      difficulty: "Easy",
      activityType: "Match",
      prompt: "A ladybug spot counting and matching page for young children.",
    },
    tags: { skill: "Counting", theme: "Insects", approach: "Montessori" },
  },
  {
    id: "flower-beginning-sounds",
    title: "Flower Beginning Sounds",
    objective: "Identify initial sounds of familiar garden words.",
    age: "Ages 4–5",
    time: "15 minutes",
    prep: "Low prep",
    activityType: "Circle",
    spec: {
      level: "Ages 4–5",
      duration: "15 minutes",
      pages: "2",
      skill: "Phonics",
      theme: "Nature",
      approach: "Montessori",
      difficulty: "Medium",
      activityType: "Circle",
      prompt: "Beginning sounds practice with flowers and garden vocabulary.",
    },
    tags: { skill: "Phonics", theme: "Nature", approach: "Montessori" },
  },
  {
    id: "forest-emotion-match",
    title: "Forest Emotion Match",
    objective: "Name feelings and match them to woodland friends' faces.",
    age: "Ages 4–5",
    time: "15 minutes",
    prep: "No prep",
    activityType: "Match",
    spec: {
      level: "Ages 4–5",
      duration: "15 minutes",
      pages: "2",
      skill: "Logic",
      theme: "Animals",
      approach: "Play-Based Learning",
      difficulty: "Easy",
      activityType: "Match",
      prompt: "An emotion-matching activity with gentle forest animal friends.",
    },
    tags: { skill: "Social & Emotional", theme: "Forest", approach: "Play-Based" },
  },
  {
    id: "nature-scavenger-hunt",
    title: "Nature Scavenger Hunt",
    objective: "Observe, find and tally natural objects outdoors.",
    age: "Kindergarten",
    time: "20 minutes",
    prep: "Some prep",
    activityType: "Circle",
    spec: {
      level: "Kindergarten",
      duration: "20 minutes",
      pages: "1",
      skill: "Counting",
      theme: "Nature",
      approach: "Inquiry-Based Learning",
      difficulty: "Medium",
      activityType: "Circle",
      prompt: "An outdoor nature scavenger hunt sheet with tally counting.",
    },
    tags: { skill: "Observation", theme: "Nature", approach: "Inquiry-Based" },
  },
];
