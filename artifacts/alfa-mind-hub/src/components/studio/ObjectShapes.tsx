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
        <path d="M46 39l8-12 8 14M47 69l8 10 7-12" fill={fillD} {...common} />
        <path d="M72 54l14-12v24z" fill={fillB} {...common} />
        <circle cx="34" cy="50" r="3" fill={stroke} stroke="none" />
        <path d="M47 43c-4 7-4 15 0 22M53 47c5 2 7 5 8 8" fill="none" {...common} />
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
        <path d="M24 68h52M40 62h22" fill="none" {...common} />
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
        <path d="M50 84L34 42c9-7 23-7 32 0z" fill={fillB} {...common} />
        <path d="M39 53l17 5M43 65l12 4" fill="none" {...common} />
        <path d="M49 41c-3-11-10-17-18-18 1 11 8 17 18 18z" fill={fillA} {...common} />
        <path d="M51 41c3-11 10-17 18-18-1 11-8 17-18 18z" fill={fillA} {...common} />
        <path d="M50 41V18" fill="none" {...common} />
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
        <path d="M30 35l-4-17 17 9z" fill={fillA} {...common} />
        <path d="M70 35l4-17-17 9z" fill={fillA} {...common} />
        <path d="M31 31l-2-8 9 5M69 31l2-8-9 5" fill="none" {...common} />
        <circle cx="50" cy="48" r="23" fill={fillA} {...common} />
        <path d="M37 50c1 10 8 16 13 16s12-6 13-16" fill={fillC} {...common} />
        <circle cx="42" cy="43" r="2.8" fill={stroke} stroke="none" />
        <circle cx="58" cy="43" r="2.8" fill={stroke} stroke="none" />
        <path d="M50 51l-4 4h8zM50 55v5M44 62c4 3 8 3 12 0" fill="none" {...common} />
        <path d="M28 51H15M28 57H15M72 51h13M72 57h13" fill="none" {...common} />
      </>
    ),
    dog: (
      <>
        <path d="M31 35L19 21l6 27c2 5 8 2 8-4zM69 35l12-14-6 27c-2 5-8 2-8-4z" fill={fillD} {...common} />
        <circle cx="50" cy="49" r="23" fill={fillA} {...common} />
        <path d="M37 54c1 11 8 17 13 17s12-6 13-17" fill={fillC} {...common} />
        <circle cx="42" cy="43" r="2.8" fill={stroke} stroke="none" />
        <circle cx="58" cy="43" r="2.8" fill={stroke} stroke="none" />
        <ellipse cx="50" cy="56" rx="4.6" ry="3.4" fill={stroke} stroke="none" />
        <path d="M50 59v5M44 65c4 3 8 3 12 0" fill="none" {...common} />
      </>
    ),
    rabbit: (
      <>
        <ellipse cx="38" cy="30" rx="9" ry="21" fill={fillA} {...common} transform="rotate(-12 38 30)" />
        <ellipse cx="62" cy="30" rx="9" ry="21" fill={fillA} {...common} transform="rotate(12 62 30)" />
        <path d="M38 16v27M62 16v27" fill="none" {...common} />
        <circle cx="50" cy="56" r="23" fill={fillC} {...common} />
        <path d="M37 59c1 9 8 15 13 15s12-6 13-15" fill={fillA} {...common} />
        <circle cx="42" cy="51" r="2.8" fill={stroke} stroke="none" />
        <circle cx="58" cy="51" r="2.8" fill={stroke} stroke="none" />
        <path d="M50 59l-4 4h8zM50 64v5M44 70c4 3 8 3 12 0M34 63H20M66 63h14" fill="none" {...common} />
      </>
    ),
    bone: (
      <>
        <path
          d="M24 38a10 10 0 1 1 10 14l29 18a10 10 0 1 1 14-10L48 42a10 10 0 1 1-14-14z"
          fill={fillC}
          {...common}
        />
        <path d="M38 43l24 15" fill="none" {...common} />
      </>
    ),
    fishBowl: (
      <>
        <path d="M28 24h44M34 24v18c0 9-8 15-8 28 0 10 10 16 24 16s24-6 24-16c0-13-8-19-8-28V24" fill={fillC} {...common} />
        <path d="M30 58c12-4 28-4 40 0v12c0 9-9 13-20 13s-20-4-20-13z" fill={fillD} {...common} />
        <path d="M31 59c11-4 27-4 38 0" fill="none" {...common} />
        <path d="M39 68c5-6 13-6 19 0-5 6-13 6-19 0zM58 68l8-5v10z" fill={fillA} {...common} />
        <circle cx="44" cy="67" r="1.8" fill={stroke} stroke="none" />
        <path d="M36 77h28" fill="none" {...common} />
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
          d="M12 70c10-2 14-16 24-23 8-8 20-11 32-7 10 3 16 10 18 18l6 4-8 5c-3 10-11 16-22 17H24z"
          fill={fillA}
          {...common}
        />
        <path d="M36 48l6-11 6 10 6-10 6 11M72 60h11M34 74v10M58 74v10" fill="none" {...common} />
        <circle cx="76" cy="55" r="2.4" fill={stroke} stroke="none" />
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
        <path d="M12 56h28l10-30 10 3-7 27h24l14-11 5 7-18 12H53l-6 19-10-3 3-16H12z" fill={fillA} {...common} />
        <path d="M42 56h26M54 47l9 9M78 64l8 8" fill="none" {...common} />
      </>
    ),
    bicycle: (
      <>
        <circle cx="26" cy="66" r="16" fill="none" {...common} />
        <circle cx="74" cy="66" r="16" fill="none" {...common} />
        <circle cx="26" cy="66" r="3" fill={fillD} {...common} />
        <circle cx="74" cy="66" r="3" fill={fillD} {...common} />
        <path d="M26 66l16-26h16l16 26M42 40h16M58 40l6 26M38 34h12M38 34l-4-7M58 40l8-12h9" fill="none" {...common} />
      </>
    ),
    tree: (
      <>
        <circle cx="50" cy="42" r="24" fill={fillA} {...common} />
        <path d="M43 86V60h14v26z" fill={fillD} {...common} />
        <path d="M50 62V44M50 56l-10-9M50 52l10-8" fill="none" {...common} />
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
        <circle cx="50" cy="50" r="3" fill={fillC} {...common} />
        <path d="M50 72v18M50 78c-8-6-13-4-14 2M50 82c8-6 13-4 14 2" fill="none" {...common} />
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
        <path d="M25 44c13-9 37-10 51 0M23 54c15 10 40 10 54 0M30 66c12 7 28 7 40 0" fill="none" {...common} />
        <path d="M38 27c11 14 12 37 2 50M58 26c-9 15-9 37 2 50" fill="none" {...common} />
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
    satellite: (
      <>
        <rect x="38" y="38" width="24" height="24" rx="3" fill={fillC} {...common} />
        <path d="M38 44L16 32v36l22-12M62 44l22-12v36L62 56M50 38V22M50 62v16" fill={fillA} {...common} />
      </>
    ),
    alien: (
      <>
        <path d="M50 16c20 8 28 24 24 42-4 18-12 28-24 28S30 76 26 58c-4-18 4-34 24-42z" fill={fillA} {...common} />
        <ellipse cx="40" cy="50" rx="6" ry="9" fill={fillC} {...common} />
        <ellipse cx="60" cy="50" rx="6" ry="9" fill={fillC} {...common} />
        <path d="M42 70c6 4 10 4 16 0" fill="none" {...common} />
      </>
    ),
    dolphin: (
      <>
        <path d="M16 56c16-20 40-22 60-6l10-10-2 18-14 3c-14 16-38 16-54-5z" fill={fillA} {...common} />
        <path d="M46 42l-6-16 18 12M52 66l-2 14 14-12" fill={fillD} {...common} />
        <circle cx="40" cy="50" r="2.5" fill={stroke} stroke="none" />
      </>
    ),
    shark: (
      <>
        <path d="M14 56c16-20 42-22 62-6l10-12-2 20-12 4c-14 14-40 14-58-6z" fill={fillC} {...common} />
        <path d="M44 40l5-20 12 18M50 68l-2 14 14-12" fill={fillA} {...common} />
        <circle cx="40" cy="51" r="2.4" fill={stroke} stroke="none" />
      </>
    ),
    jellyfish: (
      <>
        <path d="M24 52a26 26 0 0 1 52 0v10H24z" fill={fillB} {...common} />
        <path d="M30 62c-4 14-12 12-12 22M44 62c-2 12-6 16-4 24M58 62c2 12 6 16 4 24M70 62c4 14 12 12 12 22" fill="none" {...common} />
        <circle cx="42" cy="50" r="2.4" fill={stroke} stroke="none" />
        <circle cx="58" cy="50" r="2.4" fill={stroke} stroke="none" />
      </>
    ),
    seahorse: (
      <>
        <path d="M56 18c14 6 16 22 6 30-7 6-6 13 2 18 10 7 2 22-8 16-5-3-4-10 0-13-13 4-25-6-20-19 3-9 11-12 8-24 4-6 8-8 12-8z" fill={fillD} {...common} />
        <path d="M52 48l-12 8 9 7M52 78c-8 8-4 14 4 12" fill="none" {...common} />
        <circle cx="56" cy="36" r="2.4" fill={stroke} stroke="none" />
      </>
    ),
    horse: (
      <>
        <path d="M24 64c0-22 14-34 34-30l12-14 8 12-8 12c6 6 8 13 6 20H24z" fill={fillC} {...common} />
        <path d="M36 64v18M58 64v18M66 40l12-4M34 42l-10-8" fill="none" {...common} />
        <circle cx="66" cy="38" r="2.5" fill={stroke} stroke="none" />
      </>
    ),
    duck: (
      <>
        <ellipse cx="48" cy="60" rx="25" ry="17" fill={fillA} {...common} />
        <circle cx="66" cy="42" r="13" fill={fillD} {...common} />
        <path d="M78 42l10 4-10 4z" fill={fillB} {...common} />
        <circle cx="68" cy="39" r="2.3" fill={stroke} stroke="none" />
        <path d="M40 76v8M56 76v8" fill="none" {...common} />
      </>
    ),
    fossil: (
      <>
        <path d="M28 78c-8-8 1-18 10-15 3-12 18-12 21-1 11-3 19 10 10 18-11 9-29 10-41-2z" fill={fillC} {...common} />
        <path d="M43 57c12-12 24 7 11 16-12 8-23-8-11-16 8-5 16 7 8 12-6 4-12-5-6-8" fill="none" {...common} />
        <path d="M58 48l12 10M60 76l10-7" fill="none" {...common} />
      </>
    ),
    orange: (
      <>
        <circle cx="50" cy="56" r="25" fill={fillD} {...common} />
        <path d="M50 31c2-10 10-14 18-12-2 9-9 14-18 12z" fill={fillA} {...common} />
        <path d="M50 37v-8" fill="none" {...common} />
        <path d="M38 59c6-8 18-8 24 0M42 68c5 5 11 5 16 0" fill="none" {...common} />
      </>
    ),
    strawberry: (
      <>
        <path d="M50 82C28 68 24 42 50 30c26 12 22 38 0 52z" fill={fillB} {...common} />
        <path d="M50 30l-14-10 10-2 4-10 4 10 10 2z" fill={fillA} {...common} />
        <path d="M37 50l3 2M58 50l-3 2M47 62l3 2M40 68l3 2M56 68l-3 2" fill="none" {...common} />
      </>
    ),
    grapes: (
      <>
        <path d="M50 22c10-8 18-6 24 0-10 4-16 8-24 14" fill={fillA} {...common} />
        <path d="M50 34v9M50 34c-8-6-14-5-18-1" fill="none" {...common} />
        <circle cx="42" cy="46" r="10" fill={fillB} {...common} /><circle cx="58" cy="46" r="10" fill={fillB} {...common} />
        <circle cx="34" cy="61" r="10" fill={fillB} {...common} /><circle cx="50" cy="63" r="10" fill={fillB} {...common} /><circle cx="66" cy="61" r="10" fill={fillB} {...common} />
        <circle cx="50" cy="78" r="9" fill={fillB} {...common} />
      </>
    ),
    backpack: (
      <>
        <path d="M26 82V40c0-16 12-26 24-26s24 10 24 26v42H26z" fill={fillB} {...common} />
        <path d="M38 30v-8c0-8 24-8 24 0v8M26 54h48M38 54v28h24V54" fill="none" {...common} />
      </>
    ),
    ruler: (
      <>
        <rect x="16" y="38" width="68" height="24" rx="2" fill={fillD} {...common} transform="rotate(-14 50 50)" />
        <path d="M30 42l4 14M40 39l4 14M50 36l5 14M60 34l4 14M70 31l4 14" fill="none" {...common} />
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
