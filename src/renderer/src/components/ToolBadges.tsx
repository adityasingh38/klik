import React from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toolBrand, type ToolBrand } from '../../../shared/tools'

/** A brand dot — a small ring in the tool's accent, filled when the tool is detected. */
export function ToolDot({ accent, detected }: { accent: string; detected: boolean }): React.JSX.Element {
  return (
    <span
      aria-hidden
      className="size-1.5 shrink-0 rounded-full"
      style={{
        backgroundColor: detected ? accent : 'transparent',
        boxShadow: `inset 0 0 0 1.5px ${accent}${detected ? '' : 'b0'}`
      }}
    />
  )
}

export function ToolChip({
  brand,
  detected
}: {
  brand: { short: string; accent: string }
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
      <ToolDot accent={brand.accent} detected={detected} />
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
        <span className="mr-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
          Works in
        </span>
        {shown.map((brand) => (
          <span key={brand.id} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <ToolDot accent={brand.accent} detected={detectedSet.has(brand.id)} />
            {brand.short}
          </span>
        ))}
        {overflow > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="cursor-default text-[11px] font-medium text-muted-foreground/80">
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
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
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
      {note && <p className="text-[11px] leading-relaxed text-muted-foreground/80">{note}</p>}
    </div>
  )
}
