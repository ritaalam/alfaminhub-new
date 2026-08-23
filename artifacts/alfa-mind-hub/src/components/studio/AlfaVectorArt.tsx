import type { CanonicalArtworkManifest } from "@/lib/artwork-contract";
import type { VisualAssetKey } from "@/lib/worksheet-model";
import type { IllustrationStyle } from "@/lib/visual-directions";
import type { ArtPalette } from "./AlfaCharacterArt";

type Props = {
  asset: VisualAssetKey;
  manifest: CanonicalArtworkManifest;
  palette: ArtPalette;
  style: IllustrationStyle;
  size: number;
};

type Line = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: "round";
  strokeLinejoin: "round";
};

function PrimitiveFace({ cx, cy, line, mood }: { cx: number; cy: number; line: Line; mood: number }) {
  return (
    <>
      <circle cx={cx - 7} cy={cy} r={2.7} fill={line.stroke} stroke="none" />
      <circle cx={cx + 7} cy={cy} r={2.7} fill={line.stroke} stroke="none" />
      <path
        d={`M${cx - 6} ${cy + 9}q6 ${mood ? 6 : 3} 12 0`}
        fill="none"
        {...line}
        strokeWidth={line.strokeWidth * 0.8}
      />
    </>
  );
}

function PrimitiveWheels({ palette, line }: { palette: ArtPalette; line: Line }) {
  return (
    <>
      <circle cx="31" cy="73" r="10" fill={palette.surface} {...line} />
      <circle cx="70" cy="73" r="10" fill={palette.surface} {...line} />
      <circle cx="31" cy="73" r="3" fill={palette.accent} stroke="none" />
      <circle cx="70" cy="73" r="3" fill={palette.accent} stroke="none" />
    </>
  );
}

function PrimitiveLeaf({ x, y, rotation, palette, line }: { x: number; y: number; rotation: number; palette: ArtPalette; line: Line }) {
  return (
    <ellipse
      cx={x}
      cy={y}
      rx="13"
      ry="24"
      fill={palette.wing}
      {...line}
      transform={`rotate(${rotation} ${x} ${y})`}
    />
  );
}

function Insect({ asset, palette, line, variant }: { asset: VisualAssetKey; palette: ArtPalette; line: Line; variant: number }) {
  const isLadybug = asset === "ladybug";
  const isButterfly = asset === "butterfly";
  const isDragonfly = asset === "dragonfly";
  return (
    <>
      {(isButterfly || isDragonfly || asset === "bee") && (
        <>
          <ellipse cx="29" cy="43" rx="18" ry={isDragonfly ? 7 : 13} fill={palette.wing} {...line} transform="rotate(-24 29 43)" />
          <ellipse cx="71" cy="43" rx="18" ry={isDragonfly ? 7 : 13} fill={palette.wingAlt} {...line} transform="rotate(24 71 43)" />
        </>
      )}
      <ellipse cx="50" cy="59" rx={isLadybug ? 25 : 18} ry="24" fill={isLadybug ? palette.accentSoft : palette.accent} {...line} />
      <circle cx="50" cy="31" r="11" fill={palette.surface} {...line} />
      <path d="M46 22l-5-9M54 22l5-9" fill="none" {...line} />
      {isLadybug ? (
        <>
          <path d="M50 37v44" fill="none" {...line} />
          {[40, 60].map((x) => <circle key={x} cx={x} cy="55" r="3.4" fill={line.stroke} stroke="none" />)}
          {[42, 58].map((x) => <circle key={x} cx={x} cy="70" r="3" fill={line.stroke} stroke="none" />)}
        </>
      ) : (
        <>
          <path d="M33 52h34M33 62h34M36 72h28" fill="none" {...line} />
          {isButterfly && <path d="M50 39v42" fill="none" {...line} />}
        </>
      )}
      <PrimitiveFace cx={50} cy={30} line={line} mood={variant % 2} />
    </>
  );
}

