import type { PrintPalette, VisualAssetKey } from "@/lib/worksheet-model";
import type { CanonicalArtworkManifest } from "@/lib/artwork-contract";
import { safeVisualAssetFallback } from "@/lib/visual-asset-library";
import type { IllustrationStyle } from "@/lib/visual-directions";
import { objectShapes } from "./ObjectShapes";

type Props = {
  asset: VisualAssetKey;
  palette: PrintPalette;
  style?: Pick<IllustrationStyle, "strokeWeight">;
  size?: number;
  className?: string;
  artworkManifest?: CanonicalArtworkManifest;
};

/**
 * Original, generic object line-art (insects here, everything else in
 * ObjectShapes). Everything is drawn from the palette so
 * the same components work in colour and in ink-saving black & white.
 */
export function InsectArt({ asset, palette, style, size = 34, className, artworkManifest }: Props) {
  const stroke = palette.ink;
  const w = style?.strokeWeight ?? 1.6;
  const common = {
    stroke,
    strokeWidth: w,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const shapes: Record<VisualAssetKey, React.ReactNode> = {
    ...objectShapes({ palette, stroke, common }),
    chrysalis: (
      <>
        <path
          d="M50 16c14 0 22 14 22 32S64 84 50 84 28 66 28 48 36 16 50 16z"
          fill={palette.wingAlt}
          {...common}
        />
        <path d="M32 40h36M31 52h38M34 64h32M38 74h24" fill="none" {...common} />
        <path d="M50 16V8" fill="none" {...common} />
      </>
    ),
    ladybug: (
      <>
        <circle cx="50" cy="56" r="26" fill={palette.accentSoft} {...common} />
        <path d="M50 30v52" fill="none" {...common} />
        <circle cx="50" cy="26" r="9" fill={palette.surface} {...common} />
        <path d="M45 18l-4-7M55 18l4-7" fill="none" {...common} />
        <circle cx="39" cy="48" r="3.4" fill={stroke} stroke="none" />
        <circle cx="61" cy="48" r="3.4" fill={stroke} stroke="none" />
        <circle cx="41" cy="66" r="3" fill={stroke} stroke="none" />
        <circle cx="59" cy="66" r="3" fill={stroke} stroke="none" />
      </>
    ),
    bee: (
      <>
        <ellipse cx="50" cy="58" rx="20" ry="24" fill={palette.wingAlt} {...common} />
        <path d="M31 50h38M32 62h36M36 72h28" fill="none" {...common} />
        <ellipse
          cx="28"
          cy="38"
          rx="14"
          ry="9"
          fill={palette.surface}
          {...common}
          transform="rotate(-25 28 38)"
        />
        <ellipse
          cx="72"
          cy="38"
          rx="14"
          ry="9"
          fill={palette.surface}
          {...common}
          transform="rotate(25 72 38)"
        />
        <circle cx="50" cy="28" r="8" fill={palette.surface} {...common} />
        <path d="M46 21l-4-8M54 21l4-8" fill="none" {...common} />
      </>
    ),
    butterfly: (
      <>
        <path d="M48 50C34 26 12 30 14 46c2 14 20 14 34 8z" fill={palette.wing} {...common} />
        <path d="M52 50C66 26 88 30 86 46c-2 14-20 14-34 8z" fill={palette.wing} {...common} />
        <path d="M48 54C36 74 20 76 22 64c2-10 16-12 26-8z" fill={palette.accentSoft} {...common} />
        <path
          d="M52 54C64 74 80 76 78 64c-2-10-16-12-26-8z"
          fill={palette.accentSoft}
          {...common}
        />
        <path d="M50 34v44" fill="none" {...common} />
        <path d="M48 32l-6-10M52 32l6-10" fill="none" {...common} />
      </>
    ),
    ant: (
      <>
        <circle cx="28" cy="56" r="10" fill={palette.surface} {...common} />
        <circle cx="50" cy="58" r="8" fill={palette.surface} {...common} />
        <ellipse cx="74" cy="56" rx="14" ry="11" fill={palette.accentSoft} {...common} />
        <path d="M46 50l-6-12M52 50l2-14M58 50l8-10" fill="none" {...common} />
        <path d="M46 66l-6 12M52 66l2 14M58 66l8 10" fill="none" {...common} />
        <path d="M22 48l-6-10M32 47l2-12" fill="none" {...common} />
      </>
    ),
    dragonfly: (
      <>
        <path d="M50 34v48" fill="none" {...common} />
        <ellipse
          cx="28"
          cy="42"
          rx="18"
          ry="7"
          fill={palette.surface}
          {...common}
          transform="rotate(-12 28 42)"
        />
        <ellipse
          cx="72"
          cy="42"
          rx="18"
          ry="7"
          fill={palette.surface}
          {...common}
          transform="rotate(12 72 42)"
        />
        <ellipse
          cx="30"
          cy="56"
          rx="15"
          ry="6"
          fill={palette.wing}
          {...common}
          transform="rotate(10 30 56)"
        />
        <ellipse
          cx="70"
          cy="56"
          rx="15"
          ry="6"
          fill={palette.wing}
          {...common}
          transform="rotate(-10 70 56)"
        />
        <circle cx="50" cy="26" r="8" fill={palette.accentSoft} {...common} />
        <path d="M47 66h6M47.5 74h5" fill="none" {...common} />
      </>
    ),
    beetle: (
      <>
        <ellipse cx="50" cy="58" rx="22" ry="26" fill={palette.wing} {...common} />
        <path d="M50 32v52" fill="none" {...common} />
        <circle cx="50" cy="24" r="8" fill={palette.surface} {...common} />
        <path d="M28 44l-12-6M28 58H14M30 72l-12 8" fill="none" {...common} />
        <path d="M72 44l12-6M72 58h14M70 72l12 8" fill="none" {...common} />
      </>
    ),
    caterpillar: (
      <>
        <circle cx="24" cy="60" r="11" fill={palette.wing} {...common} />
        <circle cx="42" cy="58" r="11" fill={palette.accentSoft} {...common} />
        <circle cx="60" cy="60" r="11" fill={palette.wing} {...common} />
        <circle cx="78" cy="56" r="11" fill={palette.surface} {...common} />
        <circle cx="81" cy="53" r="2.4" fill={stroke} stroke="none" />
        <path d="M76 45l-3-9M84 45l4-9" fill="none" {...common} />
      </>
    ),
    snail: (
      <>
        <path d="M14 74h56" fill="none" {...common} />
        <path d="M22 74c-6 0-10-4-10-8s6-6 12-6" fill={palette.surface} {...common} />
        <circle cx="56" cy="52" r="22" fill={palette.wingAlt} {...common} />
        <path d="M56 52m-14 0a14 14 0 1 0 28 0a14 14 0 1 0-28 0" fill="none" {...common} />
        <path d="M56 52m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0" fill="none" {...common} />
        <path d="M28 66l-8-12" fill="none" {...common} />
        <path d="M20 54l-4-10M24 56l4-12" fill="none" {...common} />
      </>
    ),
  };
  const renderedAsset = safeVisualAssetFallback(asset);
  const artwork = shapes[renderedAsset] ?? shapes.circle;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={renderedAsset === asset ? asset : `${asset} visual fallback`}
      data-alfa-artwork={artworkManifest ? "native-local" : undefined}
      data-artwork-seed={artworkManifest?.seed}
      data-artwork-engine={artworkManifest?.engineVersion}
      data-artwork-fallback={artworkManifest?.fallbackCategory}
    >
      {artwork}
    </svg>
  );
}
