import React from 'react'
import { RefreshCw, ExternalLink, Palette, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { KlikLogo } from '../components/KlikLogo'

interface SettingsViewProps {
  serverCount: number
  fromCache: boolean
  isRefreshing: boolean
  onRefresh: () => void
}

function Row({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

export function SettingsView(props: SettingsViewProps): React.JSX.Element {
  const { serverCount, fromCache, isRefreshing, onRefresh } = props

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="surface-raised flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <KlikLogo size={40} showWordmark={false} />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-heading text-lg font-bold text-foreground">Klik</span>
            <Badge variant="outline">v{__APP_VERSION__}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            One-click installer for MCP servers into your desktop clients.
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/40 px-5">
        <Row
          icon={Database}
          title="Server registry"
          description={
            fromCache
              ? `${serverCount} servers · showing cached data`
              : `${serverCount} servers loaded from the registry`
          }
          action={
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={isRefreshing ? 'size-4 animate-spin' : 'size-4'} /> Refresh
            </Button>
          }
        />
        <Separator />
        <Row
          icon={Palette}
          title="Appearance"
          description="Klik ships a single, carefully tuned copper-on-graphite dark theme."
          action={<Badge variant="outline">Dark</Badge>}
        />
        <Separator />
        <Row
          icon={ExternalLink}
          title="Source code"
          description="Klik is open source. Report issues or contribute on GitHub."
          action={
            <Button
              variant="outline"
              size="sm"
              render={
                <a href="https://github.com/adityasingh38/klik" target="_blank" rel="noreferrer" />
              }
            >
              <ExternalLink className="size-4" /> GitHub
            </Button>
          }
        />
      </div>
    </div>
  )
}
