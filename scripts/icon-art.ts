/**
 * The Han.note mark, as SVG source.
 *
 * Two stacked cards at a slight angle — one face down in ink, one turned over
 * in paper — with the red dot from the `Han.note` wordmark sitting on the
 * turned card. It says what the app does: you flip a card over.
 *
 * Everything here is a rectangle, a circle or a rotation. No text, and that is
 * deliberate: an SVG containing text renders differently on every machine
 * depending on which fonts happen to be installed, and rasterises to nothing at
 * all where the font is missing. Shapes rasterise identically everywhere.
 */
const INK = "#1c1b19"
const PAPER = "#faf9f7"
const MARK = "#b3261e"
const RULE = "#e4e1da"
const MUTED = "#6e6a63"

/** Matches `--radius` scaled to the tile, so the icon rhymes with the UI. */
const TILE_RADIUS = 13

function tile(rounded: boolean): string {
  return `<rect width="64" height="64" rx="${rounded ? TILE_RADIUS : 0}" fill="${INK}"/>`
}

/**
 * The full mark, for 32px and up.
 *
 * The card behind is an outline rather than a fill so the two read as separate
 * objects at a glance instead of merging into one paper blob.
 */
function markBody(): string {
  return [
    // Back card: outlined, tilted the other way from the front one.
    `<g transform="rotate(-11 27 30)">`,
    `<rect x="15" y="15" width="24" height="30" rx="3.5" fill="none" stroke="${PAPER}" stroke-width="2.6"/>`,
    `</g>`,
    // Front card: turned over, carrying the mark.
    `<g transform="rotate(7 38 36)">`,
    `<rect x="26" y="21" width="24" height="30" rx="3.5" fill="${PAPER}"/>`,
    `<circle cx="43" cy="43" r="3.4" fill="${MARK}"/>`,
    `</g>`,
  ].join("")
}

/**
 * The 16px mark.
 *
 * At sixteen pixels the outline above is a two-thirds-of-a-pixel line, which
 * antialiases into grey mush, and the tilt turns both card edges into stairs.
 * So the small size drops the rotation, fills the back card at half strength
 * instead of stroking it, and enlarges the dot. Same idea, drawn for the room
 * available — the usual reason a mark needs a second cut.
 */
function markBodySmall(): string {
  return [
    `<rect x="14" y="11" width="27" height="36" rx="4" fill="${PAPER}" opacity="0.5"/>`,
    `<rect x="23" y="19" width="27" height="36" rx="4" fill="${PAPER}"/>`,
    `<circle cx="42" cy="46" r="4.2" fill="${MARK}"/>`,
  ].join("")
}

export type MarkOptions = {
  /** Small cut, for 16px renders. */
  small?: boolean
  /**
   * Rounded tile corners.
   *
   * Off for the Apple touch icon: iOS applies its own mask, and a rounded
   * square inside that mask shows the background through four little notches.
   */
  rounded?: boolean
}

export function markSvg({ small, rounded = true }: MarkOptions = {}): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`,
    tile(rounded),
    small ? markBodySmall() : markBody(),
    `</svg>`,
  ].join("")
}

/**
 * The 1200×630 social card.
 *
 * This one does carry text, because a link preview with no words is a wasted
 * impression. That is why the build script loads system fonts for it — and why
 * the result is committed rather than generated during a deploy.
 */
export function ogImageSvg(): string {
  const font = "Noto Sans, Helvetica Neue, Helvetica, Arial, sans-serif"

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">`,
    `<rect width="1200" height="630" fill="${PAPER}"/>`,
    // The hairline frame is the same device the app uses to separate sections.
    `<rect x="40" y="40" width="1120" height="550" fill="none" stroke="${RULE}" stroke-width="2"/>`,
    // 240px mark, vertically centred on the 630 canvas: 195 + 240/2 = 315.
    `<g transform="translate(110 195) scale(3.75)">${tile(true)}${markBody()}</g>`,
    `<text x="410" y="288" font-family="${font}" font-size="96" font-weight="600" fill="${INK}">Han<tspan fill="${MARK}">.</tspan>note</text>`,
    // Both lines are kept short enough to clear the hairline frame at x=1160.
    `<text x="410" y="350" font-family="${font}" font-size="32" fill="${MUTED}">Kosa kata HSK 4 · arti Indonesia dan Inggris</text>`,
    `<text x="410" y="398" font-family="${font}" font-size="28" fill="${MUTED}">1.000 kata · flashcard dan quiz · gratis</text>`,
    `</svg>`,
  ].join("")
}
