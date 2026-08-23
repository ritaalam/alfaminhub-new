import type { RenderedCountObject } from "@/lib/worksheet-model";
import type { IllustrationStyle } from "@/lib/visual-directions";
import { isComposedNativeAsset, resolveArtworkRecipe } from "@/lib/artwork-contract";
import { AlfaCharacterArt, type ArtPalette } from "./AlfaCharacterArt";
import { AlfaVectorArt } from "./AlfaVectorArt";
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
  const artwork =
    object.artwork ??
    resolveArtworkRecipe({
      itemId: object.id,
      asset: object.asset,
      paletteId: palette.id ?? "runtime",
      printMode: "premium",
      projectSeed: "runtime-local-artwork",
      hasCharacter: Boolean(object.character),
    });
  if (object.character) {
    return (
      <AlfaCharacterArt character={object.character} palette={palette} style={style} size={size} />
    );
  }
  if (isComposedNativeAsset(object.asset)) {
    return <AlfaVectorArt asset={object.asset} manifest={artwork} palette={palette} style={style} size={size} />;
  }
  return (
    <InsectArt
      asset={object.asset}
      palette={palette as never}
      style={style}
      size={size}
      artworkManifest={artwork}
    />
  );
}
