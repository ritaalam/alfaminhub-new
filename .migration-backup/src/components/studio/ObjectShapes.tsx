import type { PrintPalette, VisualAssetKey } from "@/lib/worksheet-model";

type Ctx = {
  palette: PrintPalette;
  stroke: string;
  common: {
    stroke: string;
    strokeWidth: number;
    strokeLinecap: "round";
    strokeLinejoin: "round";
  };
};

/**
 * Original, generic line-art for every non-insect object the semantic topic
 * layer can pick (space, ocean, farm, jungle, weather, transport, nature…).
 * Everything is drawn from the palette, so the same shapes work in premium
 * colour, soft colour, ink-saving and pure black & white.
 */
export function objectShapes({
  palette,
  stroke,
  common,
}: Ctx): Record<
  Exclude<
    VisualAssetKey,
    | "ladybug"
    | "bee"
    | "butterfly"
    | "ant"
    | "dragonfly"
    | "beetle"
    | "caterpillar"
    | "snail"
    | "chrysalis"
  >,
  React.ReactNode
> {
  const fillA = palette.wing;
  const fillB = palette.accentSoft;
  const fillC = palette.surface;
  const fillD = palette.wingAlt;

  return {
    circle: <circle cx="50" cy="50" r="30" fill={fillA} {...common} />,
    square: <rect x="20" y="20" width="60" height="60" rx="2" fill={fillB} {...common} />,
    triangle: <path d="M50 16L86 80H14z" fill={fillD} {...common} />,
    rectangle: <rect x="12" y="28" width="76" height="44" rx="2" fill={fillC} {...common} />,
    tadpole: (
      <>
        <circle cx="40" cy="52" r="18" fill={fillA} {...common} />
        <path d="M56 46c12-8 22-12 28-10-6 8-6 24 0 32-6 2-16-2-28-10z" fill={fillD} {...common} />
        <circle cx="34" cy="46" r="3.2" fill={stroke} stroke="none" />
      </>
    ),
    chick: (
      <>
        <circle cx="50" cy="56" r="22" fill={fillD} {...common} />
        <circle cx="50" cy="30" r="13" fill={fillD} {...common} />
        <path d="M50 24v-6" fill="none" {...common} />
        <path d="M62 30l10 4-10 4z" fill={palette.accent} stroke="none" />
        <circle cx="46" cy="28" r="2.6" fill={stroke} stroke="none" />
        <path d="M42 78l-4 8M58 78l4 8" fill="none" {...common} />
      </>
    ),
    seed: (
      <>
        <ellipse
          cx="50"
          cy="54"
          rx="16"
          ry="22"
          fill={fillD}
          {...common}
          transform="rotate(-12 50 54)"
        />
        <path d="M44 44c4 8 6 16 6 24" fill="none" {...common} />
      </>
    ),
    sprout: (
      <>
        <path d="M50 84V44" fill="none" {...common} />
        <path d="M50 54C36 54 28 46 28 34c14 0 22 8 22 20z" fill={fillA} {...common} />
        <path d="M50 60c14 0 22-8 22-20-14 0-22 8-22 20z" fill={fillA} {...common} />
        <path d="M30 84h40" fill="none" {...common} />
      </>
    ),
    star: (
      <path
        d="M50 16l10 22 24 3-17 17 4 24-21-11-21 11 4-24-17-17 24-3z"
        fill={fillD}
        {...common}
      />
    ),
    planet: (
      <>
        <circle cx="50" cy="50" r="24" fill={fillA} {...common} />
        <ellipse
          cx="50"
          cy="54"
          rx="40"
          ry="10"
          fill="none"
          {...common}
          transform="rotate(-18 50 54)"
        />
        <circle cx="42" cy="42" r="5" fill={fillC} {...common} />
      </>
    ),
    rocket: (
      <>
        <path d="M50 12c12 12 16 28 16 44H34c0-16 4-32 16-44z" fill={fillC} {...common} />
        <circle cx="50" cy="40" r="7" fill={fillB} {...common} />
        <path d="M34 46L20 62l14 4M66 46l14 16-14 4" fill={fillA} {...common} />
        <path d="M42 56h16l-4 12h-8z" fill={fillD} {...common} />
      </>
    ),
    moon: <path d="M62 18a34 34 0 1 0 20 46A28 28 0 0 1 62 18z" fill={fillD} {...common} />,
    astronaut: (
      <>
        <circle cx="50" cy="34" r="18" fill={fillC} {...common} />
        <path d="M38 32a12 12 0 0 1 22-6" fill="none" {...common} />
        <rect x="32" y="52" width="36" height="30" rx="10" fill={fillA} {...common} />
        <path d="M32 60H20v14M68 60h12v14" fill="none" {...common} />
      </>
    ),
    comet: (
      <>
        <circle cx="64" cy="38" r="14" fill={fillD} {...common} />
        <path d="M52 46L18 76M56 54L26 82M46 40L14 62" fill="none" {...common} />
      </>
    ),
    fish: (
      <>
        <path d="M18 54c14-18 40-18 54 0-14 18-40 18-54 0z" fill={fillA} {...common} />
        <path d="M72 54l14-12v24z" fill={fillB} {...common} />
        <circle cx="34" cy="50" r="3" fill={stroke} stroke="none" />
        <path d="M48 40v28" fill="none" {...common} />
      </>
    ),
    shell: (
      <>
        <path d="M20 72h60c0-24-14-42-30-42S20 48 20 72z" fill={fillB} {...common} />
        <path d="M50 30v42M36 34l-6 38M64 34l6 38" fill="none" {...common} />
      </>
    ),
    starfish: (
      <>
        <path
          d="M50 16l12 26 28 4-20 19 5 27-25-13-25 13 5-27-20-19 28-4z"
          fill={fillD}
          {...common}
        />
        <circle cx="50" cy="52" r="4" fill={stroke} stroke="none" />
      </>
    ),
    crab: (
      <>
        <ellipse cx="50" cy="56" rx="24" ry="16" fill={fillB} {...common} />
        <circle cx="42" cy="52" r="3" fill={stroke} stroke="none" />
        <circle cx="58" cy="52" r="3" fill={stroke} stroke="none" />
        <path d="M26 48L14 36l10-4M74 48l12-12-10-4" fill="none" {...common} />
        <path d="M30 70l-10 10M50 72v12M70 70l10 10" fill="none" {...common} />
      </>
    ),
    octopus: (
      <>
        <path d="M26 56a24 24 0 0 1 48 0v10H26z" fill={fillA} {...common} />
        <circle cx="42" cy="50" r="3" fill={stroke} stroke="none" />
        <circle cx="58" cy="50" r="3" fill={stroke} stroke="none" />
        <path
          d="M28 66c-2 10-8 12-12 16M42 66c-2 10-4 14-4 18M58 66c2 10 4 14 4 18M72 66c2 10 8 12 12 16"
          fill="none"
          {...common}
        />
      </>
    ),
    whale: (
      <>
        <path
          d="M16 56c8-16 34-22 52-12 8 4 12 10 16 12-8 12-24 20-40 18-18-2-28-10-28-18z"
          fill={fillA}
          {...common}
        />
        <circle cx="36" cy="52" r="3" fill={stroke} stroke="none" />
        <path d="M60 26c4 6 4 10 2 14" fill="none" {...common} />
      </>
    ),
    boat: (
      <>
        <path d="M16 66h68l-10 16H26z" fill={fillA} {...common} />
        <path d="M50 62V16l24 46z" fill={fillC} {...common} />
        <path d="M46 62V28L26 62z" fill={fillB} {...common} />
      </>
    ),
    cow: (
      <>
        <ellipse cx="52" cy="52" rx="28" ry="20" fill={fillC} {...common} />
        <circle cx="40" cy="46" r="6" fill={fillA} {...common} />
        <circle cx="62" cy="58" r="5" fill={fillA} {...common} />
        <path d="M32 70v12M48 72v10M64 72v10M76 68v14" fill="none" {...common} />
        <circle cx="80" cy="40" r="10" fill={fillD} {...common} />
        <circle cx="78" cy="38" r="2.4" fill={stroke} stroke="none" />
      </>
    ),
    calf: (
      <>
        <ellipse cx="50" cy="56" rx="23" ry="16" fill={fillC} {...common} />
        <circle cx="39" cy="51" r="5" fill={fillA} {...common} />
        <path d="M33 70v10M47 71v9M61 70v10" fill="none" {...common} />
        <circle cx="72" cy="45" r="9" fill={fillD} {...common} />
        <circle cx="75" cy="43" r="2.2" fill={stroke} stroke="none" />
      </>
    ),
    sheep: (
      <>
        <circle cx="44" cy="50" r="12" fill={fillC} {...common} />
        <circle cx="60" cy="46" r="12" fill={fillC} {...common} />
        <circle cx="54" cy="60" r="13" fill={fillC} {...common} />
        <circle cx="76" cy="52" r="9" fill={fillD} {...common} />
        <circle cx="78" cy="50" r="2.2" fill={stroke} stroke="none" />
        <path d="M44 72v10M62 72v10" fill="none" {...common} />
      </>
    ),
    lamb: (
      <>
        <circle cx="42" cy="54" r="10" fill={fillC} {...common} />
        <circle cx="56" cy="51" r="10" fill={fillC} {...common} />
        <circle cx="70" cy="53" r="8" fill={fillD} {...common} />
        <circle cx="72" cy="51" r="2" fill={stroke} stroke="none" />
        <path d="M42 68v11M58 68v11" fill="none" {...common} />
      </>
    ),
    chicken: (
      <>
        <ellipse cx="48" cy="58" rx="20" ry="18" fill={fillC} {...common} />
        <circle cx="66" cy="40" r="11" fill={fillC} {...common} />
        <path d="M64 28c2-6 8-6 8 0" fill={fillB} {...common} />
        <path d="M76 40l8 4-8 4z" fill={fillD} {...common} />
        <circle cx="68" cy="38" r="2.2" fill={stroke} stroke="none" />
        <path d="M42 76v8M56 76v8" fill="none" {...common} />
      </>
    ),
    pig: (
      <>
        <ellipse cx="50" cy="54" rx="26" ry="19" fill={fillB} {...common} />
        <circle cx="72" cy="54" r="8" fill={fillD} {...common} />
        <circle cx="70" cy="52" r="1.8" fill={stroke} stroke="none" />
        <circle cx="74" cy="56" r="1.8" fill={stroke} stroke="none" />
        <path d="M34 38l-4-10 12 4M60 38l6-10 6 8" fill={fillB} {...common} />
        <path d="M36 72v10M52 74v8M66 72v10" fill="none" {...common} />
      </>
    ),
    piglet: (
      <>
        <ellipse cx="48" cy="58" rx="22" ry="16" fill={fillB} {...common} />
        <circle cx="68" cy="57" r="7" fill={fillD} {...common} />
        <circle cx="66" cy="55" r="1.6" fill={stroke} stroke="none" />
        <path d="M34 72v9M50 73v8M62 71v10" fill="none" {...common} />
      </>
    ),
    tractor: (
      <>
        <path d="M28 56V38h20l8 18z" fill={fillC} {...common} />
        <path d="M20 56h58v12H20z" fill={fillA} {...common} />
        <circle cx="32" cy="72" r="12" fill={fillD} {...common} />
        <circle cx="70" cy="74" r="8" fill={fillD} {...common} />
      </>
    ),
    carrot: (
      <>
        <path d="M50 84L34 42c10-6 22-6 32 0z" fill={fillB} {...common} />
        <path d="M40 52l16 6M44 64l12 4" fill="none" {...common} />
        <path d="M50 40V22M50 30l-12-8M50 30l12-8" fill="none" {...common} />
      </>
    ),
    apple: (
      <>
        <path
          d="M50 32c10-8 30-4 30 18s-18 34-30 34S20 72 20 50s20-26 30-18z"
          fill={fillB}
          {...common}
        />
        <path d="M50 32V16M50 20c8-6 14-4 14-4s-2 8-14 8z" fill={fillA} {...common} />
      </>
    ),
    egg: <ellipse cx="50" cy="56" rx="20" ry="26" fill={fillC} {...common} />,
    bear: (
      <>
        <circle cx="34" cy="30" r="8" fill={fillD} {...common} />
        <circle cx="66" cy="30" r="8" fill={fillD} {...common} />
        <circle cx="50" cy="48" r="24" fill={fillD} {...common} />
        <ellipse cx="50" cy="58" rx="12" ry="9" fill={fillC} {...common} />
        <circle cx="50" cy="54" r="3" fill={stroke} stroke="none" />
        <circle cx="41" cy="42" r="2.6" fill={stroke} stroke="none" />
        <circle cx="59" cy="42" r="2.6" fill={stroke} stroke="none" />
        <path d="M34 72c4 10 28 10 32 0" fill="none" {...common} />
      </>
    ),
    cat: (
      <>
        <path d="M30 34l-4-16 16 8z" fill={fillA} {...common} />
        <path d="M70 34l4-16-16 8z" fill={fillA} {...common} />
        <circle cx="50" cy="46" r="22" fill={fillA} {...common} />
        <circle cx="42" cy="42" r="2.8" fill={stroke} stroke="none" />
        <circle cx="58" cy="42" r="2.8" fill={stroke} stroke="none" />
        <path d="M50 50l-4 4h8z" fill={stroke} stroke="none" />
        <path d="M28 50h-12M28 56h-12M72 50h12M72 56h12" fill="none" {...common} />
      </>
    ),
    banana: (
      <>
        <path
          d="M24 40c2 26 20 40 44 38 6 0 8-6 3-9-18-4-30-16-33-32-2-6-14-4-14 3z"
          fill={fillD}
          {...common}
        />
        <path d="M24 40c-1-5 3-8 7-7" fill="none" {...common} />
      </>
    ),
    lion: (
      <>
        <circle cx="50" cy="52" r="30" fill={fillD} {...common} />
        <circle cx="50" cy="52" r="20" fill={fillC} {...common} />
        <circle cx="42" cy="48" r="2.6" fill={stroke} stroke="none" />
        <circle cx="58" cy="48" r="2.6" fill={stroke} stroke="none" />
        <path d="M50 56l-4 4h8z" fill={stroke} stroke="none" />
        <path d="M50 60v6M50 66l-8 4M50 66l8 4" fill="none" {...common} />
      </>
    ),
    monkey: (
      <>
        <circle cx="50" cy="50" r="22" fill={fillD} {...common} />
        <circle cx="26" cy="50" r="8" fill={fillD} {...common} />
        <circle cx="74" cy="50" r="8" fill={fillD} {...common} />
        <ellipse cx="50" cy="58" rx="14" ry="11" fill={fillC} {...common} />
        <circle cx="43" cy="46" r="2.6" fill={stroke} stroke="none" />
        <circle cx="57" cy="46" r="2.6" fill={stroke} stroke="none" />
        <path d="M44 60h12" fill="none" {...common} />
      </>
    ),
    elephant: (
      <>
        <ellipse cx="46" cy="52" rx="26" ry="22" fill={fillA} {...common} />
        <circle cx="24" cy="46" r="14" fill={fillD} {...common} />
        <path d="M70 52c10 4 12 16 6 26" fill="none" {...common} />
        <circle cx="40" cy="46" r="2.6" fill={stroke} stroke="none" />
        <path d="M32 74v8M52 76v8M66 72v10" fill="none" {...common} />
      </>
    ),
    frog: (
      <>
        <ellipse cx="50" cy="58" rx="26" ry="20" fill={fillA} {...common} />
        <circle cx="38" cy="34" r="9" fill={fillC} {...common} />
        <circle cx="62" cy="34" r="9" fill={fillC} {...common} />
        <circle cx="38" cy="34" r="3" fill={stroke} stroke="none" />
        <circle cx="62" cy="34" r="3" fill={stroke} stroke="none" />
        <path d="M40 64h20" fill="none" {...common} />
        <path d="M24 74l-8 8M76 74l8 8" fill="none" {...common} />
      </>
    ),
    turtle: (
      <>
        <path d="M22 62a28 22 0 0 1 56 0z" fill={fillA} {...common} />
        <path d="M50 40v22M34 48l6 14M66 48l-6 14" fill="none" {...common} />
        <path d="M22 62h56" fill="none" {...common} />
        <circle cx="84" cy="60" r="7" fill={fillD} {...common} />
        <path d="M30 68v8M64 68v8" fill="none" {...common} />
      </>
    ),
    bird: (
      <>
        <ellipse cx="46" cy="54" rx="22" ry="17" fill={fillA} {...common} />
        <circle cx="66" cy="40" r="11" fill={fillA} {...common} />
        <path d="M76 40l10 4-10 5z" fill={fillD} {...common} />
        <circle cx="68" cy="38" r="2.2" fill={stroke} stroke="none" />
        <path d="M38 52c8-6 18-2 20 6-8 6-18 4-20-6z" fill={fillC} {...common} />
        <path d="M26 62l-12 12" fill="none" {...common} />
      </>
    ),
    dinosaur: (
      <>
        <path
          d="M20 76c0-22 12-38 32-38 14 0 22 8 26 18l10 6-10 4c-2 6-6 10-12 12z"
          fill={fillA}
          {...common}
        />
        <path d="M36 42l6-10 6 10 6-10 6 10" fill="none" {...common} />
        <circle cx="70" cy="54" r="2.4" fill={stroke} stroke="none" />
        <path d="M34 76v8M56 76v8" fill="none" {...common} />
      </>
    ),
    cloud: (
      <path
        d="M30 68a14 14 0 0 1 2-28 20 20 0 0 1 38-4 14 14 0 0 1 2 32z"
        fill={fillC}
        {...common}
      />
    ),
    sun: (
      <>
        <circle cx="50" cy="50" r="20" fill={fillD} {...common} />
        <path
          d="M50 16v-8M50 92v-8M16 50H8M92 50h-8M26 26l-6-6M74 26l6-6M26 74l-6 6M74 74l6 6"
          fill="none"
          {...common}
        />
      </>
    ),
    raindrop: (
      <path
        d="M50 16c14 20 22 30 22 40a22 22 0 1 1-44 0c0-10 8-20 22-40z"
        fill={fillA}
        {...common}
      />
    ),
    snowflake: (
      <>
        <path d="M50 12v76M18 30l64 40M82 30L18 70" fill="none" {...common} />
        <path d="M50 26l-8-8M50 26l8-8M50 74l-8 8M50 74l8 8" fill="none" {...common} />
      </>
    ),
    umbrella: (
      <>
        <path d="M12 54a38 38 0 0 1 76 0z" fill={fillB} {...common} />
        <path d="M50 54v26c0 6-10 6-10 0" fill="none" {...common} />
        <path
          d="M12 54c8-10 14-10 22 0 8-10 14-10 16 0 4-10 12-10 18 0 8-10 12-10 20 0"
          fill="none"
          {...common}
        />
      </>
    ),
    car: (
      <>
        <path d="M18 62V52l12-14h30l12 14h10v10z" fill={fillA} {...common} />
        <path d="M36 40v12M58 40v12" fill="none" {...common} />
        <circle cx="34" cy="68" r="9" fill={fillC} {...common} />
        <circle cx="68" cy="68" r="9" fill={fillC} {...common} />
      </>
    ),
    bus: (
      <>
        <rect x="14" y="28" width="72" height="38" rx="8" fill={fillA} {...common} />
        <path d="M24 38h16v12H24zM48 38h16v12H48zM72 38h8v12h-8z" fill={fillC} {...common} />
        <circle cx="32" cy="72" r="8" fill={fillD} {...common} />
        <circle cx="70" cy="72" r="8" fill={fillD} {...common} />
      </>
    ),
    train: (
      <>
        <path d="M18 62V40h26v22z" fill={fillC} {...common} />
        <path d="M44 62V30h26c8 0 12 6 12 14v18z" fill={fillA} {...common} />
        <path d="M52 38h16v12H52z" fill={fillC} {...common} />
        <circle cx="30" cy="70" r="7" fill={fillD} {...common} />
        <circle cx="56" cy="70" r="7" fill={fillD} {...common} />
        <circle cx="76" cy="70" r="7" fill={fillD} {...common} />
      </>
    ),
    airplane: (
      <>
        <path d="M12 54l76-14-8 16-56 8z" fill={fillA} {...common} />
        <path d="M40 46L34 22l10 2 12 20M38 60l-6 16 10-4 10-12" fill={fillC} {...common} />
      </>
    ),
    bicycle: (
      <>
        <circle cx="26" cy="66" r="16" fill="none" {...common} />
        <circle cx="74" cy="66" r="16" fill="none" {...common} />
        <path d="M26 66l16-26h16l16 26M42 40h16M58 40l6 26" fill="none" {...common} />
        <path d="M36 34h12" fill="none" {...common} />
      </>
    ),
    tree: (
      <>
        <circle cx="50" cy="42" r="24" fill={fillA} {...common} />
        <path d="M44 64h12v22H44z" fill={fillD} {...common} />
      </>
    ),
    flower: (
      <>
        <circle cx="50" cy="34" r="10" fill={fillB} {...common} />
        <circle cx="32" cy="46" r="10" fill={fillB} {...common} />
        <circle cx="68" cy="46" r="10" fill={fillB} {...common} />
        <circle cx="40" cy="64" r="10" fill={fillB} {...common} />
        <circle cx="60" cy="64" r="10" fill={fillB} {...common} />
        <circle cx="50" cy="50" r="8" fill={fillD} {...common} />
        <path d="M50 72v18" fill="none" {...common} />
      </>
    ),
    leaf: (
      <>
        <path
          d="M78 20C40 20 20 42 20 66c0 8 4 12 10 12 26 0 48-22 48-58z"
          fill={fillA}
          {...common}
        />
        <path d="M28 76C44 60 60 44 74 26" fill="none" {...common} />
      </>
    ),
    mushroom: (
      <>
        <path d="M16 52a34 26 0 0 1 68 0z" fill={fillB} {...common} />
        <circle cx="38" cy="42" r="5" fill={fillC} {...common} />
        <circle cx="62" cy="44" r="4" fill={fillC} {...common} />
        <path d="M40 52v24c0 6 20 6 20 0V52z" fill={fillC} {...common} />
      </>
    ),
    acorn: (
      <>
        <path d="M28 42h44c0 22-10 38-22 38S28 64 28 42z" fill={fillD} {...common} />
        <path d="M24 32a26 12 0 0 1 52 0z" fill={fillA} {...common} />
        <path d="M50 20v-8" fill="none" {...common} />
      </>
    ),
    pencil: (
      <>
        <path d="M22 78l6-18 40-40 12 12-40 40z" fill={fillD} {...common} />
        <path d="M28 60l12 12M64 24l12 12" fill="none" {...common} />
        <path d="M22 78l10-4-6-6z" fill={stroke} stroke="none" />
      </>
    ),
    book: (
      <>
        <path
          d="M16 26c12-6 24-6 34 2 10-8 22-8 34-2v48c-12-6-24-6-34 2-10-8-22-8-34-2z"
          fill={fillC}
          {...common}
        />
        <path d="M50 28v48" fill="none" {...common} />
      </>
    ),
    closedBook: (
      <>
        <rect x="16" y="28" width="68" height="44" rx="2" fill={fillC} {...common} />
        <path d="M24 28v44M31 40h38M31 49h28" fill="none" {...common} />
      </>
    ),
    ball: (
      <>
        <circle cx="50" cy="52" r="28" fill={fillA} {...common} />
        <path
          d="M22 52h56M50 24c12 12 12 44 0 56M50 24c-12 12-12 44 0 56"
          fill="none"
          {...common}
        />
      </>
    ),
    balloon: (
      <>
        <ellipse cx="50" cy="42" rx="22" ry="26" fill={fillB} {...common} />
        <path d="M46 68h8l-4 6z" fill={stroke} stroke="none" />
        <path d="M50 74c6 6-6 8 0 14" fill="none" {...common} />
      </>
    ),
    gift: (
      <>
        <rect x="22" y="34" width="56" height="46" rx="3" fill={fillB} {...common} />
        <path d="M50 34v46M22 52h56" fill="none" {...common} />
        <path
          d="M50 34c-8-14-22-12-20-2 1 5 10 5 20 2zM50 34c8-14 22-12 20-2-1 5-10 5-20 2z"
          fill={fillA}
          {...common}
        />
      </>
    ),
    squareTile: (
      <>
        <rect x="22" y="22" width="56" height="56" rx="1" fill={fillB} {...common} />
        <path d="M28 28h44v44H28z" fill="none" {...common} />
      </>
    ),
    window: (
      <>
        <rect x="20" y="22" width="60" height="56" rx="2" fill={fillC} {...common} />
        <path d="M50 22v56M20 50h60" fill="none" {...common} />
      </>
    ),
    flag: (
      <>
        <path d="M28 84V18" fill="none" {...common} />
        <path d="M30 20L82 38 30 58z" fill={fillD} {...common} />
      </>
    ),
    triangularRoadSign: (
      <>
        <path d="M50 16L86 80H14z" fill={fillD} {...common} />
        <path d="M50 35v22M50 67h.1" fill="none" {...common} />
      </>
    ),
    heart: (
      <path
        d="M50 82C24 64 16 50 16 38a16 16 0 0 1 34-8 16 16 0 0 1 34 8c0 12-8 26-34 44z"
        fill={fillB}
        {...common}
      />
    ),
  };
}
