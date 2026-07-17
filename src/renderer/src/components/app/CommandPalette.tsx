import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Search, CornerDownLeft } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd'
import { Badge } from '@/components/ui/badge'
import { ServerLogo } from '../ServerLogo'
import type { MergedServerEntry } from '../../../../shared/types'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servers: MergedServerEntry[]
  installedServerIds: string[]
  onSelect: (server: MergedServerEntry) => void
}

export function CommandPalette(props: CommandPaletteProps): React.JSX.Element | null {
  const { open, onOpenChange, servers, installedServerIds, onSelect } = props
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? servers.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q)
        )
      : servers
    return base.slice(0, 50)
  }, [query, servers])

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
                placeholder="Search MCP servers…"
                className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No servers match “{query}”.
                </div>
              ) : (
                results.map((server, index) => {
                  const installed = installedServerIds.includes(server.id)
                  return (
                    <button
                      key={server.id}
                      data-index={index}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => {
                        onSelect(server)
                        onOpenChange(false)
                      }}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                        index === highlight ? 'bg-elevated' : 'hover:bg-elevated/60'
                      }`}
                    >
                      <ServerLogo server={server} size={26} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">{server.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{server.description}</span>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {server.category}
                      </Badge>
                      {installed && (
                        <span className="shrink-0 text-[10px] font-medium text-success-foreground">Installed</span>
                      )}
                    </button>
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
