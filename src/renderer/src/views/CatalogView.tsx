import React, { useMemo, useState } from 'react'
import { Search, ShieldCheck, TriangleAlert, ExternalLink, Trash2, Info } from 'lucide-react'
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
import { cn } from '@/lib/utils'

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
  /** Placeholder for the search box. */
  searchPlaceholder: string
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
}

function MetaTag({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="rounded border border-border/70 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
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
  const { items, isLoading = false, detectedToolIds, meta, installedIds = [], onAction, onUninstall, notice } = props
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [detail, setDetail] = useState<CatalogDetailItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const it of items) counts.set(it.category, (counts.get(it.category) ?? 0) + 1)
    return ['All', ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)]
  }, [items])

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
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={meta.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={meta.searchPlaceholder}
            className="h-10 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'focus-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                category === c
                  ? 'border-primary/50 bg-accent text-accent-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-elevated hover:text-foreground'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-10">
        {isLoading && items.length === 0
          ? Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="surface-raised flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
              >
                <Skeleton className="size-8 shrink-0 rounded-md" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-full max-w-md" />
                </div>
              </div>
            ))
          : filtered.map((item, index) => {
              const row = (
                <button
                  onClick={() => openDetail(item)}
                  className="focus-ring surface-raised flex w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-elevated"
                >
                  <GlyphTile icon={Icon} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      {item.metaTags.map((t) => (
                        <MetaTag key={t}>{t}</MetaTag>
                      ))}
                    </span>
                    <ToolCompat
                      toolIds={item.compatibleTools}
                      detectedToolIds={detectedToolIds}
                      variant="inline"
                      className="mt-1.5"
                    />
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {installedIds.includes(item.id) && (
                      <Badge className="bg-success text-success-foreground">Installed</Badge>
                    )}
                    {item.verified && (
                      <Badge className="gap-1 bg-accent text-accent-foreground">
                        <ShieldCheck className="size-3" /> Verified
                      </Badge>
                    )}
                    {item.warnings.length > 0 && (
                      <span title={item.warnings.join(' · ')}>
                        <TriangleAlert className="size-4 text-destructive" />
                      </span>
                    )}
                  </span>
                </button>
              )
              return index < 12 ? (
                <BlurFade key={item.id} direction="up" duration={0.2} delay={index * 0.02}>
                  {row}
                </BlurFade>
              ) : (
                <div key={item.id}>{row}</div>
              )
            })}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
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
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Category</span>
                  <span className="font-mono text-xs text-foreground">{detail.category}</span>
                </div>
                {detail.author && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Author</span>
                    <span className="font-mono text-xs text-foreground">{detail.author}</span>
                  </div>
                )}
                {detail.source && (
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
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
