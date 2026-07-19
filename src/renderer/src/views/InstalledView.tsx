import React from 'react'
import { Boxes, Trash2, Compass, Sparkles, Blocks, Server } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { ServerLogo } from '../components/ServerLogo'
import { itemColor, itemWash } from '@/lib/itemColor'
import type {
  ClientId,
  ClientInfo,
  InstalledServerRecord,
  MergedServerEntry
} from '../../../shared/types'
import type { InstalledSkillRecord, SkillEntry, PluginEntry } from '../../../shared/catalog'

interface InstalledPluginInfo {
  id: string
  version: string
  enabled: boolean
  installPath: string
}

interface InstalledViewProps {
  servers: MergedServerEntry[]
  installed: InstalledServerRecord[]
  clients: ClientInfo[]
  skills: SkillEntry[]
  installedSkills: InstalledSkillRecord[]
  plugins: PluginEntry[]
  installedPlugins: InstalledPluginInfo[]
  onUninstall: (serverId: string) => void
  onUninstallSkill: (skillId: string) => void
  onUninstallPlugin: (pluginId: string) => void
  onOpenServer: (server: MergedServerEntry) => void
  onGoDiscover: () => void
}

/** One installed thing, whatever kind it is. */
interface Row {
  key: string
  title: string
  subtitle: string
  /** Where it went — client names, tool names, or the marketplace. */
  targets: string[]
  color: string
  logo: React.ReactNode
  onOpen?: () => void
  onRemove: () => void
  confirm: string
}

function Section({
  icon: Icon,
  title,
  rows
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  rows: Row[]
}): React.JSX.Element | null {
  if (rows.length === 0) return null
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="size-4" />
        {title}
        <span className="text-muted-foreground">{rows.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="surface-raised flex items-center gap-3 rounded-xl border border-border px-3.5 py-3 transition-colors"
            style={{ background: itemWash(row.color, 6) }}
          >
            {row.onOpen ? (
              <button
                onClick={row.onOpen}
                className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-sm pr-3 text-left"
              >
                {row.logo}
                <RowText row={row} />
              </button>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3 pr-3">
                {row.logo}
                <RowText row={row} />
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                if (window.confirm(row.confirm)) row.onRemove()
              }}
            >
              <Trash2 className="size-4" /> Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function RowText({ row }: { row: Row }): React.JSX.Element {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate font-heading text-[0.95rem] font-semibold text-foreground">
        {row.title}
      </span>
      <span className="truncate text-xs text-muted-foreground">{row.subtitle}</span>
      {row.targets.length > 0 && (
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {row.targets.map((t) => (
            <Badge key={t} variant="outline" className="text-[11px]">
              {t}
            </Badge>
          ))}
        </span>
      )}
    </span>
  )
}

/** Everything Klik has installed, of every kind — not just MCP servers. */
export function InstalledView(props: InstalledViewProps): React.JSX.Element {
  const {
    servers,
    installed,
    clients,
    skills,
    installedSkills,
    plugins,
    installedPlugins,
    onUninstall,
    onUninstallSkill,
    onUninstallPlugin,
    onOpenServer,
    onGoDiscover
  } = props

  const clientName = (id: ClientId): string => clients.find((c) => c.id === id)?.displayName ?? id

  const serverRows: Row[] = installed
    .map((record) => ({ record, server: servers.find((s) => s.id === record.serverId) }))
    .filter((r): r is { record: InstalledServerRecord; server: MergedServerEntry } => Boolean(r.server))
    .map(({ record, server }) => ({
      key: server.id,
      title: server.title,
      subtitle: server.description,
      targets: record.clients.map(clientName),
      color: itemColor(server.id, server.title),
      logo: <ServerLogo server={server} size={34} className="rounded-lg" />,
      onOpen: () => onOpenServer(server),
      onRemove: () => onUninstall(server.id),
      confirm: `Remove ${server.title} from your MCP clients?`
    }))

  const skillRows: Row[] = installedSkills.map((record) => {
    const skill = skills.find((s) => s.id === record.skillId)
    const title = skill?.title ?? record.installName
    const color = itemColor(record.skillId, title)
    return {
      key: record.skillId,
      title,
      subtitle: skill?.description ?? `Installed as ${record.installName}`,
      targets: record.tools.map((t) => (t === 'claude-code' ? 'Claude Code' : t)),
      color,
      logo: (
        <span
          className="flex size-[34px] shrink-0 items-center justify-center rounded-lg border border-border/60"
          style={{ background: itemWash(color, 22), color }}
        >
          <Sparkles className="size-4" />
        </span>
      ),
      onRemove: () => onUninstallSkill(record.skillId),
      confirm: `Delete the "${record.installName}" skill folder?`
    }
  })

  const pluginRows: Row[] = installedPlugins.map((record) => {
    const plugin = plugins.find((p) => p.id === record.id)
    const title = plugin?.title ?? record.id.split('@')[0]
    const color = itemColor(record.id, title)
    return {
      key: record.id,
      title,
      subtitle: plugin?.description ?? record.id,
      targets: [
        record.enabled ? 'Enabled' : 'Disabled',
        ...(record.version && record.version !== 'unknown' ? [`v${record.version}`] : [])
      ],
      color,
      logo: (
        <span
          className="flex size-[34px] shrink-0 items-center justify-center rounded-lg border border-border/60"
          style={{ background: itemWash(color, 22), color }}
        >
          <Blocks className="size-4" />
        </span>
      ),
      onRemove: () => onUninstallPlugin(record.id),
      confirm: `Uninstall ${title} from Claude Code?`
    }
  })

  const total = serverRows.length + skillRows.length + pluginRows.length

  if (total === 0) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Boxes />
          </EmptyMedia>
          <EmptyTitle>Nothing installed yet</EmptyTitle>
          <EmptyDescription>
            Servers, skills and plugins you install through Klik all collect here, ready to manage
            in one place.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onGoDiscover}>
            <Compass className="size-4" /> Browse the catalogue
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <Section icon={Server} title="MCP servers" rows={serverRows} />
      <Section icon={Sparkles} title="Skills" rows={skillRows} />
      <Section icon={Blocks} title="Plugins" rows={pluginRows} />
      {pluginRows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Plugins are read from Claude Code, so this includes ones you installed there
          directly — not only what Klik added.
        </p>
      )}
    </div>
  )
}
