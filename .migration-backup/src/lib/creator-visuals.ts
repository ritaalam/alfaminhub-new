import {
  Anchor,
  Baby,
  Bike,
  Bird,
  Blocks,
  Bug,
  Cake,
  Circle,
  Cloud,
  Compass,
  Egg,
  Flower2,
  Fish,
  Footprints,
  Gift,
  GraduationCap,
  Grid3x3,
  Heart,
  Home,
  Leaf,
  Link2,
  type LucideIcon,
  Milestone,
  Mountain,
  Palette,
  PawPrint,
  PenLine,
  Puzzle,
  Rocket,
  Scissors,
  Search,
  Shapes,
  Sparkles,
  Split,
  Squirrel,
  Stamp,
  Sun,
  Tractor,
  TreePine,
  Trees,
  Waves,
  Wheat,
} from "lucide-react";

/** Small color swatch sets used to preview each palette (visual only). */
export const paletteSwatches: Record<string, string[]> = {
  "Black & White / Ink Saving": ["#ffffff", "#d9d9d9", "#8a8a8a", "#1f1f1f"],
  "Montessori Neutrals": ["#f6f1e7", "#dfd3bf", "#b9a68a", "#8a7f6d"],
  "Soft Pastels": ["#fde8ec", "#e6f0fb", "#eaf6e6", "#fdf3dd"],
  "Bright Primary": ["#e63946", "#f4a261", "#2a9d8f", "#1d3557"],
  "Sage & Cream": ["#f7f5ee", "#dce5d5", "#a8bfa0", "#6f8b68"],
  "Terracotta & Beige": ["#f4ece2", "#e3cbb5", "#c98a67", "#9c5b3d"],
  Pink: ["#fdeef3", "#f7cad9", "#ef9ab8", "#d96a92"],
  Blue: ["#eaf2fb", "#bcd6ef", "#7fb0dd", "#4a7fb5"],
  Rainbow: ["#e63946", "#f4a261", "#2a9d8f", "#5b6cbf"],
};

export const themeIcons: Record<string, LucideIcon> = {
  Nature: Leaf,
  Farm: Tractor,
  Ocean: Waves,
  Space: Rocket,
  Dinosaurs: Footprints,
  Flowers: Flower2,
  Insects: Bug,
  Seasons: Sun,
  Christmas: Gift,
  Easter: Egg,
  School: GraduationCap,
  Emotions: Heart,
  Transportation: Bike,
  Animals: PawPrint,
  "Fairy-tale Garden": Sparkles,
  Countryside: Wheat,
  Woodland: Squirrel,
  Seaside: Anchor,
  "Alpine Village": Mountain,
};

export const activityIcons: Record<string, LucideIcon> = {
  Tracing: PenLine,
  Matching: Link2,
  Maze: Milestone,
  "Cut & Paste": Scissors,
  Sorting: Grid3x3,
  "I Spy": Search,
  Bingo: Stamp,
  Flashcards: Blocks,
  Coloring: Palette,
  Sequencing: Milestone,
  Puzzle: Puzzle,
  Worksheet: PenLine,
  "Mini Book": Cake,
  "Scissor Skills": Scissors,
  "Find the Difference": Split,
  "Connect the Dots": Circle,
};

export const approachDescriptions: Record<string, string> = {
  Montessori: "Ordered, self-correcting tasks the child completes independently.",
  "Reggio Emilia": "Child-led exploration with open-ended documentation and questions.",
  "Waldorf-inspired": "Gentle, imaginative work with rhythm, story and natural imagery.",
  "Traditional Classroom": "Clear instructions and structured practice with a set answer.",
  "Play-Based Learning": "Learning framed as a game, with playful goals and rewards.",
  "Inquiry-Based Learning": "Starts from a question the child investigates step by step.",
  STEM: "Hands-on reasoning across science, tech, engineering and maths.",
  "Sensory Learning": "Touch, texture and movement lead the activity.",
  "Project-Based Learning": "One connected project built across the pages.",
};

/** Generic mood previews — atmosphere only, never copyrighted characters or artwork. */
export const inspirationMoods: Record<
  string,
  { colors: string[]; icon: LucideIcon; mood: string }
> = {
  "Vintage European Children's Storybook": {
    colors: ["#f3ead9", "#d9c3a2", "#8d7a5f"],
    icon: Bird,
    mood: "Warm aged paper, soft ink lines",
  },
  "Alpine Countryside Childhood": {
    colors: ["#eef2ee", "#c7d6cd", "#7b9184"],
    icon: Mountain,
    mood: "Crisp meadows, quiet mountain light",
  },
  "French Countryside Childhood": {
    colors: ["#f6efe4", "#e2cdb6", "#b08968"],
    icon: Wheat,
    mood: "Linen tones, lavender fields",
  },
  "Woodland Storybook": {
    colors: ["#eef1e7", "#cdd7bd", "#7d8f68"],
    icon: TreePine,
    mood: "Mossy forest, gentle creatures",
  },
  "Scandinavian Minimal": {
    colors: ["#ffffff", "#ecebe7", "#b9b6ae"],
    icon: Home,
    mood: "Clean shapes, plenty of air",
  },
  "Watercolor Nature": {
    colors: ["#f2f7f4", "#cfe3dc", "#8fb8ab"],
    icon: Cloud,
    mood: "Soft washes and bleeding edges",
  },
  "Classic Classroom": {
    colors: ["#f7f5f0", "#dcd8cd", "#8a8577"],
    icon: GraduationCap,
    mood: "Chalk lines, tidy ruled layouts",
  },
  "Whimsical Garden": {
    colors: ["#fdf3f6", "#e8dcef", "#b7a2c9"],
    icon: Flower2,
    mood: "Playful blooms, curling stems",
  },
  "Seaside Adventure": {
    colors: ["#eef5fa", "#cbe0ee", "#7fa9c7"],
    icon: Fish,
    mood: "Sun-bleached blues and sand",
  },
  "Cozy Farm": {
    colors: ["#faf1e4", "#ead7b7", "#c39a68"],
    icon: Trees,
    mood: "Golden hay, gingham warmth",
  },
};

export const levelIcon = Baby;
export const compassIcon = Compass;
