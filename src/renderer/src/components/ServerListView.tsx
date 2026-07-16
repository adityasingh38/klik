import React, { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { MagicCard } from '@/components/ui/magic-card'
import { BorderBeam } from '@/components/ui/border-beam'
import { BlurFade } from '@/components/ui/blur-fade'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import type { ClientId, ClientInfo, MergedServerEntry } from '../../../shared/types'

interface ServerListViewProps {
  servers: MergedServerEntry[]
  isLoadingServers: boolean
  clients: ClientInfo[]
  installedServerIds: string[]
  selectedServerIds: string[]
  onChangeSelectedServerIds: (ids: string[]) => void
  selectedClientIds: ClientId[]
  onChangeSelectedClientIds: (ids: ClientId[]) => void
  onInstall: () => void
  isInstalling: boolean
  onUninstall: (serverId: string) => void
}

export function ServerListView(props: ServerListViewProps): React.JSX.Element {
  const {
    servers,
    isLoadingServers,
    clients,
    installedServerIds,
    selectedServerIds,
    onChangeSelectedServerIds,
    selectedClientIds,
    onChangeSelectedClientIds,
    onInstall,
    isInstalling,
    onUninstall
  } = props
  const [search, setSearch] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [hasEnteredList, setHasEnteredList] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  useEffect(() => {
    if (!isLoadingServers && servers.length > 0) setHasEnteredList(true)
  }, [isLoadingServers, servers.length])

  const filteredServers = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matchesQuery = (server: MergedServerEntry): boolean =>
      !query || server.title.toLowerCase().includes(query) || server.description.toLowerCase().includes(query)
    return servers.filter(
      (server) => matchesQuery(server) && (!verifiedOnly || server.curation?.verified === true)
    )
  }, [servers, search, verifiedOnly])

  const allVisibleSelected =
    filteredServers.length > 0 && filteredServers.every((server) => selectedServerIds.includes(server.id))

  function toggleSelectAllVisible(): void {
    const visibleIds = filteredServers.map((server) => server.id)
    if (allVisibleSelected) {
      onChangeSelectedServerIds(selectedServerIds.filter((id) => !visibleIds.includes(id)))
    } else {
      onChangeSelectedServerIds([...new Set([...selectedServerIds, ...visibleIds])])
    }
  }

  function toggleServer(serverId: string, checked: boolean): void {
    if (checked) {
      onChangeSelectedServerIds([...selectedServerIds, serverId])
    } else {
      onChangeSelectedServerIds(selectedServerIds.filter((id) => id !== serverId))
    }
  }

  function toggleClient(clientId: ClientId, checked: boolean): void {
    if (checked) {
      onChangeSelectedClientIds([...selectedClientIds, clientId])
    } else {
      onChangeSelectedClientIds(selectedClientIds.filter((id) => id !== clientId))
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="relative rounded-lg">
        <Input
          placeholder="Search MCP servers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          aria-label="Search MCP servers"
        />
        {isSearchFocused && <BorderBeam size={40} duration={4} colorFrom="#e0873f" colorTo="#f2c98c" />}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">Install into</p>
        <div className="flex flex-col gap-px overflow-hidden rounded-md border border-border">
          {clients.map((client) => (
            <label
              key={client.id}
              className={cn(
                'flex min-w-0 items-center gap-3 bg-card px-3 py-2 transition-colors',
                client.installed ? 'has-[[data-checked]]:bg-accent' : 'cursor-not-allowed opacity-50'
              )}
            >
              <Checkbox
                checked={selectedClientIds.includes(client.id)}
                disabled={!client.installed}
                onCheckedChange={(checked: boolean) => toggleClient(client.id, checked)}
              />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm">{client.displayName}</span>
                {!client.installed && (
                  <span className="truncate text-xs text-muted-foreground">Not detected on this machine</span>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">MCP servers</p>
          {!isLoadingServers && servers.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox checked={verifiedOnly} onCheckedChange={(checked: boolean) => setVerifiedOnly(checked)} />
                Verified only
              </label>
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                disabled={filteredServers.length === 0}
                className="text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
              >
                {allVisibleSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {isLoadingServers && servers.length === 0
            ? Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
                  <Skeleton className="size-4 rounded-[4px]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))
            : filteredServers.map((server, index) => {
                const isInstalled = installedServerIds.includes(server.id)
                const row = (
                  <MagicCard
                    className="rounded-md"
                    gradientColor="#2c2521"
                    gradientOpacity={0.5}
                    gradientFrom="#e0873f"
                    gradientTo="#f2c98c"
                  >
                    <div className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2 has-[[data-checked]]:bg-accent">
                      <label className="flex min-w-0 flex-1 items-center gap-3">
                        <Checkbox
                          checked={selectedServerIds.includes(server.id)}
                          onCheckedChange={(checked: boolean) => toggleServer(server.id, checked)}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="text-sm">{server.title}</span>
                          <span className="truncate text-xs text-muted-foreground">{server.description}</span>
                        </div>
                      </label>
                      <div className="flex shrink-0 items-center gap-2">
                        {server.curation?.verified && (
                          <Badge className="bg-accent text-accent-foreground">Verified</Badge>
                        )}
                        {isInstalled && <Badge className="bg-success text-success-foreground">Installed</Badge>}
                        {isInstalled && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Uninstall ${server.title}?`)) onUninstall(server.id)
                            }}
                          >
                            Uninstall
                          </Button>
                        )}
                      </div>
                    </div>
                  </MagicCard>
                )
                // Only animate the entrance on first load — replaying it on every
                // search-driven filter change would fight the fastest, most-repeated
                // interaction in the app.
                if (hasEnteredList) return <React.Fragment key={server.id}>{row}</React.Fragment>
                return (
                  <BlurFade key={server.id} delay={index * 0.03} duration={0.3} direction="up">
                    {row}
                  </BlurFade>
                )
              })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-muted-foreground">{selectedServerIds.length} selected</span>
        <ShimmerButton
          disabled={selectedServerIds.length === 0 || selectedClientIds.length === 0 || isInstalling}
          onClick={onInstall}
          background="var(--primary)"
          shimmerColor="#eeeae2"
          shimmerDuration="2.5s"
          borderRadius="var(--radius-lg)"
          className="h-8 rounded-lg border-none px-3 text-sm font-medium text-primary-foreground"
        >
          Get Your Klik
        </ShimmerButton>
      </div>
    </div>
  )
}
