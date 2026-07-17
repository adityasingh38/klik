import React from 'react'
import { Plug, Check, FolderOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import type { ClientId, ClientInfo } from '../../../shared/types'

interface ClientsViewProps {
  clients: ClientInfo[]
  selectedClientIds: ClientId[]
  onToggleClient: (id: ClientId) => void
}

export function ClientsView(props: ClientsViewProps): React.JSX.Element {
  const { clients, selectedClientIds, onToggleClient } = props

  if (clients.length === 0) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Plug />
          </EmptyMedia>
          <EmptyTitle>No MCP clients found</EmptyTitle>
          <EmptyDescription>
            Klik installs into Claude Desktop, Cursor, and VS Code. Install one of them to get started.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Choose which detected clients new installs are written into.
      </p>
      {clients.map((client) => {
        const isTarget = selectedClientIds.includes(client.id)
        return (
          <div
            key={client.id}
            className={cn(
              'surface-raised flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors',
              client.installed ? 'border-border' : 'border-border opacity-60'
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{client.displayName}</span>
                {client.installed ? (
                  <Badge className="bg-success text-success-foreground">Detected</Badge>
                ) : (
                  <Badge variant="outline">Not installed</Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FolderOpen className="size-3.5 shrink-0" />
                <span className="truncate font-mono">{client.configPath}</span>
              </div>
            </div>
            {client.installed && (
              <button
                onClick={() => onToggleClient(client.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  isTarget
                    ? 'border-primary/50 bg-accent text-accent-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-elevated'
                )}
              >
                {isTarget && <Check className="size-3" />}
                {isTarget ? 'Install target' : 'Enable'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
