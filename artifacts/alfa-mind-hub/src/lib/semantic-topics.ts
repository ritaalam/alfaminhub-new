/**
 * Semantic topic layer.
 *
 * The generator must understand the *educational meaning* of what the teacher
 * typed instead of treating the word itself as a countable object.
 *
 *   "Space"   -> a THEME. Never "count the space".
 *                Concrete objects: stars, planets, rockets, moons…
 *   "Stars"   -> a concrete OBJECT. Counted directly.
 *   "Counting"-> a SKILL. Never counted.
 *   "Matching"-> an ACTIVITY type. Never counted.
 *   "Science" -> a SUBJECT. Never counted.
 *
 * Every theme therefore resolves to age-appropriate concrete objects, and the
 * validator rejects instructions that count a theme, skill, subject or
 * activity ("count the space", "circle the weather").
 */

/** Generic, original artwork keys — no licensed characters. */
export type VisualAssetKey =
  // geometric shapes
  | "circle"
  | "square"
  | "triangle"
  | "rectangle"
  // insects
  | "ladybug"
  | "bee"
  | "butterfly"
  | "ant"
  | "dragonfly"
  | "beetle"
  | "caterpillar"
  | "chrysalis"
  | "snail"
  // life-cycle stages (sequencing content, never generic counting props)
  | "tadpole"
  | "chick"
  | "seed"
  | "sprout"
  // space
  | "star"
  | "planet"
  | "rocket"
  | "moon"
  | "astronaut"
  | "comet"
  | "satellite"
  | "alien"
  // ocean
  | "fish"
  | "shell"
  | "starfish"
  | "crab"
  | "octopus"
  | "whale"
  | "dolphin"
  | "shark"
  | "jellyfish"
  | "seahorse"
  | "boat"
  // farm
  | "cow"
  | "calf"
  | "sheep"
  | "lamb"
  | "chicken"
  | "pig"
  | "piglet"
  | "horse"
  | "duck"
  | "tractor"
  | "carrot"
  | "apple"
  | "egg"
  | "banana"
  | "orange"
  | "strawberry"
  | "grapes"
  // jungle / animals
  | "lion"
  | "monkey"
  | "elephant"
  | "frog"
  | "turtle"
  | "bird"
  | "dinosaur"
  | "fossil"
  | "bear"
  | "cat"
  | "dog"
  | "rabbit"
  | "bone"
  | "fishBowl"
  // weather
  | "cloud"
  | "sun"
  | "raindrop"
  | "snowflake"
  | "umbrella"
  // transportation
  | "car"
  | "bus"
  | "train"
  | "airplane"
  | "bicycle"
  // nature & everyday
  | "tree"
  | "flower"
  | "leaf"
  | "mushroom"
  | "acorn"
  | "pencil"
  | "backpack"
  | "ruler"
  | "book"
  | "closedBook"
  | "ball"
  | "balloon"
  | "gift"
  | "squareTile"
  | "window"
  | "flag"
  | "triangularRoadSign"
  | "heart";

type ObjectEntry = {
  singular: string;
  plural: string;
  label: string;
  alias: RegExp;
};

