import React, { useMemo } from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ToolMark, ToolChip } from './ToolBadges'
import { hostsForTransport, type McpHost } from '../../../shared/hosts'
import { toolBrand } from '../../../shared/tools'
import type { ClientId, TransportKind } from '../../../shared/types'

/** MCP hosts carry only display fields; the shared registry has the logo source. */
function brandOf(host: McpHost): { short: string; accent: string; websiteUrl?: string } {
  const brand = toolBrand(host.id)
  return { short: host.short, accent: host.accent, websiteUrl: brand?.websiteUrl }
}

interface HostCompatProps {
  transport: TransportKind
  /** Hosts detected on this machine — badged as present, and sorted first. */
  detectedClientIds: ClientId[]
  variant: 'inline' | 'detail'
  /** inline only: how many chips before collapsing into "+N". */
  max?: number
  className?: string
}

export function HostCompat(props: HostCompatProps): React.JSX.Element | null {
  const { transport, detectedClientIds, variant, max = 4, className } = props

  const { detected, others } = useMemo(() => {
    const detectedSet = new Set(detectedClientIds)
    const compatible = hostsForTransport(transport)
    const isDetected = (h: McpHost): boolean => Boolean(h.clientId && detectedSet.has(h.clientId))
    return {
      detected: compatible.filter(isDetected),
      others: compatible.filter((h) => !isDetected(h))
    }
  }, [transport, detectedClientIds])

  const ordered = [...detected, ...others]
  if (ordered.length === 0) return null

  if (variant === 'inline') {
    const shown = ordered.slice(0, max)
    const overflow = ordered.length - shown.length
    const overflowLabel = ordered.slice(max).map((h) => h.short).join(', ')
    return (
      <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
        <span className="mr-0.5 text-[11px] font-medium text-muted-foreground">
          Works in
        </span>
        {shown.map((host) => (
          <span key={host.id} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <ToolMark brand={brandOf(host)} detected={detected.includes(host)} />
            {host.short}
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
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        Compatible with
      </div>
      {detected.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-success-foreground">
            Detected on this device
          </span>
          <div className="flex flex-wrap gap-1.5">
            {detected.map((host) => (
              <ToolChip key={host.id} brand={brandOf(host)} detected />
            ))}
          </div>
        </div>
      )}
      {others.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {detected.length > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground">
              Also compatible
            </span>
          )}
          <div className="flex flex-wrap gap-1.5">
            {others.map((host) => (
              <ToolChip key={host.id} brand={brandOf(host)} detected={false} />
            ))}
          </div>
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        MCP is a shared protocol — compatibility is determined by the server&rsquo;s{' '}
        <span className="font-mono text-muted-foreground">{transport}</span> transport, not by the
        model behind each app.
      </p>
    </div>
  )
}
