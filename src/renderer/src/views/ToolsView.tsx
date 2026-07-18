import React from 'react'
import { Plug, Check, Server, Sparkles, Blocks } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { ToolMark } from '../components/ToolBadges'
import { toolBrand } from '../../../shared/tools'
import { cn } from '@/lib/utils'
import type { DetectedTool } from '../../../shared/catalog'
import type { ClientId } from '../../../shared/types'

interface ToolsViewProps {
  tools: DetectedTool[]
  /** MCP install targets — only meaningful for tools with an mcp capability. */
  selectedClientIds: ClientId[]
  onToggleClient: (id: ClientId) => void
}

const CAPABILITY_META = {
  mcp: { label: 'MCP servers', icon: Server },
  skills: { label: 'Skills', icon: Sparkles },
  plugins: { label: 'Plugins', icon: Blocks }
} as const

/** One capability a tool exposes, with the path Klik would actually write to. */
function CapabilityRow({
  kind,
  path
}: {
  kind: keyof typeof CAPABILITY_META
  path: string
}): React.JSX.Element {
  const { label, icon: Icon } = CAPABILITY_META[kind]
  return (
    <div className="flex items-baseline gap-2">
      <span className="flex w-28 shrink-0 items-center gap-1.5 text-xs text-foreground">
        <Icon className="size-3.5 shrink-0 text-primary" />
        {label}
      </span>
      <span className="truncate font-mono text-[11px] text-muted-foreground" title={path}>
        {path}
      </span>
    </div>
  )
}

export function ToolsView(props: ToolsViewProps): React.JSX.Element {
  const { tools, selectedClientIds, onToggleClient } = props

  if (tools.length === 0) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Plug />
          </EmptyMedia>
          <EmptyTitle>No AI tools found</EmptyTitle>
          <EmptyDescription>
            Klik installs into Claude Desktop, Claude Code, Cursor, and VS Code. Install one of them
            and it will show up here with everything Klik can write into it.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  // Present tools first — what's actually usable leads.
  const ordered = [...tools].sort((a, b) => Number(b.installed) - Number(a.installed))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        What Klik can write into each tool on this machine, and where.
      </p>

      {ordered.map((tool) => {
        const brand = toolBrand(tool.id)
        const isMcpTarget = selectedClientIds.includes(tool.id as ClientId)
        const capabilities = Object.keys(tool.capabilities) as Array<keyof typeof CAPABILITY_META>

        return (
          <div
            key={tool.id}
            className={cn(
              'surface-raised flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors',
              !tool.installed && 'opacity-60'
            )}
          >
            <div className="flex items-start gap-3">
              {brand && <ToolMark brand={brand} detected={tool.installed} size={20} />}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{tool.displayName}</span>
                  {tool.installed ? (
                    <Badge className="bg-success text-success-foreground">Detected</Badge>
                  ) : (
                    <Badge variant="outline">Not installed</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {capabilities.length === 1
                    ? 'Accepts 1 kind of install'
                    : `Accepts ${capabilities.length} kinds of install`}
                </span>
              </div>

              {tool.installed && tool.capabilities.mcp && (
                <button
                  onClick={() => onToggleClient(tool.id as ClientId)}
                  className={cn(
                    'focus-ring flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    isMcpTarget
                      ? 'border-primary/50 bg-accent text-accent-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-elevated'
                  )}
                  aria-pressed={isMcpTarget}
                >
                  {isMcpTarget && <Check className="size-3" />}
                  {isMcpTarget ? 'MCP target' : 'Use for MCP'}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
              {tool.capabilities.mcp && (
                <CapabilityRow kind="mcp" path={tool.capabilities.mcp.configPath} />
              )}
              {tool.capabilities.skills && (
                <CapabilityRow kind="skills" path={tool.capabilities.skills.dir} />
              )}
              {tool.capabilities.plugins && (
                <CapabilityRow kind="plugins" path={tool.capabilities.plugins.pluginsDir} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
