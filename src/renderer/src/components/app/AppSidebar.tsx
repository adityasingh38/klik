import React from 'react'
import { Compass, Boxes, Plug, Settings } from 'lucide-react'
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

export type AppSection = 'discover' | 'installed' | 'clients' | 'settings'

interface AppSidebarProps {
  active: AppSection
  onSelect: (section: AppSection) => void
  serverCount: number
  installedCount: number
  clientCount: number
}

const NAV: Array<{ id: AppSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'installed', label: 'Installed', icon: Boxes },
  { id: 'clients', label: 'Clients', icon: Plug },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export function AppSidebar(props: AppSidebarProps): React.JSX.Element {
  const { active, onSelect, serverCount, installedCount, clientCount } = props
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  const badgeFor: Record<AppSection, number | null> = {
    discover: serverCount || null,
    installed: installedCount || null,
    clients: clientCount || null,
    settings: null
  }

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="app-drag">
        <div className="no-drag flex h-9 items-center px-1">
          {collapsed ? <KlikMark size={26} /> : <KlikLogo size={26} />}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
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
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:justify-center">
          <span className="size-1.5 shrink-0 rounded-full bg-success-foreground shadow-[0_0_6px] shadow-success-foreground/60" />
          <span className="group-data-[collapsible=icon]:hidden">Registry connected · v0.1.0</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
