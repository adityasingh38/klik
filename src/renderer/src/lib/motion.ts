/**
 * Klik's motion system. State changes are driven by springs rather than durations —
 * the single clearest difference between an interface that feels native and one that
 * feels generated. Values follow Material 3 Expressive's physics model (stiffness,
 * damping) rather than easing curves.
 *
 * The discipline that matters: `expressive` overshoots, and it is reserved for the
 * install. If overshoot shows up on hover states too, the install stops reading as
 * an event and becomes noise.
 */
export const SPRING = {
  /** Hover lifts, chips, checkboxes, toggles. Resolves fast, no visible bounce. */
  snappy: { type: 'spring' as const, stiffness: 500, damping: 34 },
  /** Drawers, dialogs, view transitions. Settles cleanly. */
  standard: { type: 'spring' as const, stiffness: 380, damping: 30 },
  /** The install seat, and nothing else. Low damping — visible overshoot. */
  expressive: { type: 'spring' as const, stiffness: 300, damping: 18 }
} as const

/** Stagger for lists that reveal as a group (detected tools, catalogue rows). */
export const STAGGER = 0.035

/** Cap the stagger so a long list never turns into a slow cascade. */
export function staggerDelay(index: number, max = 10): number {
  return Math.min(index, max) * STAGGER
}
