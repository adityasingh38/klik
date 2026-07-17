import React from 'react'
import { Boxes, Trash2, Compass } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { ServerLogo } from '../components/ServerLogo'
import { cn } from '@/lib/utils'
import type { ClientId, ClientInfo, InstalledServerRecord, MergedServerEntry } from '../../../shared/types'

interface InstalledViewProps {
  servers: MergedServerEntry[]
  installed: InstalledServerRecord[]
  clients: ClientInfo[]
  onUninstall: (serverId: string) => void
  onOpenServer: (server: MergedServerEntry) => void
  onGoDiscover: () => void
}

export function InstalledView(props: InstalledViewProps): React.JSX.Element {
  const { servers, installed, clients, onUninstall, onOpenServer, onGoDiscover } = props
  const clientName = (id: ClientId): string => clients.find((c) => c.id === id)?.displayName ?? id

  const rows = installed
    .map((record) => ({ record, server: servers.find((s) => s.id === record.serverId) }))
    .filter((r): r is { record: InstalledServerRecord; server: MergedServerEntry } => Boolean(r.server))

  if (rows.length === 0) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Boxes />
          </EmptyMedia>
          <EmptyTitle>No servers installed yet</EmptyTitle>
          <EmptyDescription>
            Servers you install into your MCP clients will show up here, ready to manage.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onGoDiscover}>
            <Compass className="size-4" /> Browse servers
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ record, server }) => (
        <div
          key={server.id}
          className={cn(
            'surface-raised flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:bg-elevated'
          )}
        >
          <button onClick={() => onOpenServer(server)} className="flex min-w-0 flex-1 items-center gap-3 pr-3 text-left">
            <ServerLogo server={server} size={32} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{server.title}</span>
              <span className="truncate text-xs text-muted-foreground">{server.description}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {record.clients.map((cid) => (
                  <Badge key={cid} variant="outline" className="text-[10px]">
                    {clientName(cid)}
                  </Badge>
                ))}
              </span>
            </span>
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              if (window.confirm(`Uninstall ${server.title}?`)) onUninstall(server.id)
            }}
          >
            <Trash2 className="size-4" /> Uninstall
          </Button>
        </div>
      ))}
    </div>
  )
}
