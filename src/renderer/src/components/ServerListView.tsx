import React, { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
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

  const filteredServers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return servers
    return servers.filter(
      (server) => server.title.toLowerCase().includes(query) || server.description.toLowerCase().includes(query)
    )
  }, [servers, search])

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
      <Input
        placeholder="Search MCP servers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search MCP servers"
      />

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Install into</p>
        <div className="flex flex-col gap-px overflow-hidden rounded-md border border-border">
          {clients.map((client) => (
            <label
              key={client.id}
              className={cn(
                'flex items-center gap-3 bg-card px-3 py-2 transition-colors',
                client.installed ? 'has-[[data-checked]]:bg-accent' : 'cursor-not-allowed opacity-50'
              )}
            >
              <Checkbox
                checked={selectedClientIds.includes(client.id)}
                disabled={!client.installed}
                onCheckedChange={(checked: boolean) => toggleClient(client.id, checked)}
              />
              <div className="flex flex-col">
                <span className="text-sm">{client.displayName}</span>
                {!client.installed && (
                  <span className="text-xs text-muted-foreground">Not detected on this machine</span>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">MCP servers</p>
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
          {isLoadingServers && servers.length === 0
            ? Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 bg-card px-3 py-2">
                  <Skeleton className="size-4 rounded-[4px]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))
            : filteredServers.map((server) => {
                const isInstalled = installedServerIds.includes(server.id)
                return (
                  <div
                    key={server.id}
                    className="flex items-center justify-between gap-3 bg-card px-3 py-2 has-[[data-checked]]:bg-accent"
                  >
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
                        <Button variant="destructive" size="sm" onClick={() => onUninstall(server.id)}>
                          Uninstall
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-muted-foreground">{selectedServerIds.length} selected</span>
        <Button
          disabled={selectedServerIds.length === 0 || selectedClientIds.length === 0 || isInstalling}
          onClick={onInstall}
        >
          Get Your Klik
        </Button>
      </div>
    </div>
  )
}
