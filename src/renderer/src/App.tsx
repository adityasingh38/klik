import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Kbd } from '@/components/ui/kbd'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { AppSidebar, type AppSection } from './components/app/AppSidebar'
import { ServerDetailDrawer } from './components/app/ServerDetailDrawer'
import { CommandPalette, type PaletteItem } from './components/app/CommandPalette'
import { InstallPreviewDialog } from './components/app/InstallPreviewDialog'
import { DiscoverView, FEATURED_IDS } from './views/DiscoverView'
import { SkillsView } from './views/SkillsView'
import { PluginsView } from './views/PluginsView'
import { InstalledView } from './views/InstalledView'
import { ToolsView } from './views/ToolsView'
import { SettingsView } from './views/SettingsView'
import { SKILLS_CATALOG } from './data/skillsCatalog'
import { PLUGINS_CATALOG } from './data/pluginsCatalog'
import { InstallProgressView } from './components/InstallProgressView'
import { SecretPromptDialog } from './components/SecretPromptDialog'
import { klikApi } from './api/klikApi'
import { MOD_KEY } from './lib/platform'
import { ThemeProvider, useTheme } from './lib/theme'
import { ThemeToggle } from './components/app/ThemeToggle'
import { FirstRun } from './components/app/FirstRun'
import type {
  ClientId,
  ClientInfo,
  InstalledServerRecord,
  InstallPreview,
  InstallStepResult,
  MergedServerEntry
} from '../../shared/types'
import type { DetectedTool, SkillEntry, InstalledSkillRecord } from '../../shared/catalog'

/** Mirrors the shape Claude Code's CLI reports for an installed plugin. */
interface InstalledPluginRow {
  id: string
  version: string
  enabled: boolean
  installPath: string
}

const SECTION_TITLES: Record<AppSection, { title: string; subtitle: string }> = {
  mcp: { title: 'MCP Servers', subtitle: 'Browse and install MCP servers' },
  skills: { title: 'Skills', subtitle: 'On-demand capabilities for your AI tools' },
  plugins: { title: 'Plugins', subtitle: 'Marketplace bundles: commands, agents, and more' },
  installed: { title: 'Installed', subtitle: 'What your tools currently have, in one place' },
  tools: { title: 'Tools', subtitle: 'Detected AI tools and install targets' },
  settings: { title: 'Settings', subtitle: 'Registry, appearance, and about' }
}

type InstallPhase = 'idle' | 'preview' | 'secrets' | 'progress'

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  )
}

