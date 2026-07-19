import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { SPRING } from '@/lib/motion'

export type MarkState = 'idle' | 'open' | 'seating' | 'working'

interface KlikMarkProps {
  size?: number
  /**
   * `idle` — the four quadrants form a solid tile.
   * `open` — the two travelling quadrants sit apart, waiting.
   * `seating` — they spring home. This is the install moment.
   * `working` — they breathe apart and back, serving as the loader.
   */
  state?: MarkState
  className?: string
}

/**
 * Klik's mark: four quadrants, two of which travel. At rest it reads as one solid
 * tile; the two lighter quadrants seat into place with a spring. That seating IS the
 * product's verb, so the same mark serves as the logo, the install animation, and the
 * loading state — rather than a logo plus an unrelated stock spinner.
 *
 * Colour comes from `currentColor`, so the mark inherits whatever surface it sits on
 * and needs no per-theme variant.
 */
export function KlikMark({ size = 28, state = 'idle', className }: KlikMarkProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion()

  const isWorking = state === 'working' && !prefersReducedMotion
  // Only `open` holds the pieces apart; `seating` is the journey home to 0.
  const parked = state === 'open' && !prefersReducedMotion ? 5 : 0

  const transition = isWorking
    ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' as const }
    : state === 'seating'
      ? SPRING.expressive
      : SPRING.standard

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 text-primary', className)}
      aria-hidden
    >
      {/* Anchored quadrants — the frame the travelling pieces seat against. */}
      <path d="M4 8a4 4 0 0 1 4-4h7v10a2 2 0 0 1-2 2H4V8Z" fill="currentColor" />
      <path d="M17 16h11v8a4 4 0 0 1-4 4h-7V16Z" fill="currentColor" />

      {/* Travelling quadrants. */}
      <motion.path
        d="M17 4h7a4 4 0 0 1 4 4v6H19a2 2 0 0 1-2-2V4Z"
        fill="currentColor"
        opacity={0.55}
        animate={isWorking ? { x: [0, 5, 0], y: [0, -5, 0] } : { x: parked, y: -parked }}
        transition={transition}
      />
      <motion.path
        d="M4 18h9a2 2 0 0 1 2 2v8H8a4 4 0 0 1-4-4v-6Z"
        fill="currentColor"
        opacity={0.55}
        animate={isWorking ? { x: [0, -5, 0], y: [0, 5, 0] } : { x: -parked, y: parked }}
        transition={transition}
      />
    </svg>
  )
}

interface KlikLogoProps {
  /** Pixel size of the square mark. Wordmark scales alongside it. */
  size?: number
  showWordmark?: boolean
  state?: MarkState
  className?: string
}

export function KlikLogo({
  size = 28,
  showWordmark = true,
  state = 'idle',
  className
}: KlikLogoProps): React.JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <KlikMark size={size} state={state} />
      {showWordmark && (
        <span
          className="font-heading font-semibold tracking-tight text-foreground"
          style={{ fontSize: size * 0.66 }}
        >
          Klik
        </span>
      )}
    </span>
  )
}
