import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Confetti, type ConfettiRef } from '@/components/ui/confetti'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
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
import { CommandPalette } from './components/app/CommandPalette'
import { InstallPreviewDialog } from './components/app/InstallPreviewDialog'
import { DiscoverView } from './views/DiscoverView'
import { SkillsView } from './views/SkillsView'
import { PluginsView } from './views/PluginsView'
import { InstalledView } from './views/InstalledView'
import { ClientsView } from './views/ClientsView'
import { SettingsView } from './views/SettingsView'
import { SKILLS_CATALOG } from './data/skillsCatalog'
import { PLUGINS_CATALOG } from './data/pluginsCatalog'
import { InstallProgressView } from './components/InstallProgressView'
import { SecretPromptDialog } from './components/SecretPromptDialog'
import { klikApi } from './api/klikApi'
import type {
  ClientId,
  ClientInfo,
  InstalledServerRecord,
  InstallPreview,
  InstallStepResult,
  MergedServerEntry
} from '../../shared/types'

const SECTION_TITLES: Record<AppSection, { title: string; subtitle: string }> = {
  mcp: { title: 'MCP Servers', subtitle: 'Browse and install MCP servers' },
  skills: { title: 'Skills', subtitle: 'On-demand capabilities for your AI tools' },
  plugins: { title: 'Plugins', subtitle: 'Marketplace bundles: commands, agents, and more' },
  installed: { title: 'Installed', subtitle: 'Servers running in your tools' },
  tools: { title: 'Tools', subtitle: 'Detected AI tools and install targets' },
  settings: { title: 'Settings', subtitle: 'Registry, appearance, and about' }
}

type InstallPhase = 'idle' | 'preview' | 'secrets' | 'progress'

export default function App(): React.JSX.Element {
  const [servers, setServers] = useState<MergedServerEntry[]>([])
  const [isLoadingServers, setIsLoadingServers] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [installedRecords, setInstalledRecords] = useState<InstalledServerRecord[]>([])
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<ClientId[]>([])

  const [section, setSection] = useState<AppSection>('mcp')
  const detectedToolIds = useMemo(
    () => clients.filter((c) => c.installed).map((c) => c.id as string),
    [clients]
  )
  const [detailServer, setDetailServer] = useState<MergedServerEntry | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

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

  const confettiRef = useRef<ConfettiRef>(null)
  const hasFiredConfettiRef = useRef(false)

  const installedServerIds = useMemo(() => installedRecords.map((r) => r.serverId), [installedRecords])

  const installSucceeded =
    results.length > 0 && !isInstalling && results.every((r) => r.status === 'done')

  useEffect(() => {
    if (installSucceeded && !hasFiredConfettiRef.current) {
      hasFiredConfettiRef.current = true
      confettiRef.current?.fire({ particleCount: 80, spread: 70, colors: ['#e0873f', '#eeeae2', '#2c2521'] })
    }
    if (!installSucceeded) hasFiredConfettiRef.current = false
  }, [installSucceeded])

  const refreshInstalled = useCallback((): void => {
    klikApi.getInstalled().then(setInstalledRecords)
  }, [])

  const loadServers = useCallback((refresh = false): void => {
    if (refresh) setIsRefreshing(true)
    klikApi
      .getServers()
      .then(({ servers: fetched, fromCache: cached }) => {
        setServers(fetched)
        setFromCache(cached)
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

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          active={section}
          onSelect={setSection}
          serverCount={servers.length}
          skillCount={SKILLS_CATALOG.length}
          pluginCount={PLUGINS_CATALOG.length}
          installedCount={installedRecords.length}
          toolCount={clients.filter((c) => c.installed).length}
        />

        <SidebarInset className="relative overflow-hidden">
          <DotPattern className="text-border/20" />
          <Confetti ref={confettiRef} manualstart className="pointer-events-none fixed inset-0 z-50 size-full" />

          {/* Titlebar / header — draggable, leaves room for native window controls (right). */}
          <header className="app-drag relative z-20 flex h-10 shrink-0 items-center gap-3 border-b border-border/60 px-3 pr-36">
            <SidebarTrigger className="no-drag" />
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate font-heading text-sm font-semibold text-foreground">{meta.title}</span>
              <span className="hidden truncate text-xs text-muted-foreground sm:inline">{meta.subtitle}</span>
            </div>
            {fromCache && section === 'mcp' && (
              <span className="no-drag ml-1 flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                cached
              </span>
            )}
            <button
              onClick={() => setPaletteOpen(true)}
              className="no-drag ml-auto flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Search</span>
              <Kbd className="ml-1">⌘K</Kbd>
            </button>
          </header>

          {/* Content */}
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            {section === 'mcp' && (
              <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-6 pt-5">
                <DiscoverView
                  servers={servers}
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
              <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-6 pt-5">
                <SkillsView detectedToolIds={detectedToolIds} />
              </div>
            )}

            {section === 'plugins' && (
              <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-6 pt-5">
                <PluginsView detectedToolIds={detectedToolIds} />
              </div>
            )}

            {(section === 'installed' || section === 'tools' || section === 'settings') && (
              <div className="h-full overflow-y-auto px-6 py-6">
                <div className="mx-auto w-full max-w-3xl">
                  {section === 'installed' && (
                    <InstalledView
                      servers={servers}
                      installed={installedRecords}
                      clients={clients}
                      onUninstall={handleUninstall}
                      onOpenServer={openServer}
                      onGoDiscover={() => setSection('mcp')}
                    />
                  )}
                  {section === 'tools' && (
                    <ClientsView
                      clients={clients}
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
                      serverCount={servers.length}
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
          servers={servers}
          installedServerIds={installedServerIds}
          onSelect={openServer}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Installing servers</DialogTitle>
              <DialogDescription>Writing MCP configuration into your selected clients.</DialogDescription>
            </DialogHeader>
            <InstallProgressView results={results} isInstalling={isInstalling} onDone={finishInstall} />
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </TooltipProvider>
  )
}
