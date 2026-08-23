import type { AlfaCharacterKey } from "@/lib/alfa-characters";
import { alfaCharacters } from "@/lib/alfa-characters";
import type { IllustrationStyle } from "@/lib/visual-directions";

export type ArtPalette = {
  ink: string;
  inkSoft: string;
  rule: string;
  accent: string;
  accentSoft: string;
  surface: string;
  wing: string;
  wingAlt: string;
};

type Props = {
  character: AlfaCharacterKey;
  palette: ArtPalette;
  style?: Pick<IllustrationStyle, "detailLevel" | "expressionIntensity" | "strokeWeight">;
  size?: number;
  className?: string;
  title?: string;
};

const fallbackStyle = { detailLevel: 0.6, expressionIntensity: 0.7, strokeWeight: 1.7 };

/**
 * Original Alfa character artwork.
 *
 * Every character is drawn from palette roles and from the visual-direction
 * style tokens, so the same component renders correctly in Premium Color,
 * Soft Color, Ink-Saving and Black & White without any duplicated art.
 */
export function AlfaCharacterArt({
  character,
  palette,
  style = fallbackStyle,
  size = 64,
  className,
  title,
}: Props) {
  const c = alfaCharacters[character];
  const roles = c.identity;
  const pick = (role: keyof ArtPalette) => palette[role];
  const primary = pick(roles.primaryRole);
  const secondary = pick(roles.secondaryRole);

  const stroke = palette.ink;
  const sw = style.strokeWeight;
  const detail = style.detailLevel;
  const expression = Math.min(1, roles.baseExpression * (0.4 + style.expressionIntensity * 0.8));

  const line = {
    stroke,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  /** Eyes + mouth scale with the direction's expression intensity. */
  const face = (cx: number, cy: number, spread: number) => {
    const eye = 2 + expression * 1.6;
    const smile = 3 + expression * 5;
    return (
      <>
        <circle cx={cx - spread} cy={cy} r={eye} fill={stroke} stroke="none" />
        <circle cx={cx + spread} cy={cy} r={eye} fill={stroke} stroke="none" />
        {expression > 0.35 && (
          <path
            d={`M${cx - smile / 2} ${cy + eye + 2.5}q${smile / 2} ${1.5 + expression * 3} ${smile} 0`}
            fill="none"
            {...line}
            strokeWidth={sw * 0.85}
          />
        )}
        {detail > 0.55 && expression > 0.5 && (
          <>
            <ellipse
              cx={cx - spread - 3.5}
              cy={cy + 5}
              rx={3}
              ry={2}
              fill={palette.accentSoft}
              stroke="none"
              opacity={0.85}
            />
            <ellipse
              cx={cx + spread + 3.5}
              cy={cy + 5}
              rx={3}
              ry={2}
              fill={palette.accentSoft}
              stroke="none"
              opacity={0.85}
            />
          </>
        )}
      </>
    );
  };

  const art: Record<AlfaCharacterKey, React.ReactNode> = {
    "lumi-butterfly": (
      <>
        <path d="M47 48C33 24 12 27 13 43c1 14 20 15 34 9z" fill={primary} {...line} />
        <path d="M53 48C67 24 88 27 87 43c-1 14-20 15-34 9z" fill={primary} {...line} />
        <path d="M47 54C36 74 19 76 21 64c2-10 16-13 26-9z" fill={secondary} {...line} />
        <path d="M53 54C64 74 81 76 79 64c-2-10-16-13-26-9z" fill={secondary} {...line} />
        {detail > 0.4 && (
          <>
            <path
              d="M30 38c2-3 6-2 5 1 1-3 5-3 5 1 0 3-5 6-5 6s-5-3-5-8z"
              fill={palette.accentSoft}
              stroke="none"
            />
            <path
              d="M70 38c-2-3-6-2-5 1-1-3-5-3-5 1 0 3 5 6 5 6s5-3 5-8z"
              fill={palette.accentSoft}
              stroke="none"
            />
          </>
        )}
        <path d="M50 33v42" fill="none" {...line} />
        <ellipse cx="50" cy="34" rx="6.5" ry="7.5" fill={palette.surface} {...line} />
        <path
          d="M46 27c-2-5-6-6-8-9M54 27c2-5 6-6 8-9"
          fill="none"
          {...line}
          strokeWidth={sw * 0.8}
        />
        {face(50, 34, 2.6)}
      </>
    ),
    "milo-fox": (
      <>
        <path d="M22 78c-6-8-2-18 8-20l8-2 16 1 8 3c9 3 12 12 6 19z" fill={primary} {...line} />
        <path d="M78 78c6-6 4-16-4-20-6-3-10 4-8 10 1 5-2 9-6 10z" fill={secondary} {...line} />
        <path d="M32 40l-4-16 14 8z" fill={primary} {...line} />
        <path d="M68 40l4-16-14 8z" fill={primary} {...line} />
        <path
          d="M50 22c14 0 22 10 22 20s-10 18-22 18-22-8-22-18 8-20 22-20z"
          fill={primary}
          {...line}
        />
        <path d="M50 44c8 0 14 4 14 9s-6 9-14 9-14-4-14-9 6-9 14-9z" fill={secondary} {...line} />
        {detail > 0.35 && <ellipse cx="50" cy="53" rx="3.4" ry="2.6" fill={stroke} stroke="none" />}
        {face(50, 40, 8)}
      </>
    ),
    "pip-ladybug": (
      <>
        <path d="M22 60a28 24 0 0 1 56 0 24 20 0 0 1-56 0z" fill={primary} {...line} />
        <path d="M50 38v41" fill="none" {...line} />
        {detail > 0.25 && (
          <>
            <circle cx="37" cy="52" r={4 + detail * 1.5} fill={stroke} stroke="none" />
            <circle cx="63" cy="52" r={4 + detail * 1.5} fill={stroke} stroke="none" />
            <circle cx="39" cy="67" r={3.4 + detail} fill={stroke} stroke="none" />
            <circle cx="61" cy="67" r={3.4 + detail} fill={stroke} stroke="none" />
          </>
        )}
        <circle cx="50" cy="31" r="11" fill={secondary} {...line} />
        <path d="M43 21l-5-8M57 21l5-8" fill="none" {...line} strokeWidth={sw * 0.8} />
        {face(50, 31, 3.4)}
      </>
    ),
    "nola-bee": (
      <>
        <ellipse
          cx="26"
          cy="38"
          rx="15"
          ry="9.5"
          fill={secondary}
          {...line}
          transform="rotate(-24 26 38)"
        />
        <ellipse
          cx="74"
          cy="38"
          rx="15"
          ry="9.5"
          fill={secondary}
          {...line}
          transform="rotate(24 74 38)"
        />
        <ellipse cx="50" cy="58" rx="20" ry="23" fill={primary} {...line} />
        <path d="M31 50h38M32 62h36M37 72h26" fill="none" {...line} strokeWidth={sw * 0.9} />
        <path d="M50 81c2 4 5 5 7 4" fill="none" {...line} strokeWidth={sw * 0.8} />
        <circle cx="50" cy="29" r="9.5" fill={palette.surface} {...line} />
        <path d="M45 21l-4-8M55 21l4-8" fill="none" {...line} strokeWidth={sw * 0.8} />
        {face(50, 29, 3.2)}
      </>
    ),
    "timo-turtle": (
      <>
        <ellipse cx="30" cy="74" rx="8" ry="5" fill={secondary} {...line} />
        <ellipse cx="66" cy="74" rx="8" ry="5" fill={secondary} {...line} />
        <path d="M18 66a32 26 0 0 1 64 0z" fill={primary} {...line} />
        {detail > 0.3 && (
          <>
            <path
              d="M50 40v26M34 52l-6 14M66 52l6 14"
              fill="none"
              {...line}
              strokeWidth={sw * 0.75}
            />
            <path d="M32 60h36" fill="none" {...line} strokeWidth={sw * 0.75} />
          </>
        )}
        <path d="M18 66h64" fill="none" {...line} />
        <circle cx="82" cy="56" r="10" fill={secondary} {...line} />
        {face(84, 55, 3)}
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {art[character]}
    </svg>
  );
}