/** Concrete, countable objects the renderer can draw. */
export const visualObjects: Record<VisualAssetKey, ObjectEntry> = {
  circle: { singular: "circle", plural: "circles", label: "Circles", alias: /\bcircles?\b/i },
  square: { singular: "square", plural: "squares", label: "Squares", alias: /\bsquares?\b/i },
  triangle: {
    singular: "triangle",
    plural: "triangles",
    label: "Triangles",
    alias: /\btriangles?\b/i,
  },
  rectangle: {
    singular: "rectangle",
    plural: "rectangles",
    label: "Rectangles",
    alias: /\brectangles?\b/i,
  },
  ladybug: {
    singular: "ladybug",
    plural: "ladybugs",
    label: "Ladybugs",
    alias: /ladybugs?|ladybirds?|coccinelle/i,
  },
  bee: { singular: "bee", plural: "bees", label: "Bees", alias: /\bbees?\b|bumblebees?|abeille/i },
  butterfly: {
    singular: "butterfly",
    plural: "butterflies",
    label: "Butterflies",
    alias: /butterfl(y|ies)|papillon|فراش/i,
  },
  ant: { singular: "ant", plural: "ants", label: "Ants", alias: /\bants?\b|fourmi/i },
  dragonfly: {
    singular: "dragonfly",
    plural: "dragonflies",
    label: "Dragonflies",
    alias: /dragonfl(y|ies)|libellule/i,
  },
  beetle: { singular: "beetle", plural: "beetles", label: "Beetles", alias: /beetles?|scarab/i },
  caterpillar: {
    singular: "caterpillar",
    plural: "caterpillars",
    label: "Caterpillars",
    alias: /caterpillars?|chenille/i,
  },
  snail: { singular: "snail", plural: "snails", label: "Snails", alias: /snails?|escargot/i },
  chrysalis: {
    singular: "chrysalis",
    plural: "chrysalises",
    label: "Chrysalises",
    alias: /chrysalis(es)?|chrysalides|cocoons?|pupas?|chrysalide/i,
  },
  tadpole: {
    singular: "tadpole",
    plural: "tadpoles",
    label: "Tadpoles",
    alias: /tadpoles?|têtards?|tetards?/i,
  },
  chick: { singular: "chick", plural: "chicks", label: "Chicks", alias: /\bchicks?\b|poussins?/i },
  seed: { singular: "seed", plural: "seeds", label: "Seeds", alias: /\bseeds?\b|graines?/i },
  sprout: {
    singular: "sprout",
    plural: "sprouts",
    label: "Sprouts",
    alias: /sprouts?|seedlings?|shoots?|pousses?/i,
  },

  star: {
    singular: "star",
    plural: "stars",
    label: "Stars",
    alias: /\bstars?\b|étoiles?|etoiles?/i,
  },
  planet: { singular: "planet", plural: "planets", label: "Planets", alias: /planets?|planètes?/i },
  rocket: {
    singular: "rocket",
    plural: "rockets",
    label: "Rockets",
    alias: /rockets?|spaceships?|fusée|fusee/i,
  },
  moon: { singular: "moon", plural: "moons", label: "Moons", alias: /moons?|lune/i },
  astronaut: {
    singular: "astronaut",
    plural: "astronauts",
    label: "Astronauts",
    alias: /astronauts?|cosmonauts?/i,
  },
  comet: {
    singular: "comet",
    plural: "comets",
    label: "Comets",
    alias: /comets?|shooting stars?/i,
  },
  satellite: {
    singular: "satellite",
    plural: "satellites",
    label: "Satellites",
    alias: /satellites?|space station/i,
  },
  alien: {
    singular: "friendly alien",
    plural: "friendly aliens",
    label: "Friendly Aliens",
    alias: /aliens?|extraterrestrials?/i,
  },

  fish: { singular: "fish", plural: "fish", label: "Fish", alias: /\bfish(es)?\b|poissons?/i },
  shell: {
    singular: "shell",
    plural: "shells",
    label: "Shells",
    alias: /shells?|seashells?|coquillage/i,
  },
  starfish: {
    singular: "starfish",
    plural: "starfish",
    label: "Starfish",
    alias: /starfish|sea stars?/i,
  },
  crab: { singular: "crab", plural: "crabs", label: "Crabs", alias: /crabs?/i },
  octopus: {
    singular: "octopus",
    plural: "octopuses",
    label: "Octopuses",
    alias: /octopus(es)?|pieuvre/i,
  },
  whale: { singular: "whale", plural: "whales", label: "Whales", alias: /whales?|baleine/i },
  dolphin: {
    singular: "dolphin",
    plural: "dolphins",
    label: "Dolphins",
    alias: /dolphins?|dauphin/i,
  },
  shark: { singular: "shark", plural: "sharks", label: "Sharks", alias: /sharks?|requin/i },
  jellyfish: {
    singular: "jellyfish",
    plural: "jellyfish",
    label: "Jellyfish",
    alias: /\bjellyfish\b|\bjelly\s+fish\b|\bmedusae?\b|\bméduse\b/i,
  },
  seahorse: {
    singular: "seahorse",
    plural: "seahorses",
    label: "Seahorses",
    alias: /seahorses?|hippocampe/i,
  },
  boat: {
    singular: "boat",
    plural: "boats",
    label: "Boats",
    alias: /boats?|ships?|sailboats?|bateau/i,
  },

  cow: { singular: "cow", plural: "cows", label: "Cows", alias: /cows?|vache/i },
  calf: { singular: "calf", plural: "calves", label: "Calves", alias: /calf|calves/i },
  sheep: { singular: "sheep", plural: "sheep", label: "Sheep", alias: /\bsheep\b|mouton/i },
  lamb: { singular: "lamb", plural: "lambs", label: "Lambs", alias: /\blambs?\b/i },
  chicken: {
    singular: "chicken",
    plural: "chickens",
    label: "Chickens",
    alias: /\bchickens?\b|\bhens?\b|poule/i,
  },
  pig: { singular: "pig", plural: "pigs", label: "Pigs", alias: /\bpigs?\b|cochon/i },
  piglet: { singular: "piglet", plural: "piglets", label: "Piglets", alias: /\bpiglets?\b/i },
  horse: { singular: "horse", plural: "horses", label: "Horses", alias: /\bhorses?\b|cheval|chevaux/i },
  duck: { singular: "duck", plural: "ducks", label: "Ducks", alias: /ducks?|canard/i },
  tractor: {
    singular: "tractor",
    plural: "tractors",
    label: "Tractors",
    alias: /\btractors?\b|tracteur/i,
  },
  carrot: { singular: "carrot", plural: "carrots", label: "Carrots", alias: /carrots?|carotte/i },
  apple: { singular: "apple", plural: "apples", label: "Apples", alias: /apples?|pomme/i },
  banana: { singular: "banana", plural: "bananas", label: "Bananas", alias: /bananas?|banane/i },
  orange: { singular: "orange", plural: "oranges", label: "Oranges", alias: /oranges?|orange fruit/i },
  strawberry: {
    singular: "strawberry",
    plural: "strawberries",
    label: "Strawberries",
    alias: /strawberr(y|ies)|fraise/i,
  },
  grapes: { singular: "grape", plural: "grapes", label: "Grapes", alias: /grapes?|raisin/i },
  egg: { singular: "egg", plural: "eggs", label: "Eggs", alias: /eggs?|oeufs?|œufs?/i },

  lion: { singular: "lion", plural: "lions", label: "Lions", alias: /lions?/i },
  monkey: { singular: "monkey", plural: "monkeys", label: "Monkeys", alias: /monkeys?|singe/i },
  elephant: {
    singular: "elephant",
    plural: "elephants",
    label: "Elephants",
    alias: /elephants?|éléphants?/i,
  },
  frog: { singular: "frog", plural: "frogs", label: "Frogs", alias: /frogs?|grenouille/i },
  turtle: {
    singular: "turtle",
    plural: "turtles",
    label: "Turtles",
    alias: /\bturtles?\b|\btortoises?\b|\btortues?\b/i,
  },
  bird: {
    singular: "bird",
    plural: "birds",
    label: "Birds",
    alias: /birds?|parrots?|oiseaux?|oiseau/i,
  },
  bear: { singular: "bear", plural: "bears", label: "Bears", alias: /\bbears?\b|\bours\b/i },
  cat: { singular: "cat", plural: "cats", label: "Cats", alias: /\bcats?\b|kittens?|chat/i },
  dinosaur: {
    singular: "dinosaur",
    plural: "dinosaurs",
    label: "Dinosaurs",
    alias: /dinosaurs?|dinos?|t-?rex/i,
  },
  fossil: { singular: "fossil", plural: "fossils", label: "Fossils", alias: /fossils?/i },
  dog: { singular: "dog", plural: "dogs", label: "Dogs", alias: /\bdogs?\b|puppies?/i },
  rabbit: {
    singular: "rabbit",
    plural: "rabbits",
    label: "Rabbits",
    alias: /\brabbits?\b|bunnies?/i,
  },
  bone: { singular: "bone", plural: "bones", label: "Bones", alias: /\bbones?\b/i },
  fishBowl: {
    singular: "fish bowl",
    plural: "fish bowls",
    label: "Fish Bowls",
    alias: /\bfish ?bowls?\b/i,
  },

  cloud: { singular: "cloud", plural: "clouds", label: "Clouds", alias: /clouds?|nuage/i },
  sun: { singular: "sun", plural: "suns", label: "Suns", alias: /\bsuns?\b|soleil/i },
  raindrop: {
    singular: "raindrop",
    plural: "raindrops",
    label: "Raindrops",
    alias: /rain ?drops?|\brain\b|gouttes?/i,
  },
  snowflake: {
    singular: "snowflake",
    plural: "snowflakes",
    label: "Snowflakes",
    alias: /snow ?flakes?|\bsnow\b|flocons?/i,
  },
  umbrella: {
    singular: "umbrella",
    plural: "umbrellas",
    label: "Umbrellas",
    alias: /umbrellas?|parapluie/i,
  },

  car: { singular: "car", plural: "cars", label: "Cars", alias: /\bcars?\b|voiture/i },
  bus: { singular: "bus", plural: "buses", label: "Buses", alias: /buses|\bbus\b|autobus/i },
  train: { singular: "train", plural: "trains", label: "Trains", alias: /trains?/i },
  airplane: {
    singular: "airplane",
    plural: "airplanes",
    label: "Airplanes",
    alias: /air ?planes?|aeroplanes?|planes?|jets?|avion/i,
  },
  bicycle: {
    singular: "bicycle",
    plural: "bicycles",
    label: "Bicycles",
    alias: /bicycles?|bikes?|vélo|velo/i,
  },

  tree: { singular: "tree", plural: "trees", label: "Trees", alias: /trees?|arbre/i },
  flower: {
    singular: "flower",
    plural: "flowers",
    label: "Flowers",
    alias: /flowers?|fleurs?|tulips?|daisies|daisy/i,
  },
  leaf: { singular: "leaf", plural: "leaves", label: "Leaves", alias: /leaf|leaves|feuilles?/i },
  mushroom: {
    singular: "mushroom",
    plural: "mushrooms",
    label: "Mushrooms",
    alias: /mushrooms?|champignon/i,
  },
  acorn: { singular: "acorn", plural: "acorns", label: "Acorns", alias: /acorns?|gland/i },
  pencil: { singular: "pencil", plural: "pencils", label: "Pencils", alias: /pencils?|crayons?/i },
  backpack: {
    singular: "backpack",
    plural: "backpacks",
    label: "Backpacks",
    alias: /backpacks?|school bags?|schoolbags?|sacs? à dos/i,
  },
  ruler: { singular: "ruler", plural: "rulers", label: "Rulers", alias: /rulers?|measuring sticks?/i },
  book: { singular: "book", plural: "books", label: "Books", alias: /books?|livre/i },
  closedBook: {
    singular: "closed rectangular book",
    plural: "closed rectangular books",
    label: "Closed Books",
    alias: /closed (?:rectangular )?books?/i,
  },
  ball: { singular: "ball", plural: "balls", label: "Balls", alias: /balls?|ballon de sport/i },
  balloon: {
    singular: "balloon",
    plural: "balloons",
    label: "Balloons",
    alias: /balloons?|ballons?/i,
  },
  gift: {
    singular: "gift box",
    plural: "gift boxes",
    label: "Gift Boxes",
    alias: /\bgift ?box(?:es)?\b|\bpresents?\b|\bgifts?\b|\bblocks?\b/i,
  },
  squareTile: {
    singular: "square tile",
    plural: "square tiles",
    label: "Square Tiles",
    alias: /square tiles?/i,
  },
  window: {
    singular: "window",
    plural: "windows",
    label: "Windows",
    alias: /windows?|fenêtres?|fenetres?/i,
  },
  flag: {
    singular: "triangular flag",
    plural: "triangular flags",
    label: "Triangular Flags",
    alias: /triangular flags?|pennants?/i,
  },
  triangularRoadSign: {
    singular: "triangular road sign",
    plural: "triangular road signs",
    label: "Triangular Road Signs",
    alias: /triangular (?:road )?signs?/i,
  },
  heart: { singular: "heart", plural: "hearts", label: "Hearts", alias: /hearts?|coeurs?|cœurs?/i },
};