function Nature({ asset, palette, line, variant }: { asset: VisualAssetKey; palette: ArtPalette; line: Line; variant: number }) {
  if (asset === "flower") {
    const petals = Array.from({ length: 6 }, (_, index) => index * 60 + variant * 4);
    return (
      <>
        <path d="M50 54v33" fill="none" {...line} />
        <PrimitiveLeaf x={39} y={71} rotation={-38} palette={palette} line={line} />
        <PrimitiveLeaf x={61} y={76} rotation={38} palette={palette} line={line} />
        {petals.map((angle) => <ellipse key={angle} cx="50" cy="36" rx="10" ry="22" fill={palette.wingAlt} {...line} transform={`rotate(${angle} 50 50)`} />)}
        <circle cx="50" cy="50" r="11" fill={palette.accent} {...line} />
      </>
    );
  }
  return (
    <>
      <path d="M50 84V49" fill="none" {...line} strokeWidth={line.strokeWidth * 2.3} />
      {[[-22, 53, -38], [0, 38, 0], [22, 53, 38]].map(([x, y, rotation]) => (
        <PrimitiveLeaf key={`${x}-${y}`} x={50 + x} y={y} rotation={rotation} palette={palette} line={line} />
      ))}
      {variant > 1 && <circle cx="50" cy="25" r="9" fill={palette.accentSoft} {...line} />}
    </>
  );
}

function Vehicle({ asset, palette, line, variant }: { asset: VisualAssetKey; palette: ArtPalette; line: Line; variant: number }) {
  if (asset === "rocket") {
    return (
      <>
        <path d="M50 12c20 17 20 47 0 67-20-20-20-50 0-67z" fill={palette.accentSoft} {...line} />
        <circle cx="50" cy="39" r="8" fill={palette.wing} {...line} />
        <path d="M35 65l-14 16 20-5M65 65l14 16-20-5M44 78l6 12 6-12" fill={palette.accent} {...line} />
      </>
    );
  }
  return (
    <>
      <path d="M18 67V55l13-17h34l17 17v12z" fill={palette.accentSoft} {...line} />
      <path d="M36 39v16h28V39z" fill={palette.wing} {...line} />
      <path d="M18 59h64" fill="none" {...line} />
      <PrimitiveWheels palette={palette} line={line} />
      {variant % 2 === 1 && <path d="M79 48h8" fill="none" {...line} />}
    </>
  );
}

const starfishAnchors = {
  center: [50, 54],
  top: [50, 12],
  upperRight: [80, 27],
  lowerRight: [78, 88],
  lowerLeft: [22, 88],
  upperLeft: [20, 27],
} as const;

function Starfish({ palette, line, variant }: { palette: ArtPalette; line: Line; variant: number }) {
  const tokens = {
    body: palette.accentSoft,
    arms: palette.wing,
    spots: palette.accent,
    highlights: palette.wingAlt,
  };
  const anchorData = Object.entries(starfishAnchors)
    .map(([name, [x, y]]) => `${name}:${x},${y}`)
    .join(";");

  return (
    <g
      data-artwork-semantic="sea-creature starfish"
      data-artwork-tokens="body:accentSoft arms:wing spots:accent highlights:wingAlt outline:ink"
      data-artwork-anchors={anchorData}
    >
      <path
        d="M50 12c4 0 6 9 7 16 1 7 4 9 10 5l10-8c4-3 8 0 6 4l-7 12c-3 5-1 8 5 10l11 4c5 2 4 6 0 8l-12 4c-5 2-6 5-3 10l7 11c2 4-1 7-5 5l-12-7c-5-3-8-1-9 5l-3 12c-1 5-5 5-7 1l-4-12c-2-5-5-6-10-3l-11 7c-4 2-7-1-5-5l7-12c3-5 1-8-5-10L9 63c-5-2-5-6 0-8l12-4c5-2 6-5 3-10l-7-12c-2-4 1-7 5-5l11 7c5 3 8 1 9-5l3-11c1-2 3-3 5-3z"
        fill={tokens.body}
        {...line}
      />
      <path
        d="M50 20c2 6 3 13 3 20M78 33c-6 3-12 7-16 11M80 59c-7-1-13-1-19 1M66 82c-5-5-9-9-12-14M34 82c5-5 9-9 12-14M20 59c7-1 13-1 19 1M22 33c6 3 12 7 16 11"
        fill="none"
        stroke={tokens.arms}
        strokeWidth={Math.max(1, line.strokeWidth * 0.7)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {[
        [50, 31],
        [68, 45],
        [63, 68],
        [37, 68],
        [32, 45],
      ].map(([cx, cy], index) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx + (variant % 2 === 0 ? 0 : index % 2 === 0 ? 1.5 : -1.5)}
          cy={cy}
          r="2.6"
          fill={tokens.spots}
          stroke="none"
        />
      ))}
      <circle cx="50" cy="54" r="8" fill={tokens.highlights} opacity="0.42" stroke="none" />
      <PrimitiveFace cx={50} cy={51} line={line} mood={variant % 2} />
    </g>
  );
}

