import { describe, expect, it } from "vitest";
import { defaultSpec } from "@/lib/creator-options";
import { applyPromptIntent } from "@/lib/learning-domains";
import { finalizeWorksheetProject, generateWorksheetProject } from "@/lib/worksheet-service";

const prompt = [
  "Create a 3-page worksheet pack about beginning sounds for Ages 4–5.",
  "**Page 1.** Create a circle beginning-sound activity. Show exactly **15 different pictures** in exactly a **5 × 3 grid**. Mix B and non-B words.",
  "**Page 2.** Create a write-the-first-letter activity. Show exactly **6 different pictures** with a blank line under each picture. Include exactly **3 B pictures and 3 non-B pictures**.",
  "**Page 3.** Create a different activity from Pages 1 and 2. Show exactly **8 different pictures** and ask children to **match each picture to its beginning letter**.",
].join("\n\n");

describe("beginning-letter matching title semantics", () => {
  it("names the skill, not one letter, and keeps exact quantities", async () => {
    const request = applyPromptIntent({ ...defaultSpec, prompt, pages: "3", level: "Ages 4-5" });
    const project = finalizeWorksheetProject(await generateWorksheetProject(request), request);

    const write = project.pages[1]!;
    expect(write.activity.kind).toBe("word-complete");
    if (write.activity.kind === "word-complete") {
      expect(write.activity.items).toHaveLength(6);
      expect(write.activity.items.filter((i) => i.missingLetter === "b")).toHaveLength(3);
      expect(write.activity.items.filter((i) => i.missingLetter !== "b")).toHaveLength(3);
      expect(new Set(write.activity.items.map((i) => i.word)).size).toBe(6);
    }

    const match = project.pages[2]!;
    expect(match.activity.kind).toBe("picture-letter-match");
    if (match.activity.kind === "picture-letter-match") {
      expect(match.activity.pictures).toHaveLength(8);
      expect(new Set(match.activity.pictures.map((p) => p.word)).size).toBe(8);
      expect(match.activity.letterCards.length).toBeGreaterThan(1);
    }
    expect(match.title).toBe("Match Each Picture to Its Beginning Letter");
    expect(match.instruction).toMatch(/letter its name begins with/i);
  }, 30000);
});