export const visualAssetKeys = Object.keys(visualObjects) as VisualAssetKey[];

export const visualAssetLabels = Object.fromEntries(
  visualAssetKeys.map((k) => [k, visualObjects[k].label]),
) as Record<VisualAssetKey, string>;

export type ThemeTopic = {
  id: string;
  /** title-case name used in worksheet titles, e.g. "Space Objects" */
  title: string;
  /** child-facing plural used in instructions, e.g. "space objects" */
  plural: string;
  /** concrete, drawable objects that belong to this theme */
  objects: VisualAssetKey[];
  alias: RegExp;
};

/**
 * Themes are categories, never countable objects. Each one resolves to
 * concrete objects a child can actually count, sort, match or trace.
 */
export const themeTopics: ThemeTopic[] = [
  {
    id: "shapes",
    title: "Shapes",
    plural: "shapes",
    objects: ["circle", "square", "triangle", "rectangle"],
    alias: /\bshapes?|geometry|geometric\b/i,
  },
  {
    id: "space",
    title: "Space Objects",
    plural: "space objects",
    objects: ["star", "sun", "planet", "rocket", "moon", "astronaut", "comet", "satellite", "alien"],
    alias: /space|solar system|galaxy|universe|outer ?space|astronomy|espace/i,
  },
  {
    id: "ocean",
    title: "Sea Creatures",
    plural: "sea creatures",
    objects: [
      "fish",
      "shell",
      "starfish",
      "crab",
      "octopus",
      "turtle",
      "whale",
      "dolphin",
      "shark",
      "jellyfish",
      "seahorse",
      "boat",
    ],
    alias: /ocean|\bsea\b|under ?water|marine|seaside|beach|mer\b/i,
  },
  {
    id: "farm",
    title: "Farm Things",
    plural: "farm pictures",
    objects: [
      "cow",
      "sheep",
      "chicken",
      "pig",
      "calf",
      "lamb",
      "chick",
      "piglet",
      "horse",
      "duck",
      "tractor",
      "carrot",
      "apple",
      "egg",
    ],
    alias: /farm|barn|ferme|countryside|harvest/i,
  },
  {
    id: "jungle",
    title: "Jungle Animals",
    plural: "jungle animals",
    objects: ["lion", "monkey", "elephant", "frog", "turtle", "bird"],
    alias: /jungle|safari|rain ?forest|zoo|wild animals/i,
  },
  {
    id: "animals",
    title: "Animals",
    plural: "animals",
    objects: ["cow", "sheep", "frog", "turtle", "bird", "elephant", "lion"],
    alias: /animals?|animaux/i,
  },
  {
    id: "dinosaurs",
    title: "Dinosaurs",
    plural: "dinosaurs",
    objects: ["dinosaur", "egg", "fossil", "tree", "leaf"],
    alias: /dinosaurs?|dino|prehistoric/i,
  },
  {
    id: "weather",
    title: "Weather Pictures",
    plural: "weather pictures",
    objects: ["cloud", "sun", "raindrop", "snowflake", "umbrella"],
    alias: /weather|météo|meteo|climate|rainy day/i,
  },
  {
    id: "seasons",
    title: "Season Pictures",
    plural: "season pictures",
    objects: ["leaf", "snowflake", "flower", "sun", "acorn", "cloud"],
    alias: /seasons?|autumn|fall\b|winter|spring|summer/i,
  },
  {
    id: "transportation",
    title: "Vehicles",
    plural: "vehicles",
    objects: ["car", "bus", "train", "airplane", "bicycle", "boat"],
    alias: /transport(ation)?|vehicles?|traffic|travel/i,
  },
  {
    id: "insects",
    title: "Insects",
    plural: "insects",
    objects: ["ladybug", "bee", "butterfly", "ant", "dragonfly", "beetle", "caterpillar"],
    alias: /insects?|bugs?|minibeasts?|insectes?/i,
  },
  {
    id: "nature",
    title: "Nature Objects",
    plural: "nature objects",
    objects: ["tree", "flower", "leaf", "mushroom", "acorn", "butterfly"],
    alias: /nature|woodland|forest|garden|jardin/i,
  },
  {
    id: "flowers",
    title: "Flowers",
    plural: "flowers",
    objects: ["flower", "butterfly", "bee", "leaf"],
    alias: /flowers?|blossom|floral/i,
  },
  {
    id: "school",
    title: "School Objects",
    plural: "school objects",
    objects: ["pencil", "book", "backpack", "ruler"],
    alias: /school|classroom|back to school|école|ecole/i,
  },
  {
    id: "celebrations",
    title: "Party Pictures",
    plural: "party pictures",
    objects: ["balloon", "heart", "star", "ball", "egg"],
    alias: /christmas|easter|birthday|party|holiday|celebration|valentine/i,
  },
  {
    id: "food",
    title: "Food Pictures",
    plural: "food pictures",
    objects: ["apple", "banana", "orange", "strawberry", "grapes", "carrot", "egg", "mushroom"],
    alias: /food|fruits?|vegetables?|healthy eating|snack/i,
  },
  {
    id: "emotions",
    title: "Feeling Pictures",
    plural: "feeling pictures",
    objects: ["heart", "sun", "star", "cloud", "flower"],
    alias: /emotions?|feelings?|sel\b|kindness|mood/i,
  },
  {
    id: "science",
    title: "Science Objects",
    plural: "science objects",
    objects: ["leaf", "tree", "raindrop", "sun", "star", "mushroom"],
    alias: /science|stem|biology|experiment/i,
  },
];

