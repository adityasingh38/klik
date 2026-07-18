import React, { useMemo, useState } from 'react'
import { ListFilter, Check, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { BlurFade } from '@/components/ui/blur-fade'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { ServerLogo } from '../components/ServerLogo'
import { HostCompat } from '../components/HostCompat'
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

function MetaTag({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="rounded border border-border/70 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
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

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of servers) counts.set(s.category, (counts.get(s.category) ?? 0) + 1)
    return ['All', ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)]
  }, [servers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return servers.filter((s) => {
      if (verifiedOnly && !s.curation?.verified) return false
      if (category !== 'All' && s.category !== category) return false
      if (!q) return true
      return (
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      )
    })
  }, [servers, search, verifiedOnly, category])

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

  const installedClients = clients.filter((c) => c.installed)
  const detectedClientIds = installedClients.map((c) => c.id)

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex flex-col gap-4 pb-4">
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

        {/* Category chips */}
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
          {!isLoadingServers && filtered.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="focus-ring rounded-sm text-xs font-medium text-accent-foreground hover:underline"
            >
              {allVisibleSelected ? 'Clear selection' : `Select all ${filtered.length}`}
            </button>
          )}
        </div>
      </div>

      {/* Rows */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-28">
        {isLoadingServers && servers.length === 0
          ? Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="surface-raised flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
              >
                <Skeleton className="size-4 rounded-[4px]" />
                <Skeleton className="size-8 shrink-0 rounded-md" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-full max-w-md" />
                </div>
              </div>
            ))
          : filtered.map((server, index) => {
              const isInstalled = installedServerIds.includes(server.id)
              const isSelected = selectedServerIds.includes(server.id)
              const row = (
                <div
                  className={cn(
                    'surface-raised flex items-center gap-3 overflow-hidden rounded-md border px-3 py-2.5 transition-colors',
                    isSelected ? 'border-primary/40 bg-elevated' : 'border-border bg-card hover:bg-elevated'
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked: boolean) => toggleServer(server.id, checked)}
                    aria-label={`Select ${server.title}`}
                  />
                  <button
                    onClick={() => onOpenServer(server)}
                    className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left"
                  >
                    <ServerLogo server={server} size={32} />
                    <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{server.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{server.description}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <MetaTag>{server.transport}</MetaTag>
                      {server.requiredRuntime.map((rt) => (
                        <MetaTag key={rt}>{rt}</MetaTag>
                      ))}
                      <MetaTag>{server.category}</MetaTag>
                    </span>
                    <HostCompat
                      transport={server.transport}
                      detectedClientIds={detectedClientIds}
                      variant="inline"
                      className="mt-1.5"
                    />
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {server.curation?.verified && (
                      <Badge className="gap-1 bg-accent text-accent-foreground">
                        <ShieldCheck className="size-3" /> Verified
                      </Badge>
                    )}
                    {(server.curation?.warnings?.length ?? 0) > 0 && (
                      <span title={server.curation?.warnings.join(' · ')}>
                        <TriangleAlert className="size-4 text-destructive" />
                      </span>
                    )}
                    {isInstalled && <Badge className="bg-success text-success-foreground">Installed</Badge>}
                  </div>
                </div>
              )
              return index < 12 ? (
                <BlurFade key={server.id} direction="up" duration={0.2} delay={index * 0.02}>
                  {row}
                </BlurFade>
              ) : (
                <div key={server.id}>{row}</div>
              )
            })}

        {!isLoadingServers && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No servers match your filters</p>
            <p className="text-xs text-muted-foreground">Try a different category or clear the search.</p>
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center gap-3 border-t border-border bg-background/85 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs text-muted-foreground">Install into</span>
            {installedClients.length === 0 ? (
              <span className="text-xs text-muted-foreground">No clients detected</span>
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
              disabled={
                selectedServerIds.length === 0 || selectedClientIds.length === 0 || isInstalling
              }
              onClick={onInstall}
              background="var(--primary)"
              shimmerColor="#eeeae2"
              shimmerDuration="2.5s"
              borderRadius="var(--radius-lg)"
              className="h-9 rounded-lg border-none px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Get Your Klik
            </ShimmerButton>
          </div>
        </div>
      </div>
    </div>
  )
}
