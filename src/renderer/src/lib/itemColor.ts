/**
 * Each catalogue item carries its own colour, so a wall of servers reads as a set of
 * distinct products rather than as rows in a table. Klik supplies none of these hues
 * itself — they belong to the publishers.
 *
 * Colour is resolved rather than sampled. Reading pixels out of a remote logo would
 * mean a tainted canvas (publisher CDNs don't send CORS headers) and a different
 * answer every time an image failed to load; a lookup plus a deterministic fallback
 * is stable, instant, and never blocks a render.
 */
const BRAND_COLORS: Array<[RegExp, string]> = [
  [/github/i, '#8B949E'],
  [/notion/i, '#B9B4AC'],
  [/playwright/i, '#2EAD33'],
  [/context7|upstash/i, '#00C48C'],
  [/firecrawl/i, '#F97316'],
  [/exa/i, '#5B72FF'],
  [/figma/i, '#F24E1E'],
  [/kubernetes/i, '#4A86E8'],
  [/linear/i, '#7C87E8'],
  [/supabase/i, '#3ECF8E'],
  [/stripe/i, '#7A73FF'],
  [/slack/i, '#9B4C9E'],
  [/sentry/i, '#B475C4'],
  [/postgres|sql/i, '#4E93C4'],
  [/docker/i, '#3B93E0'],
  [/cloudflare/i, '#F59E0B'],
  [/browser|puppeteer|chrome/i, '#5AA9E6'],
  [/memory|sequential|everything|modelcontextprotocol/i, '#C58A6A'],
  [/search|brave|perplexity/i, '#E0A33E']
]

/** Hues that stay legible as a wash on both a near-white and a near-black surface. */
const FALLBACK_HUES = [12, 32, 96, 152, 188, 214, 262, 318]

function hash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/**
 * The item's accent. Known publishers get their own brand colour; everything else
 * gets a stable hue derived from its id, so the same server is always the same
 * colour without anyone hand-assigning 106 of them.
 */
export function itemColor(id: string, title = ''): string {
  const subject = `${id} ${title}`
  for (const [pattern, color] of BRAND_COLORS) {
    if (pattern.test(subject)) return color
  }
  const hue = FALLBACK_HUES[hash(id) % FALLBACK_HUES.length]
  return `oklch(0.72 0.11 ${hue})`
}

/**
 * A wash of the item's colour over the card surface. Kept deliberately weak — the
 * colour is there to differentiate, never to compete with the text sitting on it.
 */
export function itemWash(color: string, strength = 7): string {
  return `color-mix(in oklab, ${color} ${strength}%, var(--card))`
}

/**
 * The card's light source: a bloom of the item's colour from the top-right corner.
 *
 * Painted as a gradient rather than a blurred element. A `blur()` layer is a separate
 * GPU pass per card, and the catalogue renders dozens at a time — a gradient produces
 * the same falloff for nothing.
 */
export function itemBloom(color: string, strength = 7, intensity = 24): string {
  return [
    `radial-gradient(115% 85% at 100% 0%, color-mix(in oklab, ${color} ${intensity}%, transparent) 0%, transparent 62%)`,
    itemWash(color, strength)
  ].join(', ')
}