const fallbackTopic: ThemeTopic = themeTopics.find((t) => t.id === "insects")!;

/**
 * Words that are categories, not countable objects. Counting them produces
 * educationally meaningless instructions ("count the space").
 */
export const abstractConcepts: Array<{ word: RegExp; kind: ConceptKind }> = [
  {
    word: /space|weather|nature|transportation|transport|science|geography|history|music|art|math(s|ematics)?|literacy|seasons?|emotions?|feelings?|technology|culture|health|safety|environment|ocean|jungle|farm|school|holidays?|celebrations?|christmas|easter|food|shapes|colou?rs|sounds|senses/i,
    kind: "theme",
  },
  {
    word: /counting|addition|subtraction|phonics|alphabet|vocabulary|reading|writing|handwriting|pre-?writing|logic|patterns|sorting|sequencing|problem solving|fine motor|visual discrimination|creativity|number recognition/i,
    kind: "skill",
  },
  {
    word: /worksheet|tracing|matching|maze|cut & paste|cut and paste|i spy|bingo|flashcards|colou?ring|puzzle|mini book|scissor skills|find the difference|connect the dots/i,
    kind: "activity",
  },
];

export type ConceptKind = "object" | "theme" | "skill" | "activity" | "subject" | "unknown";

/** Classifies a single concept word/phrase before it is used in content. */
export function classifyConcept(value: string): ConceptKind {
  const text = (value ?? "").trim();
  if (!text) return "unknown";
  if (visualAssetKeys.some((k) => visualObjects[k].alias.test(text))) return "object";
  for (const entry of abstractConcepts) {
    if (entry.word.test(text)) return entry.kind;
  }
  if (themeTopics.some((t) => t.alias.test(text))) return "theme";
  return "unknown";
}

