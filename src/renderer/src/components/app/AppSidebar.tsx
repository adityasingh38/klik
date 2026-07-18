import React from 'react'
import { Compass, Sparkles, Blocks, Boxes, Plug, Settings } from 'lucide-react'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge
} from '@/components/ui/sidebar'
import { KlikMark, KlikLogo } from '../KlikLogo'
import { useSidebar } from '@/components/ui/sidebar'

export type AppSection = 'mcp' | 'skills' | 'plugins' | 'installed' | 'tools' | 'settings'

interface AppSidebarProps {
  active: AppSection
  onSelect: (section: AppSection) => void
  serverCount: number
  skillCount: number
  pluginCount: number
  installedCount: number
  toolCount: number
}

type NavItem = { id: AppSection; label: string; icon: React.ComponentType<{ className?: string }> }

const CATALOG_NAV: NavItem[] = [
  { id: 'mcp', label: 'MCP Servers', icon: Compass },
  { id: 'skills', label: 'Skills', icon: Sparkles },
  { id: 'plugins', label: 'Plugins', icon: Blocks }
]

const MANAGE_NAV: NavItem[] = [
  { id: 'installed', label: 'Installed', icon: Boxes },
  { id: 'tools', label: 'Tools', icon: Plug },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export function AppSidebar(props: AppSidebarProps): React.JSX.Element {
  const { active, onSelect, serverCount, skillCount, pluginCount, installedCount, toolCount } = props
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  const badgeFor: Record<AppSection, number | null> = {
    mcp: serverCount || null,
    skills: skillCount || null,
    plugins: pluginCount || null,
    installed: installedCount || null,
    tools: toolCount || null,
    settings: null
  }

  function renderGroup(label: string, items: NavItem[]): React.JSX.Element {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              const Icon = item.icon
              const count = badgeFor[item.id]
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={active === item.id}
                    tooltip={item.label}
                    onClick={() => onSelect(item.id)}
                    className="data-[active=true]:text-primary"
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {count != null && <SidebarMenuBadge>{count}</SidebarMenuBadge>}
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="app-drag">
        <div className="no-drag flex h-9 items-center px-1">
          {collapsed ? <KlikMark size={26} /> : <KlikLogo size={26} />}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup('Catalog', CATALOG_NAV)}
        {renderGroup('Manage', MANAGE_NAV)}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:justify-center">
          <span className="size-1.5 shrink-0 rounded-full bg-success-foreground shadow-[0_0_6px] shadow-success-foreground/60" />
          <span className="group-data-[collapsible=icon]:hidden">Registry connected · v{__APP_VERSION__}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
