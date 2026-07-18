import React, { useEffect, useMemo, useState } from 'react'
import { ListFilter, Check, ShieldCheck, TriangleAlert, ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { ServerLogo } from '../components/ServerLogo'
import { HostCompat } from '../components/HostCompat'
import { ServerCard } from '../components/app/ServerCard'
import { SPRING, staggerDelay } from '@/lib/motion'
import { rankServers } from '../../../shared/ranking'
import { cn } from '@/lib/utils'
import type { ClientId, ClientInfo, MergedServerEntry } from '../../../shared/types'

interface DiscoverViewProps {
  servers: MergedServerEntry[]
  isLoadingServers: boolean
  installedServerIds: string[]
  selectedServerIds: string[]
  onChangeSelectedServerIds: (ids: string[]) => void
  clients: ClientInfo[]
  selectedClientIds: ClientId[]
  onChangeSelectedClientIds: (ids: ClientId[]) => void
  isInstalling: boolean
  onInstall: () => void
  onOpenServer: (server: MergedServerEntry) => void
}

/** How many catalogue cards mount at once before "Show more". */
const PAGE_SIZE = 48

/** Curated servers lead the catalogue; these are the ones worth arriving on. */
const FEATURED_IDS = [
  'com.notion/notion-mcp-server',
  'com.microsoft/playwright-mcp',
  'com.upstash/context7',
  'com.figma/figma-developer-mcp',
  'ai.exa/exa-mcp-server',
  'io.modelcontextprotocol/server-memory',
  'com.firecrawl/firecrawl-mcp',
  'dev.flux159/mcp-server-kubernetes',
  'io.modelcontextprotocol/server-sequential-thinking'
]

function MetaTag({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="rounded border border-border/70 px-1.5 py-px text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  )
}

export function DiscoverView(props: DiscoverViewProps): React.JSX.Element {
  const {
    servers,
    isLoadingServers,
    installedServerIds,
    selectedServerIds,
    onChangeSelectedServerIds,
    clients,
    selectedClientIds,
    onChangeSelectedClientIds,
    isInstalling,
    onInstall,
    onOpenServer
  } = props
  const [search, setSearch] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [category, setCategory] = useState<string>('All')
  /** The wall is the default; the full catalogue is somewhere you choose to go. */
  const [browsingAll, setBrowsingAll] = useState(false)

  const installedClients = clients.filter((c) => c.installed)
  const detectedClientIds = installedClients.map((c) => c.id)

  const featured = useMemo(() => {
    const byId = new Map(servers.map((s) => [s.id, s]))
    const picked = FEATURED_IDS.map((id) => byId.get(id)).filter(
      (s): s is MergedServerEntry => Boolean(s)
    )
    // If curation hasn't loaded, fall back to whatever is verified so the wall is
    // never empty on a cold start.
    if (picked.length >= 6) return picked
    return [...picked, ...servers.filter((s) => s.curation?.verified && !picked.includes(s))].slice(0, 9)
  }, [servers])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of servers) counts.set(s.category, (counts.get(s.category) ?? 0) + 1)
    return ['All', ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)]
  }, [servers])

  // Ranked once per catalogue change, not per keystroke — scoring 15,000 entries on
  // every character typed is the difference between instant and janky.
  const ranked = useMemo(() => rankServers(servers), [servers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ranked.filter((s) => {
      if (verifiedOnly && !s.curation?.verified) return false
      if (category !== 'All' && s.category !== category) return false
      if (!q) return true
      return (
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      )
    })
  }, [ranked, search, verifiedOnly, category])

  /** The registry is ~15,000 entries; only a window of them is ever mounted. */
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, category, verifiedOnly, browsingAll])

  function toggleServer(id: string, checked: boolean): void {
    onChangeSelectedServerIds(
      checked ? [...selectedServerIds, id] : selectedServerIds.filter((x) => x !== id)
    )
  }

  function toggleClient(id: ClientId): void {
    onChangeSelectedClientIds(
      selectedClientIds.includes(id)
        ? selectedClientIds.filter((x) => x !== id)
        : [...selectedClientIds, id]
    )
  }

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((s) => selectedServerIds.includes(s.id))

  function toggleSelectAll(): void {
    if (allVisibleSelected) {
      const visible = new Set(filtered.map((s) => s.id))
      onChangeSelectedServerIds(selectedServerIds.filter((id) => !visible.has(id)))
    } else {
      const merged = new Set([...selectedServerIds, ...filtered.map((s) => s.id)])
      onChangeSelectedServerIds([...merged])
    }
  }

  const showActionBar = selectedServerIds.length > 0

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pb-32">
        {!browsingAll ? (
          /* ---------------- The wall ---------------- */
          <div className="flex flex-col gap-7 pt-2">
            <div className="flex flex-col gap-2">
              <h2 className="font-heading text-[1.65rem] font-semibold leading-tight text-foreground">
                Give your AI something new
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                Each of these adds a capability to the apps you already use — reading your
                documents, driving a browser, remembering what you told it.
              </p>
            </div>

            {isLoadingServers && servers.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="surface-raised flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
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
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {featured.map((server, index) => (
                  <motion.div
                    key={server.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRING.standard, delay: staggerDelay(index) }}
                    className="flex"
                  >
                    <ServerCard
                      server={server}
                      installed={installedServerIds.includes(server.id)}
                      selected={selectedServerIds.includes(server.id)}
                      detectedClientIds={detectedClientIds}
                      onOpen={onOpenServer}
                      onToggle={toggleServer}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setBrowsingAll(true)}
              className="focus-ring surface-raised mx-auto flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-elevated"
            >
              Browse all {servers.length || ''} servers
            </button>
          </div>
        ) : (
          /* ---------------- The full catalogue ---------------- */
          <div className="flex flex-col gap-4 pt-2">
            <button
              type="button"
              onClick={() => setBrowsingAll(false)}
              className="focus-ring -ml-1 flex w-fit items-center gap-1.5 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Featured
            </button>

            <div className="relative">
              <ListFilter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter these servers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Filter these servers"
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

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={verifiedOnly} onCheckedChange={(v: boolean) => setVerifiedOnly(v)} />
                Verified only
              </label>
              {filtered.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="focus-ring rounded-sm text-xs font-medium text-accent-foreground hover:underline"
                >
                  {allVisibleSelected ? 'Clear selection' : `Select all ${filtered.length}`}
                </button>
              )}
            </div>

            <div className="grid auto-rows-min gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((server, index) => (
                <motion.div
                  key={server.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING.standard, delay: staggerDelay(index % PAGE_SIZE, 8) }}
                  className="flex"
                >
                  <ServerCard
                    server={server}
                    installed={installedServerIds.includes(server.id)}
                    selected={selectedServerIds.includes(server.id)}
                    detectedClientIds={detectedClientIds}
                    onOpen={onOpenServer}
                    onToggle={toggleServer}
                  />
                </motion.div>
              ))}

              {!isLoadingServers && filtered.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center gap-1 py-16 text-center">
                  <p className="text-sm font-medium text-foreground">No match for these filters</p>
                  <p className="text-xs text-muted-foreground">
                    Try another category, or clear the filter to see all {servers.length}.
                  </p>
                </div>
              )}
            </div>

            {visible.length < filtered.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="focus-ring surface-raised mx-auto flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-elevated"
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

      {/* The action bar only exists once there's something to act on. */}
      <motion.div
        initial={false}
        animate={showActionBar ? { y: 0, opacity: 1 } : { y: 80, opacity: 0 }}
        transition={SPRING.standard}
        className="pointer-events-none absolute inset-x-0 bottom-0"
        aria-hidden={!showActionBar}
      >
        <div className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center gap-3 border-t border-border bg-background/85 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs text-muted-foreground">Install into</span>
            {installedClients.length === 0 ? (
              <span className="text-xs text-muted-foreground">No apps detected</span>
            ) : (
              installedClients.map((client) => {
                const on = selectedClientIds.includes(client.id)
                return (
                  <button
                    key={client.id}
                    onClick={() => toggleClient(client.id)}
                    className={cn(
                      'focus-ring flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      on
                        ? 'border-primary/50 bg-accent text-accent-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-elevated'
                    )}
                  >
                    {on && <Check className="size-3" />}
                    {client.displayName}
                  </button>
                )
              })
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{selectedServerIds.length} selected</span>
            <ShimmerButton
              disabled={selectedServerIds.length === 0 || selectedClientIds.length === 0 || isInstalling}
              onClick={onInstall}
              background="var(--primary)"
              shimmerColor="#ffffff"
              shimmerDuration="2.5s"
              borderRadius="999px"
              className="h-10 rounded-full border-none px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Klik it
            </ShimmerButton>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
