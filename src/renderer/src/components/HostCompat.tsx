import React, { useMemo } from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { hostsForTransport, type McpHost } from '../../../shared/hosts'
import type { ClientId, TransportKind } from '../../../shared/types'

interface HostCompatProps {
  transport: TransportKind
  /** Hosts detected on this machine — badged as present, and sorted first. */
  detectedClientIds: ClientId[]
  variant: 'inline' | 'detail'
  /** inline only: how many chips before collapsing into "+N". */
  max?: number
  className?: string
}

/** A brand dot — a small ring in the host's accent, filled when detected. */
function HostDot({ host, detected }: { host: McpHost; detected: boolean }): React.JSX.Element {
  return (
    <span
      aria-hidden
      className="size-1.5 shrink-0 rounded-full"
      style={{
        backgroundColor: detected ? host.accent : 'transparent',
        boxShadow: `inset 0 0 0 1.5px ${host.accent}${detected ? '' : 'b0'}`
      }}
    />
  )
}

function HostChip({ host, detected }: { host: McpHost; detected: boolean }): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
        detected
          ? 'border-border bg-elevated text-foreground'
          : 'border-border/60 bg-card/60 text-muted-foreground'
      )}
    >
      <HostDot host={host} detected={detected} />
      {host.short}
    </span>
  )
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
        <span className="mr-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
          Works in
        </span>
        {shown.map((host) => (
          <span key={host.id} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <HostDot host={host} detected={detected.includes(host)} />
            {host.short}
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
            {detected.map((host) => (
              <HostChip key={host.id} host={host} detected />
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
            {others.map((host) => (
              <HostChip key={host.id} host={host} detected={false} />
            ))}
          </div>
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground/80">
        MCP is a shared protocol — compatibility is determined by the server&rsquo;s{' '}
        <span className="font-mono text-muted-foreground">{transport}</span> transport, not by the
        model behind each app.
      </p>
    </div>
  )
}