const seahorseAnchors = {
  center: [51, 53],
  crest: [53, 11],
  neck: [47, 31],
  head: [68, 25],
  snout: [88, 28],
  eye: [73, 25],
  fin: [33, 46],
  belly: [42, 67],
  tailEntry: [47, 78],
  tail: [45, 89],
  tailCurl: [43, 92],
} as const;

function Seahorse({ palette, line, variant }: { palette: ArtPalette; line: Line; variant: number }) {
  const tokens = {
    body: palette.accentSoft,
    fins: palette.wing,
    spots: palette.accent,
    highlights: palette.wingAlt,
  };
  const anchorData = Object.entries(seahorseAnchors)
    .map(([name, [x, y]]) => `${name}:${x},${y}`)
    .join(";");

  return (
    <g
      data-artwork-semantic="sea-creature seahorse"
      data-artwork-tokens="body:accentSoft fins:wing spots:accent highlights:wingAlt outline:ink"
      data-artwork-anchors={anchorData}
    >
      <path
        d="M53 18C45 15 38 21 39 31c1 8 10 11 11 18 1 6-6 8-10 14-5 7-2 17 5 20 7 3 15-2 15-9 0-6-5-9-7-13-2-4 2-7 6-10 7-5 9-14 6-22-2-6-6-10-12-11z"
        fill={tokens.body}
        {...line}
      />
      <path
        d="M52 19C47 15 48 10 53 7c4 3 6 8 2 13M42 43c-8-3-14 0-17 6 6 3 12 2 18-2M56 50c9 2 14 7 16 13"
        fill={tokens.fins}
        {...line}
      />
      <path
        d="M61 22c6-5 16-5 21 1 4 4 2 9-2 12-4 3-9 1-15 0-4-3-6-8-4-13z"
        fill={tokens.body}
        {...line}
      />
      <path
        d="M79 24c7-2 13-1 15 3-3 5-9 7-15 5-2-2-2-5 0-8z"
        fill={tokens.highlights}
        {...line}
      />
      <path
        d="M47 77c-10 4-13 13-7 17 6 5 15 1 13-5-1-5-8-6-10-2"
        fill="none"
        stroke={tokens.fins}
        strokeWidth={Math.max(1, line.strokeWidth * 0.9)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [46, 31],
        [44, 44],
        [41, 58],
        [48, 70],
      ].map(([cx, cy], index) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx + (variant % 2 === 0 ? 0 : index % 2 === 0 ? 1 : -1)}
          cy={cy}
          r="2.2"
          fill={tokens.spots}
          stroke="none"
        />
      ))}
      <circle cx="73" cy="25" r="2.7" fill={line.stroke} stroke="none" />
      <path d="M82 32q5 2 9-1" fill="none" {...line} strokeWidth={line.strokeWidth * 0.75} />
      <path d="M55 42c3 2 5 5 5 9" fill="none" stroke={tokens.highlights} strokeWidth={line.strokeWidth} strokeLinecap="round" />
    </g>
  );
}

const jellyfishAnchors = {
  bellCenter: [50, 15],
  bellLeft: [18, 39],
  bellRight: [82, 39],
  rimLeft: [25, 50],
  rimCenter: [50, 51],
  rimRight: [75, 50],
  tentacle1Start: [28, 48],
  tentacle1End: [24, 91],
  tentacle2Start: [39, 49],
  tentacle2End: [35, 94],
  tentacle3Start: [50, 50],
  tentacle3End: [47, 95],
  tentacle4Start: [61, 49],
  tentacle4End: [62, 94],
  tentacle5Start: [72, 48],
  tentacle5End: [76, 91],
} as const;