/** True when the phrase must never be used as a countable noun. */
export function isAbstractConcept(value: string) {
  const kind = classifyConcept(value);
  return kind === "theme" || kind === "skill" || kind === "activity" || kind === "subject";
}

/** Concrete objects named inside free text, in the order they appear. */
export function matchObjects(text: string): VisualAssetKey[] {
  if (!text?.trim()) return [];
  // "circle" is both a drawable shape and the most common worksheet verb.
  // Strip imperative uses before asset matching, while preserving noun uses
  // such as "find all the circles among the squares".
  const objectText = text.replace(
    /\bcircle\s+(?=all\b|the\b|each\b|every\b|pictures?\b|correct\b|numbers?\b|answers?\b)/gi,
    "",
  );
  const found: VisualAssetKey[] = [];
  for (const key of visualAssetKeys) {
    if (visualObjects[key].alias.test(objectText) && !found.includes(key)) found.push(key);
  }
  return found;
}

/** The theme a free-text phrase belongs to, if any. */
export function matchTheme(text: string): ThemeTopic | undefined {
  if (!text?.trim()) return undefined;
  return themeTopics.find((t) => t.alias.test(text));
}

/**
 * Picks the closest existing original illustration for a teacher word that is
 * not yet in Alfa's drawing registry. The requested word remains the worksheet
 * subject; this only prevents an unavailable illustration from blocking a
 * printable activity or falling back to an unrelated default theme.
 */
