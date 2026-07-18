import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Check, ShieldCheck } from 'lucide-react'
import { ServerLogo } from '../ServerLogo'
import { ToolMark } from '../ToolBadges'
import { hostsForTransport } from '../../../../shared/hosts'
import { toolBrand } from '../../../../shared/tools'
import { itemColor, itemWash } from '@/lib/itemColor'
import { SPRING } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { MergedServerEntry } from '../../../../shared/types'

interface ServerCardProps {
  server: MergedServerEntry
  installed: boolean
  selected: boolean
  detectedClientIds: string[]
  onOpen: (server: MergedServerEntry) => void
  onToggle: (id: string, next: boolean) => void
}

/**
 * A featured server, presented as a product rather than a table row: the publisher's
 * own colour washes the surface, the title is set in the display face, and the only
 * metadata that survives is what a person actually decides on — what it does, who can
 * run it, and whether we've checked it.
 *
 * Everything technical (transport, runtime, env vars, exact command) moves to the
 * detail drawer and the install preview, where it's genuinely load-bearing.
 */
export function ServerCard(props: ServerCardProps): React.JSX.Element {
  const { server, installed, selected, detectedClientIds, onOpen, onToggle } = props
  const prefersReducedMotion = useReducedMotion()

  const color = itemColor(server.id, server.title)
  const hosts = hostsForTransport(server.transport)
  const detected = new Set(detectedClientIds)
  // Lead with the tools this person actually has.
  const ordered = [...hosts].sort((a, b) => {
    const aHas = a.clientId && detected.has(a.clientId) ? 1 : 0
    const bHas = b.clientId && detected.has(b.clientId) ? 1 : 0
    return bHas - aHas
  })

  return (
    <motion.div
      whileHover={prefersReducedMotion ? undefined : { y: -3 }}
      transition={SPRING.snappy}
      className="group relative flex"
    >
      <button
        type="button"
        onClick={() => onOpen(server)}
        aria-label={`${server.title} — ${server.description}`}
        className={cn(
          'focus-ring surface-raised relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border p-5 text-left',
          'transition-[box-shadow,border-color] duration-200',
          'hover:surface-lifted',
          selected ? 'border-primary/60' : 'border-border'
        )}
        style={{ background: itemWash(color, selected ? 12 : 7) }}
      >
        {/* A soft bloom of the publisher's colour, so the card has a light source. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full opacity-30 blur-3xl transition-opacity duration-300 group-hover:opacity-45"
          style={{ background: color }}
        />

        <div className="relative flex items-start gap-3.5">
          <ServerLogo server={server} size={44} className="rounded-xl" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-heading text-[1.05rem] font-semibold leading-tight text-foreground">
                {server.title}
              </span>
              {server.curation?.verified && (
                <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified by Klik" />
              )}
            </span>
            <span className="text-xs text-muted-foreground">{server.category}</span>
          </span>

          {/* Selection is a state of the card, not a control bolted onto it. */}
          <span
            role="checkbox"
            aria-checked={selected}
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onToggle(server.id, !selected)
            }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                onToggle(server.id, !selected)
              }
            }}
            className={cn(
              'focus-ring flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all',
              selected
                ? 'border-primary bg-primary text-primary-foreground opacity-100'
                : // Hidden until wanted: an always-visible empty circle on every card
                  // reads as an unstyled blob rather than an affordance.
                  'border-foreground/25 bg-background/50 text-foreground/40 opacity-0 backdrop-blur-sm hover:border-primary/70 hover:text-primary group-hover:opacity-100 group-focus-within:opacity-100'
            )}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        </div>

        <p className="relative line-clamp-2 text-[0.875rem] leading-relaxed text-muted-foreground">
          {server.description}
        </p>

        <div className="relative mt-auto flex items-center gap-2 pt-1">
          <span className="flex items-center gap-1">
            {ordered.slice(0, 4).map((host) => {
              const brand = toolBrand(host.id)
              return (
                <ToolMark
                  key={host.id}
                  brand={{ accent: host.accent, websiteUrl: brand?.websiteUrl }}
                  detected={Boolean(host.clientId && detected.has(host.clientId))}
                  size={15}
                />
              )
            })}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Works in {ordered.length} apps
          </span>
          {installed && (
            <span className="ml-auto rounded-full bg-success px-2 py-0.5 text-[11px] font-medium text-success-foreground">
              Installed
            </span>
          )}
        </div>
      </button>
    </motion.div>
  )
}
