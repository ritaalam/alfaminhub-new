import { relatedIdeas, type IdeaSpec } from "@/lib/ideas/engine";
import { IdeaCard } from "./IdeaCard";

type Props = {
  source: { skill?: string; theme?: string; level?: string; objectiveId?: string };
  title?: string;
  count?: number;
};

/**
 * "You might create next…" — complementary objectives derived from the idea
 * engine, never a duplicate of the worksheet the teacher just saved.
 */
export function RelatedIdeas({ source, title = "You might create next…", count = 4 }: Props) {
  const ideas: IdeaSpec[] = relatedIdeas(source, count);
  if (ideas.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl text-foreground">{title}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ideas.map((idea) => (
          <li key={idea.id} className="contents">
            <IdeaCard idea={idea} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