function Jellyfish({ palette, line, variant }: { palette: ArtPalette; line: Line; variant: number }) {
  const tokens = {
    body: palette.accentSoft,
    tentacles: palette.wing,
    highlights: palette.wingAlt,
  };
  const anchorData = Object.entries(jellyfishAnchors)
    .map(([name, [x, y]]) => `${name}:${x},${y}`)
    .join(";");
  const waveOffset = variant % 2 === 0 ? 0 : 1;

  return (
    <g
      data-artwork-semantic="sea-creature jellyfish"
      data-artwork-tokens="body:accentSoft tentacles:wing highlights:wingAlt outline:ink"
      data-artwork-anchors={anchorData}
      data-artwork-tentacles="5"
    >
      <path
        d="M18 39C18 23 31 13 50 13s32 10 32 26c0 5-3 9-7 11-4-3-8-3-12 1-5-4-9-4-13 0-4-4-8-4-13 0-4-4-8-4-12-1-4-2-7-6-7-11z"
        fill={tokens.body}
        {...line}
      />
      <path
        d="M28 48C24 56 30 62 26 70c-4 8 2 14-2 21M39 49c-4 9 3 13-2 22-4 8 2 15-2 23M50 50c-5 9 2 15-2 23-4 8 2 15-1 22M61 49c4 9-3 15 2 23 4 8-4 15-1 22M72 48c7 8-1 15 4 23 5 7-1 14 0 20"
        fill="none"
        stroke={tokens.tentacles}
        strokeWidth={Math.max(1.35, line.strokeWidth * 0.92)}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`translate(${waveOffset} 0)`}
      />
      <path
        d="M29 30c7-8 35-8 42 0M26 40c7 4 13 4 20 0M54 40c7 4 13 4 20 0"
        fill="none"
        stroke={tokens.highlights}
        strokeWidth={Math.max(1, line.strokeWidth * 0.72)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 24c4-3 8-4 12-4M54 20c5 0 9 1 13 4"
        fill="none"
        stroke={tokens.highlights}
        strokeWidth={Math.max(1, line.strokeWidth * 0.65)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

const turtleAnchors = {
  shellCenter: [50, 49],
  shellTop: [50, 30],
  shellFront: [81, 61],
  shellRear: [19, 61],
  shellRim: [50, 68],
  head: [87, 59],
  eye: [88, 57],
  frontLeftLeg: [63, 74],
  frontRightLeg: [75, 73],
  rearLeftLeg: [26, 74],
  rearRightLeg: [38, 74],
  tail: [14, 60],
} as const;

function Turtle({ palette, line, variant }: { palette: ArtPalette; line: Line; variant: number }) {
  const tokens = {
    shell: palette.accentSoft,
    shellPanels: palette.wing,
    body: palette.accent,
    legs: palette.wingAlt,
    highlights: palette.surface,
  };
  const anchorData = Object.entries(turtleAnchors)
    .map(([name, [x, y]]) => `${name}:${x},${y}`)
    .join(";");
  const highlightPath = variant % 2 === 0
    ? "M30 43c5-5 10-7 15-8"
    : "M55 35c6 1 11 4 15 8";

  return (
    <g
      data-artwork-semantic="animal turtle"
      data-artwork-tokens="shell:accentSoft shellPanels:wing body:accent legs:wingAlt highlights:surface outline:ink"
      data-artwork-anchors={anchorData}
      data-artwork-legs="4"
    >
      <path d="M20 61l-8-5 3 9z" fill={tokens.body} {...line} />
      <path d="M29 61c-6 4-8 11-5 16 2 4 8 4 11 0 2-3 1-8-1-11l3-6z" fill={tokens.legs} {...line} />
      <path d="M41 64c-4 5-4 11-1 15 2 4 8 4 11 0 2-3 1-8-1-12l-1-4z" fill={tokens.legs} {...line} />
      <path d="M59 63c-2 4-3 9-1 13 2 4 8 4 11 0 3-4 1-10-3-14z" fill={tokens.legs} {...line} />
      <path d="M71 61c-2 4-2 9 1 13 3 4 9 4 11 0 3-5 1-12-5-16z" fill={tokens.legs} {...line} />
      <path d="M69 57c5-6 12-7 18-3 4 3 5 8 1 12-5 4-13 3-19-1z" fill={tokens.body} {...line} />
      <path
        d="M18 61C18 43 31 30 50 30s32 13 32 31c-4 5-11 8-21 8H39c-10 0-17-3-21-8z"
        fill={tokens.shell}
        {...line}
      />
      <path d="M50 32c-6 6-8 15-7 24 1 5 4 10 7 13 3-3 6-8 7-13 1-9-1-18-7-24z" fill={tokens.shellPanels} {...line} strokeWidth={line.strokeWidth * 0.72} />
      <path d="M28 39c7 2 12 7 15 14 1 4 1 9-1 14M72 39c-7 2-12 7-15 14-1 4-1 9 1 14" fill="none" {...line} strokeWidth={line.strokeWidth * 0.68} />
      <path d="M22 56c8-3 15-2 22 2M56 58c7-4 14-5 22-2" fill="none" {...line} strokeWidth={line.strokeWidth * 0.68} />
      <path d={highlightPath} fill="none" stroke={tokens.highlights} strokeWidth={Math.max(1, line.strokeWidth * 0.85)} strokeLinecap="round" />
      <circle cx="88" cy="57" r="2.5" fill={line.stroke} stroke="none" />
      <path d="M88 64q3 1 5-1" fill="none" {...line} strokeWidth={line.strokeWidth * 0.7} />
    </g>
  );
}

function Everyday({ asset, palette, line, variant }: { asset: VisualAssetKey; palette: ArtPalette; line: Line; variant: number }) {
  if (asset === "apple") {
    return <><path d="M50 31c-18-14-31 4-25 27 5 21 19 27 25 27s20-6 25-27c6-23-7-41-25-27z" fill={palette.accentSoft} {...line} /><path d="M50 33c0-10 6-15 13-18M58 19c8-5 15-2 18 3-8 5-14 7-18 14" fill="none" {...line} /></>;
  }
  if (asset === "fish") {
    return <><ellipse cx="48" cy="55" rx="28" ry="18" fill={palette.wing} {...line} /><path d="M76 55l15-13v26z" fill={palette.accentSoft} {...line} /><circle cx="38" cy="50" r="3" fill={line.stroke} stroke="none" /><path d="M44 63q8 5 16 0" fill="none" {...line} /></>;
  }
  if (asset === "starfish") {
    return <Starfish palette={palette} line={line} variant={variant} />;
  }
  if (asset === "seahorse") {
    return <Seahorse palette={palette} line={line} variant={variant} />;
  }
  if (asset === "jellyfish") {
    return <Jellyfish palette={palette} line={line} variant={variant} />;
  }
  if (asset === "turtle") {
    return <Turtle palette={palette} line={line} variant={variant} />;
  }
  if (asset === "star") {
    return <path d="M50 12l10 26 28 2-22 18 7 29-23-16-23 16 7-29L12 40l28-2z" fill={palette.wingAlt} {...line} />;
  }
  return <><ellipse cx="50" cy="57" rx="25" ry="24" fill={palette.accentSoft} {...line} /><PrimitiveFace cx={50} cy={54} line={line} mood={variant % 2} /></>;
}

/**
 * Composable Alfa-native artwork. It is intentionally limited to families that
 * are already stable; less common assets continue through the existing local
 * renderer while preserving the same canonical manifest.
 */
export function AlfaVectorArt({ asset, manifest, palette, style, size }: Props) {
  const line: Line = {
    stroke: palette.ink,
    strokeWidth: Math.max(1.25, style.strokeWeight),
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const familyArt =
    asset === "star" ? <Everyday asset={asset} palette={palette} line={line} variant={manifest.variant} /> :
    manifest.family === "insect" ? <Insect asset={asset} palette={palette} line={line} variant={manifest.variant} /> :
    manifest.family === "nature" ? <Nature asset={asset} palette={palette} line={line} variant={manifest.variant} /> :
    manifest.family === "vehicle" || manifest.family === "space" ? <Vehicle asset={asset} palette={palette} line={line} variant={manifest.variant} /> :
    <Everyday asset={asset} palette={palette} line={line} variant={manifest.variant} />;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="presentation"
      aria-hidden
      data-alfa-artwork="native-vector"
      data-artwork-family={manifest.family}
      data-artwork-variant={manifest.variant}
      data-artwork-seed={manifest.seed}
      data-artwork-engine={manifest.engineVersion}
      data-artwork-fallback={manifest.fallbackCategory}
    >
      {familyArt}
    </svg>
  );
}