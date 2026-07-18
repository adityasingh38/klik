import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Search, CornerDownLeft, Compass, Sparkles, Blocks } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd'
import { Badge } from '@/components/ui/badge'
import { ServerLogo } from '../ServerLogo'
import type { MergedServerEntry } from '../../../../shared/types'
import type { InstallableKind } from '../../../../shared/catalog'

/**
 * One searchable thing, whatever catalog it came from. The palette is the only
 * surface that reaches across all three — the per-catalog boxes filter the list
 * you're already looking at, this jumps you to anything.
 */
export interface PaletteItem {
  kind: InstallableKind
  id: string
  title: string
  description: string
  category: string
  installed: boolean
  /** Present for MCP servers, so their publisher logo can render. */
  server?: MergedServerEntry
}

const KIND_META: Record<InstallableKind, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  mcp: { label: 'MCP Servers', icon: Compass },
  skill: { label: 'Skills', icon: Sparkles },
  plugin: { label: 'Plugins', icon: Blocks }
}

const KIND_ORDER: InstallableKind[] = ['mcp', 'skill', 'plugin']

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: PaletteItem[]
  onSelect: (item: PaletteItem) => void
}

export function CommandPalette(props: CommandPaletteProps): React.JSX.Element | null {
  const { open, onOpenChange, items, onSelect } = props
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = q
      ? items.filter(
          (it) =>
            it.title.toLowerCase().includes(q) ||
            it.description.toLowerCase().includes(q) ||
            it.id.toLowerCase().includes(q) ||
            it.category.toLowerCase().includes(q)
        )
      : items
    // Grouped by kind, but kept as one flat list so arrow keys cross the groups.
    return KIND_ORDER.flatMap((kind) => matched.filter((it) => it.kind === kind)).slice(0, 50)
  }, [query, items])

  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlight(0)
      // Focus after the enter animation begins.
      const t = setTimeout(() => inputRef.current?.focus(), 20)
      return () => clearTimeout(t)
    }
    return undefined
  }, [open])

  useEffect(() => {
    setHighlight(0)
  }, [query])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onOpenChange(false)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => Math.min(h + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => Math.max(h - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const picked = results[highlight]
        if (picked) {
          onSelect(picked)
          onOpenChange(false)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results, highlight, onOpenChange, onSelect])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label="Search servers"
            className="surface-raised relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search servers, skills, and plugins…"
                className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Nothing matches “{query}”.
                </div>
              ) : (
                results.map((item, index) => {
                  const KindIcon = KIND_META[item.kind].icon
                  // A header whenever the kind changes, so groups read as sections.
                  const startsGroup = index === 0 || results[index - 1].kind !== item.kind
                  return (
                    <React.Fragment key={`${item.kind}:${item.id}`}>
                      {startsGroup && (
                        <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {KIND_META[item.kind].label}
                        </div>
                      )}
                      <button
                        data-index={index}
                        onMouseEnter={() => setHighlight(index)}
                        onClick={() => {
                          onSelect(item)
                          onOpenChange(false)
                        }}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                          index === highlight ? 'bg-elevated' : 'hover:bg-elevated/60'
                        }`}
                      >
                        {item.server ? (
                          <ServerLogo server={item.server} size={26} />
                        ) : (
                          <span className="flex size-[26px] shrink-0 items-center justify-center rounded-md border border-border/70 bg-elevated text-primary">
                            <KindIcon className="size-3.5" />
                          </span>
                        )}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
                          <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {item.category}
                        </Badge>
                        {item.installed && (
                          <span className="shrink-0 text-[10px] font-medium text-success-foreground">Installed</span>
                        )}
                      </button>
                    </React.Fragment>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>
                    <CornerDownLeft className="size-3" />
                  </Kbd>
                  open
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Kbd>Esc</Kbd>
                close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
