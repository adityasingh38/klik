import React, { useEffect, useMemo, useState } from 'react'
import { ListFilter, ShieldCheck, TriangleAlert, ExternalLink, Trash2, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BlurFade } from '@/components/ui/blur-fade'
import {
  Drawer,
  DrawerPopup,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerPanel,
  DrawerFooter,
  DrawerClose
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { ToolCompat } from '../components/ToolBadges'
import { itemColor, itemWash } from '@/lib/itemColor'
import { SPRING, staggerDelay } from '@/lib/motion'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

/** How many cards mount at once before "Show more". */
const PAGE_SIZE = 48

/** A fully-normalized catalog item — everything the shared list and drawer need. */
export interface CatalogDetailItem {
  id: string
  title: string
  description: string
  category: string
  /** Small technical tags under the description. */
  metaTags: string[]
  compatibleTools: string[]
  verified: boolean
  warnings: string[]
  author?: string
  /** e.g. the git repo / raw file / marketplace an item installs from. */
  source?: string
  /** Label for the source field in the drawer, e.g. "Source" or "Marketplace". */
  sourceLabel?: string
  repositoryUrl?: string
}

export interface CatalogKindMeta {
  /** Glyph shown on each item's tile and in the empty state. */
  icon: React.ComponentType<{ className?: string }>
  /** Placeholder for the filter box — this narrows the visible list, it does not search globally. */
  filterPlaceholder: string
  /** Honest one-liner shown under the compat chips in the drawer. */
  compatNote: React.ReactNode
  /** Verb for the primary action (Phase 3 wires it; disabled for now). */
  actionLabel: string
  /** Why the action is not yet available — shown in a tooltip. */
  actionPendingReason: string
  /** Teaches what this catalog is, shown when nothing is installed/filtered in. */
  emptyHint: string
}

interface CatalogViewProps {
  items: CatalogDetailItem[]
  isLoading?: boolean
  detectedToolIds: string[]
  meta: CatalogKindMeta
  /** Ids already installed — badged in the list, and swap the drawer action to uninstall. */
  installedIds?: string[]
  /** When provided the primary action is live; otherwise it renders disabled. */
  onAction?: (item: CatalogDetailItem) => void
  onUninstall?: (id: string) => void
  /** A blocking condition worth stating outright (e.g. a missing tool). */
  notice?: React.ReactNode
  /** Id to open on arrival — set when the command palette jumps here. */
  focusItemId?: string | null
  /** Called once the jump has been handled, so it doesn't reopen on every render. */
  onFocusHandled?: () => void
}

function MetaTag({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="rounded border border-border/70 px-1.5 py-px text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  )
}

/** Copper monogram tile — the visual anchor for a skill/plugin row. */
function GlyphTile({
  icon: Icon,
  size = 32
}: {
  icon: React.ComponentType<{ className?: string }>
  size?: number
}): React.JSX.Element {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md border border-border/70 bg-elevated text-primary"
      style={{ width: size, height: size }}
    >
      <Icon className="size-1/2" />
    </span>
  )
}

export function CatalogView(props: CatalogViewProps): React.JSX.Element {
  const { items, isLoading = false, detectedToolIds, meta, installedIds = [], onAction, onUninstall, notice, focusItemId, onFocusHandled } = props
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [detail, setDetail] = useState<CatalogDetailItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Multi-source catalogues throw off dozens of categories — one per plugin folder
  // across every repository. Showing all of them buries the actual content under a
  // wall of chips, so only the ones carrying real weight are offered up front.
  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const it of items) counts.set(it.category, (counts.get(it.category) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [items])

  const [showAllCategories, setShowAllCategories] = useState(false)
  const TOP_CATEGORIES = 7
  const visibleCategories = showAllCategories ? categories : categories.slice(0, TOP_CATEGORIES)
  const hiddenCategoryCount = categories.length - visibleCategories.length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => {
      if (category !== 'All' && it.category !== category) return false
      if (!q) return true
      return (
        it.title.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q)
      )
    })
  }, [items, search, category])

  /** Multi-source catalogues run to hundreds of entries; only a window is mounted. */
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, category])


  // Arriving from the command palette opens that item straight away.
  useEffect(() => {
    if (!focusItemId) return
    const target = items.find((it) => it.id === focusItemId)
    if (target) {
      setDetail(target)
      setDetailOpen(true)
    }
    onFocusHandled?.()
  }, [focusItemId, items, onFocusHandled])

  function openDetail(item: CatalogDetailItem): void {
    setDetail(item)
    setDetailOpen(true)
  }

  const Icon = meta.icon

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 pb-4">
        {notice && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-border bg-elevated px-3 py-2.5 text-xs text-muted-foreground"
          >
            <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>{notice}</span>
          </div>
        )}
        <div className="relative">
          <ListFilter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={meta.filterPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={meta.filterPlaceholder}
            className="h-10 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCategory('All')}
            className={cn(
              'focus-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              category === 'All'
                ? 'border-primary/50 bg-accent text-accent-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-elevated hover:text-foreground'
            )}
          >
            All {items.length}
          </button>
          {visibleCategories.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setCategory(name)}
              className={cn(
                'focus-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                category === name
                  ? 'border-primary/50 bg-accent text-accent-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-elevated hover:text-foreground'
              )}
            >
              {name} <span className="text-muted-foreground">{count}</span>
            </button>
          ))}
          {hiddenCategoryCount > 0 && (
            <button
              onClick={() => setShowAllCategories(true)}
              className="focus-ring rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              +{hiddenCategoryCount} more
            </button>
          )}
          {showAllCategories && categories.length > TOP_CATEGORIES && (
            <button
              onClick={() => setShowAllCategories(false)}
              className="focus-ring rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Show fewer
            </button>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-min content-start gap-4 overflow-y-auto pb-10 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading && items.length === 0
          ? Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="surface-raised flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex gap-3.5">
                  <Skeleton className="size-11 shrink-0 rounded-xl" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ))
          : visible.map((item, index) => {
              const color = itemColor(item.id, item.title)
              const isInstalled = installedIds.includes(item.id)
              const card = (
                <motion.div
                  whileHover={prefersReducedMotion ? undefined : { y: -3 }}
                  transition={SPRING.snappy}
                  className="group flex w-full"
                >
                  <button
                    onClick={() => openDetail(item)}
                    aria-label={`${item.title} — ${item.description}`}
                    className="focus-ring surface-raised relative flex h-full w-full flex-col gap-3 overflow-hidden rounded-2xl border border-border p-5 text-left transition-[box-shadow,border-color] duration-200 hover:surface-lifted"
                    style={{ background: itemWash(color, 7) }}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full opacity-30 blur-3xl transition-opacity duration-300 group-hover:opacity-45"
                      style={{ background: color }}
                    />
                    <span className="relative flex items-start gap-3.5">
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60"
                        style={{ background: itemWash(color, 22), color }}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate font-heading text-[1.05rem] font-semibold leading-tight text-foreground">
                            {item.title}
                          </span>
                          {item.verified && <ShieldCheck className="size-3.5 shrink-0 text-primary" />}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {item.author ?? item.category}
                        </span>
                      </span>
                      {isInstalled && (
                        <span className="shrink-0 rounded-full bg-success px-2 py-0.5 text-[11px] font-medium text-success-foreground">
                          Installed
                        </span>
                      )}
                    </span>

                    <p className="relative line-clamp-2 text-[0.875rem] leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>

                    <span className="relative mt-auto flex items-center gap-2 pt-1">
                      <ToolCompat
                        toolIds={item.compatibleTools}
                        detectedToolIds={detectedToolIds}
                        variant="inline"
                        showLabel={false}
                      />
                      {item.warnings.length > 0 && (
                        <TriangleAlert className="ml-auto size-4 shrink-0 text-destructive" />
                      )}
                    </span>
                  </button>
                </motion.div>
              )
              return (
                <motion.div
                  key={item.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING.standard, delay: staggerDelay(index) }}
                  className="flex"
                >
                  {card}
                </motion.div>
              )
            })}

        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center gap-2 py-16 text-center">
            <GlyphTile icon={Icon} size={40} />
            {items.length === 0 ? (
              <>
                <p className="text-sm font-medium text-foreground">Nothing in this catalog yet</p>
                <p className="max-w-sm text-xs text-muted-foreground">{meta.emptyHint}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">No match for these filters</p>
                <p className="text-xs text-muted-foreground">
                  Try another category, or clear the search to see all {items.length}.
                </p>
              </>
            )}
    
        {visible.length < filtered.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="focus-ring surface-raised col-span-full mx-auto flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-elevated"
          >
            Show more
            <span className="text-muted-foreground">
              {visible.length} of {filtered.length}
            </span>
          </button>
        )}
      </div>
        )}
      </div>

      {detail && (
        <Drawer open={detailOpen} onOpenChange={setDetailOpen} position="right">
          <DrawerPopup showCloseButton className="w-[26rem] max-w-[92vw]">
            <DrawerHeader>
              <GlyphTile icon={Icon} size={44} />
              <div className="flex flex-wrap items-center gap-2">
                <DrawerTitle>{detail.title}</DrawerTitle>
                {detail.verified && (
                  <Badge className="gap-1 bg-accent text-accent-foreground">
                    <ShieldCheck className="size-3" /> Verified
                  </Badge>
                )}
              </div>
              <DrawerDescription className="font-mono text-[11px]">{detail.id}</DrawerDescription>
            </DrawerHeader>

            <DrawerPanel className="flex flex-col gap-5">
              <p className="text-sm leading-relaxed text-foreground/90">{detail.description}</p>

              <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card/60 p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Category</span>
                  <span className="font-mono text-xs text-foreground">{detail.category}</span>
                </div>
                {detail.author && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Author</span>
                    <span className="font-mono text-xs text-foreground">{detail.author}</span>
                  </div>
                )}
                {detail.source && (
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {detail.sourceLabel ?? 'Source'}
                    </span>
                    <span className="break-all font-mono text-xs text-foreground">{detail.source}</span>
                  </div>
                )}
              </div>

              {detail.warnings.length > 0 && (
                <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                  {detail.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              <ToolCompat
                toolIds={detail.compatibleTools}
                detectedToolIds={detectedToolIds}
                variant="detail"
                note={meta.compatNote}
                className="rounded-lg border border-border bg-card/60 p-4"
              />

              {detail.repositoryUrl && (
                <>
                  <Separator />
                  <a
                    href={detail.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-accent-foreground hover:underline"
                  >
                    <ExternalLink className="size-3.5" /> View repository
                  </a>
                </>
              )}
            </DrawerPanel>

            <DrawerFooter>
              <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
              {installedIds.includes(detail.id) && onUninstall ? (
                <Button
                  variant="destructive"
                  onClick={() => {
                    onUninstall(detail.id)
                    setDetailOpen(false)
                  }}
                >
                  <Trash2 className="size-4" /> Uninstall
                </Button>
              ) : onAction ? (
                <Button
                  onClick={() => {
                    onAction(detail)
                    setDetailOpen(false)
                  }}
                >
                  {meta.actionLabel}
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span>
                        <Button disabled>{meta.actionLabel}</Button>
                      </span>
                    }
                  />
                  <TooltipContent>{meta.actionPendingReason}</TooltipContent>
                </Tooltip>
              )}
            </DrawerFooter>
          </DrawerPopup>
        </Drawer>
      )}
    </div>
  )
}