function AppShell(): React.JSX.Element {
  const { onboarded, prefsLoaded, setOnboarded } = useTheme()
  const [servers, setServers] = useState<MergedServerEntry[]>([])
  const [isLoadingServers, setIsLoadingServers] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const [catalogueTotal, setCatalogueTotal] = useState(0)
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [installedRecords, setInstalledRecords] = useState<InstalledServerRecord[]>([])
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<ClientId[]>([])

  const [section, setSection] = useState<AppSection>('mcp')
  const [tools, setTools] = useState<DetectedTool[]>([])
  // Mirrored here purely so the palette can badge results accurately; each catalog
  // still owns its own copy for its list.
  const [installedSkills, setInstalledSkills] = useState<InstalledSkillRecord[]>([])
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPluginRow[]>([])
  /** The live skill catalogue. Starts as the bundled copy, swaps when the fetch lands. */
  const [skills, setSkills] = useState<SkillEntry[]>(SKILLS_CATALOG)
  const detectedToolIds = useMemo(
    () => tools.filter((t) => t.installed).map((t) => t.id),
    [tools]
  )
  const [detailServer, setDetailServer] = useState<MergedServerEntry | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  /** Set when the palette jumps to a skill/plugin, so that catalog opens it. */
  const [focusItem, setFocusItem] = useState<{ kind: 'skill' | 'plugin'; id: string } | null>(null)

  const [phase, setPhase] = useState<InstallPhase>('idle')
  const [results, setResults] = useState<InstallStepResult[]>([])
  const [isInstalling, setIsInstalling] = useState(false)
  const [secretsByServer, setSecretsByServer] = useState<Record<string, Record<string, string>>>({})
  const [pendingSecretServerIds, setPendingSecretServerIds] = useState<string[]>([])
  /** The servers the current install flow is for — set once, before the preview. */
  const [pendingTargets, setPendingTargets] = useState<MergedServerEntry[]>([])
  const [previews, setPreviews] = useState<InstallPreview[]>([])
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [allowRuntimeInstall, setAllowRuntimeInstall] = useState(false)

  const installedServerIds = useMemo(() => installedRecords.map((r) => r.serverId), [installedRecords])

  const refreshInstalled = useCallback((): void => {
    klikApi.getInstalled().then(setInstalledRecords)
  }, [])

  /**
   * Only the wall's nine and the totals cross the process boundary on launch. The
   * full catalogue — ~15,700 entries, 9.5 MB on disk — stays in the main process and
   * is queried a page at a time.
   */
  const loadServers = useCallback((refresh = false): void => {
    if (refresh) setIsRefreshing(true)
    klikApi
      .getFeatured(FEATURED_IDS)
      .then((page) => {
        setServers(page.servers)
        setCatalogueTotal(page.catalogueTotal)
        setFromCache(true)
      })
      .finally(() => {
        setIsLoadingServers(false)
        setIsRefreshing(false)
      })
  }, [])

  useEffect(() => {
    loadServers()
    klikApi.getClients().then((fetched) => {
      setClients(fetched)
      setSelectedClientIds(fetched.filter((c) => c.installed).map((c) => c.id))
    })
    klikApi.getTools().then(setTools)
    klikApi
      .getSkills(SKILLS_CATALOG)
      .then((live) => {
        if (live.length > 0) setSkills(live)
      })
      .catch(() => {})
    klikApi.getInstalledSkills().then(setInstalledSkills)
    klikApi.getInstalledPlugins().then(setInstalledPlugins).catch(() => {})
    refreshInstalled()
  }, [loadServers, refreshInstalled])

  // Cmd/Ctrl+K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The palette is the one surface that reaches across all three catalogs; the
  // per-catalog boxes only filter what's already on screen.
  const paletteItems = useMemo<PaletteItem[]>(() => {
    return [
      ...servers.map((s) => ({
        kind: 'mcp' as const,
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        installed: installedServerIds.includes(s.id),
        server: s
      })),
      ...skills.map((s) => ({
        kind: 'skill' as const,
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        installed: installedSkills.some((r) => r.skillId === s.id)
      })),
      ...PLUGINS_CATALOG.map((p) => ({
        kind: 'plugin' as const,
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        installed: installedPlugins.some((r) => r.id === p.id)
      }))
    ]
  }, [servers, skills, installedServerIds, installedSkills, installedPlugins])

  function handlePaletteSelect(item: PaletteItem): void {
    if (item.kind === 'mcp' && item.server) {
      openServer(item.server)
      return
    }
    setSection(item.kind === 'skill' ? 'skills' : 'plugins')
    setFocusItem({ kind: item.kind === 'skill' ? 'skill' : 'plugin', id: item.id })
  }

  function openServer(server: MergedServerEntry): void {
    setDetailServer(server)
    setDetailOpen(true)
  }

  function handleUninstall(serverId: string): void {
    void klikApi.uninstall(serverId).then(refreshInstalled)
  }

  const selectedServers = useMemo(
    () =>
      selectedServerIds
        .map((id) => servers.find((s) => s.id === id))
        .filter((s): s is MergedServerEntry => Boolean(s)),
    [selectedServerIds, servers]
  )

  // Nothing is written until the preview is confirmed — the preview is the gate.
  function beginInstall(targets: MergedServerEntry[]): void {
    if (targets.length === 0 || selectedClientIds.length === 0) return
    setPendingTargets(targets)
    setAllowRuntimeInstall(false)
    setPreviews([])
    setPhase('preview')
    setIsPreviewLoading(true)
    Promise.all(targets.map((server) => klikApi.preflight({ server, targetClients: selectedClientIds })))
      .then(setPreviews)
      .finally(() => setIsPreviewLoading(false))
  }

  function confirmPreview(allowRuntime: boolean): void {
    setAllowRuntimeInstall(allowRuntime)
    const needsSecrets = pendingTargets.filter((s) => s.requiredEnv.some((e) => e.isRequired))
    if (needsSecrets.length > 0) {
      setPendingSecretServerIds(needsSecrets.map((s) => s.id))
      setPhase('secrets')
      return
    }
    void runInstall(pendingTargets, {}, allowRuntime)
  }

  function startInstallSelected(): void {
    beginInstall(selectedServers)
  }

  function installSingle(server: MergedServerEntry): void {
    beginInstall([server])
  }

  function handleSecretsSubmit(secrets: Record<string, string>): void {
    const [currentId, ...rest] = pendingSecretServerIds
    const nextSecrets = { ...secretsByServer, [currentId]: secrets }
    setSecretsByServer(nextSecrets)
    if (rest.length > 0) {
      setPendingSecretServerIds(rest)
      return
    }
    setPendingSecretServerIds([])
    void runInstall(pendingTargets, nextSecrets, allowRuntimeInstall)
  }

  async function runInstall(
    targets: MergedServerEntry[],
    secretsMap: Record<string, Record<string, string>>,
    allowRuntime: boolean
  ): Promise<void> {
    setPhase('progress')
    setIsInstalling(true)
    setResults([])
    const all: InstallStepResult[] = []
    for (const server of targets) {
      const steps = await klikApi.install({
        server,
        targetClients: selectedClientIds,
        secrets: secretsMap[server.id] ?? {},
        allowRuntimeInstall: allowRuntime
      })
      all.push(...steps)
      setResults([...all])
    }
    setIsInstalling(false)
  }

  function finishInstall(): void {
    setPhase('idle')
    setResults([])
    setSecretsByServer({})
    setSelectedServerIds([])
    setPendingTargets([])
    setPreviews([])
    setAllowRuntimeInstall(false)
    refreshInstalled()
  }

  function cancelInstall(): void {
    setPhase('idle')
    setPendingSecretServerIds([])
    setSecretsByServer({})
    setPendingTargets([])
    setPreviews([])
    setAllowRuntimeInstall(false)
  }

  const meta = SECTION_TITLES[section]

  // First run waits for preferences so it can't flash for someone who has already
  // been through it.
  if (prefsLoaded && !onboarded) {
    return (
      <TooltipProvider>
        <FirstRun
          tools={tools}
          onFinish={(recommended) => {
            setOnboarded(true)
            if (recommended.length > 0) {
              setSelectedServerIds(recommended)
            }
          }}
        />
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          active={section}
          onSelect={setSection}
          serverCount={catalogueTotal}
          skillCount={skills.length}
          pluginCount={PLUGINS_CATALOG.length}
          installedCount={installedRecords.length + installedSkills.length + installedPlugins.length}
          toolCount={clients.filter((c) => c.installed).length}
        />

        <SidebarInset className="relative overflow-hidden">
          {/* Titlebar / header — draggable, leaves room for native window controls (right). */}
          <header className="app-drag relative z-20 flex h-10 shrink-0 items-center gap-3 border-b border-border/60 px-3 pr-36">
            <Tooltip>
              <TooltipTrigger render={<SidebarTrigger className="no-drag" />} />
              <TooltipContent>
                Collapse sidebar · <Kbd>{MOD_KEY}</Kbd> <Kbd>B</Kbd>
              </TooltipContent>
            </Tooltip>
            {/* The title is short and always fits; the subtitle is what gives way. */}
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 whitespace-nowrap font-heading text-sm font-semibold text-foreground">
                {meta.title}
              </span>
              <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">
                {meta.subtitle}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-0.5">
            {/* Deliberately an icon button, not a bordered pill: a search-shaped box
                sitting directly above each catalog's filter box read as two search
                fields doing the same thing. */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => setPaletteOpen(true)}
                    aria-label="Search everything"
                    className="focus-ring no-drag flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
                  >
                    <Search className="size-4" />
                  </button>
                }
              />
              <TooltipContent>
                Search everything · <Kbd>{MOD_KEY}</Kbd> <Kbd>K</Kbd>
              </TooltipContent>
            </Tooltip>
            <ThemeToggle />
            </div>
          </header>

          {/* Content */}
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            {section === 'mcp' && (
              <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-8 pt-6">
                <DiscoverView
                  servers={servers}
                  catalogueTotal={catalogueTotal}
                  isLoadingServers={isLoadingServers}
                  installedServerIds={installedServerIds}
                  selectedServerIds={selectedServerIds}
                  onChangeSelectedServerIds={setSelectedServerIds}
                  clients={clients}
                  selectedClientIds={selectedClientIds}
                  onChangeSelectedClientIds={setSelectedClientIds}
                  isInstalling={isInstalling}
                  onInstall={startInstallSelected}
                  onOpenServer={openServer}
                />
              </div>
            )}

            {section === 'skills' && (
              <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-8 pt-6">
                <SkillsView
                  detectedToolIds={detectedToolIds}
                  tools={tools}
                  catalog={skills}
                  focusItemId={focusItem?.kind === 'skill' ? focusItem.id : null}
                  onFocusHandled={() => setFocusItem(null)}
                />
              </div>
            )}

            {section === 'plugins' && (
              <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-8 pt-6">
                <PluginsView
                  detectedToolIds={detectedToolIds}
                  focusItemId={focusItem?.kind === 'plugin' ? focusItem.id : null}
                  onFocusHandled={() => setFocusItem(null)}
                />
              </div>
            )}

            {(section === 'installed' || section === 'tools' || section === 'settings') && (
              <div className="h-full overflow-y-auto px-8 py-7">
                <div className="mx-auto w-full max-w-5xl">
                  {section === 'installed' && (
                    <InstalledView
                      servers={servers}
                      installed={installedRecords}
                      clients={clients}
                      skills={skills}
                      installedSkills={installedSkills}
                      plugins={PLUGINS_CATALOG}
                      installedPlugins={installedPlugins}
                      onUninstallSkill={(id) => {
                        void klikApi.uninstallSkill(id).then(() =>
                          klikApi.getInstalledSkills().then(setInstalledSkills)
                        )
                      }}
                      onUninstallPlugin={(id) => {
                        void klikApi
                          .uninstallPlugin(id)
                          .then(() => klikApi.getInstalledPlugins().then(setInstalledPlugins))
                          .catch(() => {})
                      }}
                      onUninstall={handleUninstall}
                      onOpenServer={openServer}
                      onGoDiscover={() => setSection('mcp')}
                    />
                  )}
                  {section === 'tools' && (
                    <ToolsView
                      tools={tools}
                      selectedClientIds={selectedClientIds}
                      onToggleClient={(id) =>
                        setSelectedClientIds((prev) =>
                          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                        )
                      }
                    />
                  )}
                  {section === 'settings' && (
                    <SettingsView
                      serverCount={catalogueTotal}
                      fromCache={fromCache}
                      isRefreshing={isRefreshing}
                      onRefresh={() => loadServers(true)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </SidebarInset>

        {/* Overlays */}
        <ServerDetailDrawer
          server={detailServer}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          isInstalled={detailServer ? installedServerIds.includes(detailServer.id) : false}
          detectedClientIds={clients.filter((c) => c.installed).map((c) => c.id)}
          onInstall={installSingle}
          onUninstall={handleUninstall}
        />

        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          items={paletteItems}
          onSelect={handlePaletteSelect}
        />

        {phase === 'preview' && (
          <InstallPreviewDialog
            previews={previews}
            isLoading={isPreviewLoading}
            onCancel={cancelInstall}
            onConfirm={confirmPreview}
          />
        )}

        {phase === 'secrets' && pendingSecretServerIds.length > 0 && (
          <SecretPromptDialog
            server={servers.find((s) => s.id === pendingSecretServerIds[0])!}
            onSubmit={handleSecretsSubmit}
            onCancel={cancelInstall}
          />
        )}

        <Dialog open={phase === 'progress'} onOpenChange={(open: boolean) => { if (!open && !isInstalling) finishInstall() }}>
          <DialogContent className="max-w-sm">
            <DialogHeader className="sr-only">
              <DialogTitle>Installing</DialogTitle>
              <DialogDescription>Writing configuration into your selected apps.</DialogDescription>
            </DialogHeader>
            <InstallProgressView results={results} isInstalling={isInstalling} onDone={finishInstall} />
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </TooltipProvider>
  )
}