export function closestVisualAssetFor(text: string): VisualAssetKey {
  const known = matchObjects(text)[0];
  if (known) return known;
  const topic = matchTheme(text);
  if (topic) return topic.objects[0]!;

  const phrase = (text ?? "").toLowerCase();
  const nearest: Array<{ test: RegExp; asset: VisualAssetKey }> = [
    { test: /dolphin|shark|jellyfish|seahorse|seal|sea lion|marine|ocean|sea\b|underwater/, asset: "fish" },
    { test: /dinosaur|dino|prehistoric|fossil/, asset: "dinosaur" },
    { test: /fruit|berry|grape|orange|pear|peach|watermelon|food|snack/, asset: "apple" },
    { test: /space|galaxy|solar|planet|alien|astronaut|moon|rocket/, asset: "star" },
    { test: /school|classroom|stationery|pen|marker|crayon|eraser|notebook/, asset: "pencil" },
    { test: /flower|floral|blossom|plant|garden|rose|tulip/, asset: "flower" },
    { test: /vehicle|transport|truck|car|bus|train|bike|bicycle|airplane|plane/, asset: "car" },
    { test: /insect|bug|bee|butterfly|ladybug|beetle/, asset: "butterfly" },
    { test: /animal|pet|puppy|kitten|unicorn|horse|zebra|giraffe|lion|tiger/, asset: "turtle" },
    { test: /tree|leaf|woodland|forest|nature/, asset: "tree" },
  ];
  return nearest.find((entry) => entry.test.test(phrase))?.asset ?? "star";
}

