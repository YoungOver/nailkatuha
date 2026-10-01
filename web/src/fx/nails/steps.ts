/* scroll progress at which the base, the colour and the top coat start to land on the plate */
export const LAYER_AT = [0.2, 0.44, 0.68] as const

/** How long one layer takes to land, as a share of the whole scroll. */
export const LAYER_FADE = 0.08

/** The step the text shows: a layer counts once it is half way in, so words and 3D change together. */
export function layerStep(p: number) {
  return LAYER_AT.filter((at) => p >= at + LAYER_FADE / 2).length
}
