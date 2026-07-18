import React, { useState } from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toolBrand, toolLogoUrl, type ToolBrand } from '../../../shared/tools'

/**
 * The accent dot — the fallback mark when a vendor logo can't be loaded. It scales
 * with the mark it stands in for; a fixed-size dot inside a larger slot reads as a
 * rendering fault rather than a deliberate fallback.
 */
function AccentDot({
  accent,
  detected,
  size = 6
}: {
  accent: string
  detected: boolean
  size?: number
}): React.JSX.Element {
  return (
    <span
      aria-hidden
      className="shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: detected ? accent : 'transparent',
        boxShadow: `inset 0 0 0 ${Math.max(1.5, size / 7)}px ${accent}${detected ? '' : 'b0'}`
      }}
    />
  )
}

/**
 * A tool's logo, taken from the vendor's own favicon, falling back to the accent
 * dot when it can't load (offline, 404, blocked) so a chip is never broken-image.
 * Undetected tools render desaturated and dimmed — presence is the signal, and
 * colour carries it without needing a second label.
 */
export function ToolMark({
  brand,
  detected,
  size = 14
}: {
  brand: { accent: string; websiteUrl?: string; name?: string }
  detected: boolean
  size?: number
}): React.JSX.Element {
  const [status, setStatus] = useState<'loading' | 'ok' | 'failed'>('loading')
  const src = brand.websiteUrl ? toolLogoUrl(brand as ToolBrand) : null

  // The dot renders underneath from the start and is only covered once the logo has
  // actually decoded. A favicon that hangs (offline, slow host) never fires `error`,
  // so waiting for a failure signal would leave a blank gap where the mark should be.
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {status !== 'ok' && <AccentDot accent={brand.accent} detected={detected} size={Math.round(size * 0.62)} />}
      {src && status !== 'failed' && (
        <img
          src={src}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('failed')}
          className={cn(
            'absolute inset-0 size-full rounded-[3px] object-contain',
            status !== 'ok' ? 'opacity-0' : !detected && 'opacity-60 saturate-50'
          )}
        />
      )}
    </span>
  )
}

export { AccentDot as ToolDot }

export function ToolChip({
  brand,
  detected
}: {
  brand: { short: string; accent: string; websiteUrl?: string }
  detected: boolean
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
        detected
          ? 'border-border bg-elevated text-foreground'
          : 'border-border/60 bg-card/60 text-muted-foreground'
      )}
    >
      <ToolMark brand={brand} detected={detected} />
      {brand.short}
    </span>
  )
}

interface ToolCompatProps {
  /** Tool ids this item is compatible with (declared, not derived). */
  toolIds: string[]
  /** Which of them are detected on this machine. */
  detectedToolIds: string[]
  variant: 'inline' | 'detail'
  /** inline: how many chips before collapsing into "+N". */
  max?: number
  /** detail: an honest one-line note under the chips. */
  note?: React.ReactNode
  className?: string
}

/**
 * Compatibility chips for skills and plugins, whose compatible tools are declared
 * on the entry rather than derived from a transport (that's HostCompat's job for
 * MCP). Detected tools sort first and render filled.
 */
export function ToolCompat(props: ToolCompatProps): React.JSX.Element | null {
  const { toolIds, detectedToolIds, variant, max = 4, note, className } = props

  const detectedSet = new Set(detectedToolIds)
  const brands = toolIds
    .map((id) => toolBrand(id))
    .filter((b): b is ToolBrand => Boolean(b))
  const detected = brands.filter((b) => detectedSet.has(b.id))
  const others = brands.filter((b) => !detectedSet.has(b.id))
  const ordered = [...detected, ...others]
  if (ordered.length === 0) return null

  if (variant === 'inline') {
    const shown = ordered.slice(0, max)
    const overflow = ordered.length - shown.length
    const overflowLabel = ordered.slice(max).map((b) => b.short).join(', ')
    return (
      <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
        <span className="mr-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Works in
        </span>
        {shown.map((brand) => (
          <span key={brand.id} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <ToolMark brand={brand} detected={detectedSet.has(brand.id)} />
            {brand.short}
          </span>
        ))}
        {overflow > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="cursor-default text-[11px] font-medium text-muted-foreground">
                  +{overflow}
                </span>
              }
            />
            <TooltipContent>{overflowLabel}</TooltipContent>
          </Tooltip>
        )}
      </span>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Compatible with
      </div>
      {detected.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-success-foreground">
            Detected on this device
          </span>
          <div className="flex flex-wrap gap-1.5">
            {detected.map((brand) => (
              <ToolChip key={brand.id} brand={brand} detected />
            ))}
          </div>
        </div>
      )}
      {others.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {detected.length > 0 && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Also compatible
            </span>
          )}
          <div className="flex flex-wrap gap-1.5">
            {others.map((brand) => (
              <ToolChip key={brand.id} brand={brand} detected={false} />
            ))}
          </div>
        </div>
      )}
      {note && <p className="text-[11px] leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  )
}
