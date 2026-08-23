import type { RenderedCountObject } from "@/lib/worksheet-model";
import type { IllustrationStyle } from "@/lib/visual-directions";
import { AlfaCharacterArt, type ArtPalette } from "./AlfaCharacterArt";
import { InsectArt } from "./InsectArt";

type Props = {
  object: RenderedCountObject;
  palette: ArtPalette & { id?: string; name?: string };
  style: IllustrationStyle;
  size: number;
};

/**
 * Single entry point the layout uses to draw one countable object.
 *
 * It picks an original Alfa character when the content model names one and
 * otherwise falls back to the generic Alfa line-art set — the layout never
 * needs to know which illustration family it is rendering.
 */
export function WorksheetArt({ object, palette, style, size }: Props) {
  if (object.character) {
    return (
      <AlfaCharacterArt character={object.character} palette={palette} style={style} size={size} />
    );
  }
  return <InsectArt asset={object.asset} palette={palette as never} size={size} />;
}
