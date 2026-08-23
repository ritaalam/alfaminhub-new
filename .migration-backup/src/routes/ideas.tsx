import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy, Lightbulb, Loader2, Search, Sparkles, Wand2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { RichIdeaCard } from "@/components/ideas/RichIdeaCard";
import { cn } from "@/lib/utils";
import {
  difficulties,
  durations,
  generateIdeas,
  groupings,
  levels,
  skills,
  subjects,
  themes,
  type IdeaConstraints,
  type IdeaSpec,
} from "@/lib/ideas/engine";
import { enrichIdea, ideaPasses } from "@/lib/ideas/rich";
import { parseTeacherRequest, sanitizeConstraints } from "@/lib/ideas/nlp";
import { classroomChallenges, generalStrategies, matchChallenge } from "@/lib/ideas/challenges";
import { planIdeas } from "@/lib/ideas/ideas.functions";
import { useWorkspace } from "@/lib/workspace/store";

export const Route = createFileRoute("/ideas")({
  head: () => ({
    meta: [
      { title: "Ideas — Alfa Mind Hub Teacher Idea Studio" },
      {
        name: "description",
        content:
          "Describe what your students need and get practical, age-appropriate classroom activities with objectives, materials, differentiation and a printable you can create in one click.",
      },
      { property: "og:title", content: "Ideas — Alfa Mind Hub Teacher Idea Studio" },
      {
        property: "og:description",
        content:
          "Turn a learning need, a topic or a classroom challenge into ready-to-teach activities and printables.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IdeasPage,
});

/* ------------------------------------------------------------- options */

const goals = [
  "Introduce a concept",
  "Practice",
  "Review",
  "Assess",
  "Independent work",
  "Early finisher",
  "Homework",
  "Morning work",
  "Quiet time",
  "Learning center",
  "Group activity",
] as const;

const goalConstraints: Record<string, IdeaConstraints> = {
  "Introduce a concept": {
    difficulty: "Very Easy",
    intent: "first introduction one step modelling",
  },
  Practice: { difficulty: "Easy", intent: "repeat practise consolidate" },
  Review: { difficulty: "Standard", intent: "review recall mixed" },
  Assess: { grouping: "Individual", intent: "check understanding independent" },
  "Independent work": { grouping: "Individual", intent: "independent no help needed" },
  "Early finisher": { duration: "5 minutes", grouping: "Individual", intent: "extension no prep" },
  Homework: { grouping: "Individual", intent: "home family short" },
  "Morning work": {
    duration: "10 minutes",
    grouping: "Individual",
    intent: "calm independent start",
  },
  "Quiet time": { grouping: "Individual", intent: "quiet calm tracing colouring" },
  "Learning center": { grouping: "Small group", intent: "station rotation reusable" },
  "Group activity": { grouping: "Whole class", intent: "together game turn taking" },
};

const timeOptions = ["5 minutes", "10 minutes", "15 minutes", "20 minutes", "30+ minutes"] as const;
const prepOptions = ["No prep", "Low prep", "Any"] as const;

const libraryCategories: Array<{ label: string; constraints: IdeaConstraints }> = [
  { label: "Math", constraints: { subject: "Early Math" } },
  { label: "Literacy", constraints: { subject: "Early Literacy" } },
  { label: "Fine Motor", constraints: { subject: "Fine Motor" } },
  { label: "Science", constraints: { subject: "Science" } },
  { label: "Nature", constraints: { subject: "Nature" } },
  { label: "SEL", constraints: { subject: "SEL" } },
  { label: "Art", constraints: { subject: "Creative Thinking" } },
  { label: "Logic", constraints: { subject: "Problem Solving" } },
  {
    label: "Classroom Management",
    constraints: { duration: "5 minutes", intent: "transition settle routine" },
  },
  {
    label: "Early Finishers",
    constraints: { duration: "5 minutes", grouping: "Individual", intent: "extension no prep" },
  },
  {
    label: "Morning Work",
    constraints: { duration: "10 minutes", grouping: "Individual", intent: "calm start" },
  },
  { label: "Quiet Time", constraints: { grouping: "Individual", intent: "quiet calm tracing" } },
  {
    label: "Learning Centers",
    constraints: { grouping: "Small group", intent: "station rotation" },
  },
  { label: "Seasonal Activities", constraints: { subject: "Seasonal Learning" } },
];

const examples = [
  "My students confuse b and d.",
  "I need a quiet activity for 5-year-olds.",
  "Help children practice numbers 1–10.",
  "I need a 15-minute activity about butterflies.",
  "My class needs practice with fine motor skills.",
  "Give me an activity for children who finish their work early.",
  "I need something educational with almost no preparation.",
];

type Tab = "describe" | "need" | "challenge" | "library";

const tabs: Array<{ id: Tab; label: string; icon: typeof Sparkles }> = [
  { id: "describe", label: "Describe your need", icon: Sparkles },
  { id: "need", label: "I need an idea", icon: Lightbulb },
  { id: "challenge", label: "Classroom challenge", icon: LifeBuoy },
  { id: "library", label: "Idea library", icon: Search },
];

/* ---------------------------------------------------------------- page */

function IdeasPage() {
  const ws = useWorkspace();
  const [tab, setTab] = useState<Tab>("describe");
  const [classId, setClassId] = useState("");

  const [request, setRequest] = useState("");
  const [seed, setSeed] = useState(1);
  const [constraints, setConstraints] = useState<IdeaConstraints>({ level: "Ages 4–5" });
  const [notes, setNotes] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<string[]>([]);
  const [aiState, setAiState] = useState<"idle" | "loading" | "ai" | "local">("idle");
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [results, setResults] = useState<IdeaSpec[] | null>(null);
  const [overrides, setOverrides] = useState<Record<string, IdeaSpec>>({});

  const activeClass = ws.classes.find((c) => c.id === classId);

  const withClass = (c: IdeaConstraints): IdeaConstraints =>
    activeClass ? { level: activeClass.level, approach: activeClass.approach, ...c } : c;

  const compose = (c: IdeaConstraints, nextSeed = seed) =>
    generateIdeas(withClass(c), 6, nextSeed).filter((idea) => ideaPasses(enrichIdea(idea)));

  /* ------------------------------------------------ natural language run */
  const runRequest = async (text: string, mode: "ideas" | "challenge") => {
    const parsed = parseTeacherRequest(text);
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    setOverrides({});
    setConstraints(parsed.constraints);
    setNotes(parsed.notes);
    setAiMessage(null);

    // instant deterministic result first — the teacher never waits on AI
    setResults(compose(parsed.constraints, nextSeed));

    if (mode === "challenge") {
      const challenge = matchChallenge(text);
      setStrategies(challenge ? challenge.strategies : generalStrategies);
      if (challenge) {
        setResults(compose({ ...parsed.constraints, ...challenge.constraints }, nextSeed));
      }
    } else {
      setStrategies([]);
    }

    setAiState("loading");
    try {
      const res = await planIdeas({ data: { request: text.slice(0, 600), mode } });
      if (res.source === "ai" && res.plans.length) {
        const composed: IdeaSpec[] = [];
        res.plans.forEach((plan, i) => {
          const c = sanitizeConstraints(plan as unknown as Record<string, unknown>);
          const [idea] = generateIdeas(
            withClass({ ...parsed.constraints, ...c }),
            1,
            nextSeed + i * 7,
          );
          const signature = idea ? `${idea.objectiveId}:${idea.mechanicId}` : "";
          const duplicate = composed.some(
            (x) => `${x.objectiveId}:${x.mechanicId}` === signature || x.title === idea?.title,
          );
          if (idea && !duplicate && ideaPasses(enrichIdea(idea))) {
            composed.push(idea);
          }
        });
        if (composed.length >= 3) setResults(composed);
        if (res.strategies.length) setStrategies(res.strategies);
        setAiState("ai");
      } else {
        setAiState("local");
        setAiMessage(res.message ?? null);
      }
    } catch (error) {
      setAiState("local");
      setAiMessage(error instanceof Error ? error.message : "AI planning unavailable.");
    }
  };

  /* ----------------------------------------------------- structured run */
  const runConstraints = (c: IdeaConstraints) => {
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    setOverrides({});
    setConstraints(c);
    setNotes([]);
    setStrategies([]);
    setAiState("idle");
    setAiMessage(null);
    setResults(compose(c, nextSeed));
  };

  const ideas = (results ?? []).map((idea) => overrides[idea.id] ?? idea);

  const replaceIdea = (originalId: string, next: IdeaSpec) =>
    setOverrides((o) => ({ ...o, [originalId]: next }));

  const another = (index: number) => {
    const nextSeed = seed + 10 + index;
    setSeed(nextSeed);
    const pool = compose(constraints, nextSeed).filter(
      (i) => !ideas.some((existing) => existing.id === i.id),
    );
    const replacement = pool[0];
    const original = results?.[index];
    if (replacement && original) replaceIdea(original.id, replacement);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <header className="max-w-3xl space-y-2">
          <span className="inline-flex rounded-full bg-sage-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary-foreground">
            Teacher idea studio
          </span>
          <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            What would you like your students to learn today?
          </h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Describe a need, a topic, a difficulty — or nothing at all. Alfa turns it into
            practical, age-appropriate activities with a printable you can create in one click.
          </p>
        </header>

        {/* class context */}
        {ws.classes.length > 0 ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Plan for</span>
            <select
              aria-label="Class profile"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"
            >
              <option value="">No class selected</option>
              {ws.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.level}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* tabs */}
        <nav className="mt-6 flex flex-wrap gap-1.5" aria-label="Idea modes">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                tab === t.id
                  ? "border-sage bg-sage-soft text-secondary-foreground"
                  : "border-border text-muted-foreground hover:bg-cream hover:text-foreground",
              )}
            >
              <t.icon className="size-4" strokeWidth={1.8} /> {t.label}
            </button>
          ))}
        </nav>

        <section className="mt-5">
          {tab === "describe" ? (
            <DescribePanel
              value={request}
              onChange={setRequest}
              onSubmit={() => void runRequest(request, "ideas")}
              onSurprise={() => {
                const level = activeClass?.level ?? constraints.level ?? "Ages 4–5";
                runConstraints({ level, intent: "engaging hands-on age appropriate" });
              }}
              busy={aiState === "loading"}
            />
          ) : null}

          {tab === "need" ? (
            <NeedIdeaPanel
              initialLevel={activeClass?.level ?? "Ages 4–5"}
              onGenerate={runConstraints}
            />
          ) : null}

          {tab === "challenge" ? (
            <ChallengePanel
              value={request}
              onChange={setRequest}
              onSubmit={(text) => void runRequest(text, "challenge")}
              busy={aiState === "loading"}
            />
          ) : null}

          {tab === "library" ? <LibraryPanel onGenerate={runConstraints} /> : null}
        </section>

        {/* interpretation + AI state */}
        {(notes.length > 0 || aiState !== "idle") && tab !== "library" ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {aiState === "loading" ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} /> Alfa AI is refining
                these ideas…
              </span>
            ) : null}
            {aiState === "ai" ? <span>Refined by Alfa AI</span> : null}
            {aiState === "local" ? (
              <span>
                Instant ideas (AI planning unavailable{aiMessage ? `: ${aiMessage}` : ""})
              </span>
            ) : null}
            {notes.map((n) => (
              <span key={n} className="rounded-full bg-cream px-2.5 py-0.5">
                {n}
              </span>
            ))}
          </p>
        ) : null}

        {strategies.length > 0 ? (
          <section className="mt-6 rounded-3xl border border-border bg-cream/50 p-5">
            <h2 className="font-display text-lg text-foreground">
              Teaching strategies to try first
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {strategies.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              These are classroom strategies only. Alfa never diagnoses or labels a child.
            </p>
          </section>
        ) : null}

        {/* results */}
        {results ? (
          <section className="mt-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl text-foreground">
                {ideas.length} activity {ideas.length === 1 ? "idea" : "ideas"} for you
              </h2>
              <button
                type="button"
                onClick={() => runConstraints(constraints)}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-cream hover:text-foreground"
              >
                <Wand2 className="size-3.5" strokeWidth={1.8} /> Generate different ideas
              </button>
            </div>
            {ideas.length === 0 ? (
              <p className="surface-card p-8 text-center text-sm text-muted-foreground">
                No activity matched those constraints. Try a wider age range or fewer filters.
              </p>
            ) : (
              <ul className="grid gap-4 lg:grid-cols-2">
                {ideas.map((idea, index) => (
                  <li key={`${results[index]?.id ?? idea.id}`} className="contents">
                    <RichIdeaCard
                      idea={idea}
                      classId={classId || null}
                      onReplace={(next) => replaceIdea(results[index]?.id ?? idea.id, next)}
                      onAnother={() => another(index)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------- panels */

function DescribePanel({
  value,
  onChange,
  onSubmit,
  onSurprise,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSurprise: () => void;
  busy: boolean;
}) {
  return (
    <div className="surface-card p-5">
      <label htmlFor="idea-request" className="text-sm font-medium text-foreground">
        Tell Alfa what you need
      </label>
      <textarea
        id="idea-request"
        rows={3}
        value={value}
        maxLength={600}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Help my 4-year-olds practice counting to 10 using a fun spring activity."
        className="mt-2 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-sage"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || busy}
          className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
          ) : (
            <Sparkles className="size-4" strokeWidth={1.8} />
          )}
          Generate ideas
        </button>
        <button
          type="button"
          onClick={onSurprise}
          className="rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-cream hover:text-foreground"
        >
          Surprise me
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {examples.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-cream hover:text-foreground"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function NeedIdeaPanel({
  initialLevel,
  onGenerate,
}: {
  initialLevel: string;
  onGenerate: (c: IdeaConstraints) => void;
}) {
  const [level, setLevel] = useState(initialLevel);
  const [subject, setSubject] = useState("");
  const [goal, setGoal] = useState("");
  const [time, setTime] = useState("");
  const [prep, setPrep] = useState("Any");

  const submit = () => {
    const c: IdeaConstraints = { level };
    if (subject) {
      if (subjects.includes(subject)) c.subject = subject;
      else c.skill = subject;
    }
    if (goal) Object.assign(c, goalConstraints[goal] ?? {});
    if (time) c.duration = time === "30+ minutes" ? "20 minutes" : time;
    if (prep !== "Any") c.intent = `${c.intent ?? ""} ${prep.toLowerCase()}`.trim();
    onGenerate(c);
  };

  const group = (
    label: string,
    options: readonly string[],
    value: string,
    set: (v: string) => void,
  ) => (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => set(value === o ? "" : o)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              value === o
                ? "border-sage bg-sage-soft text-secondary-foreground"
                : "border-border text-muted-foreground hover:bg-cream hover:text-foreground",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );

  const subjectOptions = [
    "Early Math",
    "Early Literacy",
    "Phonics",
    "Reading",
    "Handwriting",
    "Science",
    "Nature",
    "Fine Motor",
    "SEL",
    "Creative Thinking",
    "Logic",
    "Problem Solving",
    "Vocabulary",
  ];

  return (
    <div className="surface-card space-y-4 p-5">
      {group("Age / grade", levels, level, (v) => setLevel(v || initialLevel))}
      {group("Subject", subjectOptions, subject, setSubject)}
      {group("Goal", goals, goal, setGoal)}
      {group("Time available", timeOptions, time, setTime)}
      {group("Preparation", prepOptions, prep, (v) => setPrep(v || "Any"))}
      <button
        type="button"
        onClick={submit}
        className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Lightbulb className="size-4" strokeWidth={1.8} /> Show me ideas
      </button>
    </div>
  );
}

function ChallengePanel({
  value,
  onChange,
  onSubmit,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text: string) => void;
  busy: boolean;
}) {
  return (
    <div className="surface-card p-5">
      <h2 className="font-display text-lg text-foreground">Help me solve a classroom challenge</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe what is happening in your classroom. Alfa answers with teaching strategies and
        practical activities — never with a diagnosis or a label for a child.
      </p>
      <textarea
        rows={3}
        value={value}
        maxLength={600}
        aria-label="Classroom challenge"
        onChange={(e) => onChange(e.target.value)}
        placeholder="Some children finish much earlier than others."
        className="mt-3 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-sage"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {classroomChallenges.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              onChange(c.label);
              onSubmit(c.label);
            }}
            className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-cream hover:text-foreground"
          >
            {c.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSubmit(value)}
        disabled={!value.trim() || busy}
        className="mt-3 flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
        ) : (
          <LifeBuoy className="size-4" strokeWidth={1.8} />
        )}
        Help me solve this
      </button>
    </div>
  );
}

function LibraryPanel({ onGenerate }: { onGenerate: (c: IdeaConstraints) => void }) {
  const [category, setCategory] = useState<string>("Math");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<IdeaConstraints>({ level: "Ages 4–5" });

  const constraints = useMemo(() => {
    const base = libraryCategories.find((c) => c.label === category)?.constraints ?? {};
    const merged: IdeaConstraints = {
      ...base,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    };
    if (query.trim()) merged.intent = `${merged.intent ?? ""} ${query.trim()}`.trim();
    return merged;
  }, [category, filters, query]);

  const select = (label: string, key: keyof IdeaConstraints, options: readonly string[]) => (
    <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
      {label}
      <select
        value={(filters[key] as string) ?? ""}
        onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground"
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="surface-card space-y-4 p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Category
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {libraryCategories.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setCategory(c.label)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                category === c.label
                  ? "border-sage bg-sage-soft text-secondary-foreground"
                  : "border-border text-muted-foreground hover:bg-cream hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {select("Age / grade", "level", levels)}
        {select("Subject", "subject", subjects)}
        {select("Skill", "skill", skills)}
        {select("Duration", "duration", durations)}
        {select("Difficulty", "difficulty", difficulties)}
        {select("Grouping", "grouping", groupings)}
        {select("Theme", "theme", themes)}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border px-3 py-2">
          <Search className="size-4 text-muted-foreground" strokeWidth={1.8} />
          <input
            value={query}
            aria-label="Search ideas"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ideas — tracing, sorting, life cycle…"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <button
          type="button"
          onClick={() => onGenerate(constraints)}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Browse ideas
        </button>
      </div>
    </div>
  );
}