export function defaultTopic() {
  return fallbackTopic;
}

/**
 * COUNTABLE CATEGORIES
 * --------------------
 * Some category words ARE countable nouns because their members are concrete
 * objects a child can point at: "Count the insects" is perfectly valid when
 * the page draws butterflies, bees and ladybugs.
 *
 * Non-countable themes ("space", "ocean", "weather", "farm") are NOT listed
 * here: they are places/concepts, so "count the ocean" stays invalid while
 * their collective form ("space objects", "sea creatures", "farm pictures")
 * is listed and validated against the rendered artwork.
 */
export type CountableCategory = {
  id: string;
  /** matches the whole noun phrase used in the instruction */
  alias: RegExp;
  members: VisualAssetKey[];
};

export const countableCategories: CountableCategory[] = [
  {
    id: "insects",
    alias: /^(insects?|bugs?|minibeasts?|insectes?)$/i,
    members: ["ladybug", "bee", "butterfly", "ant", "dragonfly", "beetle", "caterpillar", "snail"],
  },
  {
    id: "animals",
    alias: /^(animals?|animaux|creatures?)$/i,
    members: [
      "cow",
      "sheep",
      "chicken",
      "pig",
      "lion",
      "monkey",
      "elephant",
      "frog",
      "turtle",
      "bird",
      "dinosaur",
      "whale",
      "dolphin",
      "shark",
      "crab",
      "octopus",
      "fish",
      "starfish",
      "snail",
    ],
  },
  {
    id: "farm-animals",
    alias: /^(farm animals?)$/i,
    members: ["cow", "sheep", "chicken", "pig", "horse", "duck"],
  },
  {
    id: "jungle-animals",
    alias: /^(jungle animals?|safari animals?|wild animals?)$/i,
    members: ["lion", "monkey", "elephant", "frog", "turtle", "bird"],
  },
  {
    id: "sea-creatures",
    alias: /^(sea creatures?|ocean animals?|sea animals?)$/i,
    members: [
      "fish",
      "starfish",
      "crab",
      "octopus",
      "turtle",
      "whale",
      "dolphin",
      "shark",
      "jellyfish",
      "seahorse",
      "shell",
    ],
  },
  {
    id: "fruits",
    alias: /^(fruits?|fruit pictures?)$/i,
    members: ["apple", "banana", "orange", "strawberry", "grapes"],
  },
  {
    id: "vegetables",
    alias: /^(vegetables?|veggies)$/i,
    members: ["carrot", "mushroom"],
  },
  {
    id: "food",
    alias: /^(food|food pictures?|snacks?)$/i,
    members: ["apple", "banana", "orange", "strawberry", "grapes", "carrot", "egg", "mushroom"],
  },
  {
    id: "space-objects",
    alias: /^(space objects?|space pictures?)$/i,
    members: ["star", "planet", "rocket", "moon", "astronaut", "comet", "satellite", "alien"],
  },
  {
    id: "vehicles",
    alias: /^(vehicles?|cars? and trucks?|transport pictures?)$/i,
    members: ["car", "bus", "train", "airplane", "bicycle", "boat"],
  },
  {
    id: "weather-pictures",
    alias: /^(weather pictures?|weather objects?)$/i,
    members: ["cloud", "sun", "raindrop", "snowflake", "umbrella"],
  },
  {
    id: "farm-pictures",
    alias: /^(farm pictures?|farm things?|farm objects?)$/i,
    members: ["cow", "sheep", "chicken", "pig", "tractor", "carrot", "apple", "egg"],
  },
  {
    id: "season-pictures",
    alias: /^(season pictures?|seasonal pictures?)$/i,
    members: ["leaf", "snowflake", "flower", "sun", "acorn", "cloud"],
  },
  {
    id: "nature-objects",
    alias: /^(nature objects?|nature pictures?)$/i,
    members: ["tree", "flower", "leaf", "mushroom", "acorn", "butterfly"],
  },
  {
    id: "school-objects",
    alias: /^(school objects?|school pictures?|classroom objects?)$/i,
    members: ["pencil", "book", "backpack", "ruler"],
  },
  {
    id: "party-pictures",
    alias: /^(party pictures?|celebration pictures?)$/i,
    members: ["balloon", "heart", "star", "ball", "egg"],
  },
  {
    id: "science-objects",
    alias: /^(science objects?|science pictures?)$/i,
    members: ["leaf", "tree", "raindrop", "sun", "star", "mushroom"],
  },
  {
    id: "flowers",
    alias: /^(flowers?|blossoms?)$/i,
    members: ["flower"],
  },
  {
    id: "shapes",
    alias: /^(shapes?|pictures?|objects?|things?|items?)$/i,
    members: visualAssetKeys,
  },
];

/** The countable category a noun phrase names, if any. */
export function matchCountableCategory(noun: string): CountableCategory | undefined {
  const text = (noun ?? "").trim();
  if (!text) return undefined;
  return countableCategories.find((c) => c.alias.test(text));
}

/**
 * True when a category word is used correctly: it names a countable category
 * AND every object actually rendered on the page is a member of it.
 */
export function categoryCoversAssets(noun: string, assets: VisualAssetKey[]) {
  const category = matchCountableCategory(noun);
  if (!category) return false;
  if (!assets.length) return false;
  return assets.every((a) => category.members.includes(a));
}
