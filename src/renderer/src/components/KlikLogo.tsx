import React from 'react'
import { cn } from '@/lib/utils'

interface KlikLogoProps {
  /** Pixel size of the square mark. Wordmark scales alongside it. */
  size?: number
  /** Render the "Klik" wordmark beside the mark. */
  showWordmark?: boolean
  className?: string
}

/**
 * Klik brand mark — a copper "click target" reticle: a solid center dot with four
 * cardinal ticks, reading as a precise, deliberate click (the app installs an MCP
 * server in one press). Self-contained inline SVG so it stays crisp at any size and
 * needs no asset pipeline. The reticle sits in graphite for contrast on the copper tile.
 */
export function KlikMark({ size = 28, className }: { size?: number; className?: string }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="klik-copper" x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f2ac66" />
          <stop offset="1" stopColor="#d3762c" />
        </linearGradient>
      </defs>
      {/* Tile */}
      <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#klik-copper)" />
      {/* Top bevel highlight */}
      <rect x="2.5" y="2.5" width="27" height="27" rx="8.5" stroke="#ffffff" strokeOpacity="0.22" />
      {/* Reticle — deep graphite on copper */}
      <g stroke="#17191b" strokeWidth="2.6" strokeLinecap="round">
        <line x1="16" y1="5.5" x2="16" y2="9.5" />
        <line x1="16" y1="22.5" x2="16" y2="26.5" />
        <line x1="5.5" y1="16" x2="9.5" y2="16" />
        <line x1="22.5" y1="16" x2="26.5" y2="16" />
      </g>
      <circle cx="16" cy="16" r="3.1" fill="#17191b" />
    </svg>
  )
}

export function KlikLogo({ size = 28, showWordmark = true, className }: KlikLogoProps): React.JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <KlikMark size={size} />
      {showWordmark && (
        <span
          className="font-heading font-bold tracking-tight text-foreground"
          style={{ fontSize: size * 0.62 }}
        >
          Klik
        </span>
      )}
    </span>
  )
}
