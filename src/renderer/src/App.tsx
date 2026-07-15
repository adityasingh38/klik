import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { ServerListView } from './components/ServerListView'
import { InstallProgressView } from './components/InstallProgressView'
import { SecretPromptDialog } from './components/SecretPromptDialog'
import { klikApi } from './api/klikApi'
import type { ClientId, ClientInfo, InstallStepResult, MergedServerEntry } from '../../shared/types'

type ViewMode = 'list' | 'secrets' | 'progress'

export default function App(): React.JSX.Element {
  const [servers, setServers] = useState<MergedServerEntry[]>([])
  const [isLoadingServers, setIsLoadingServers] = useState(true)
  const [fromCache, setFromCache] = useState(false)
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [installedServerIds, setInstalledServerIds] = useState<string[]>([])
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<ClientId[]>([])
  const [results, setResults] = useState<InstallStepResult[]>([])
  const [isInstalling, setIsInstalling] = useState(false)
  const [view, setView] = useState<ViewMode>('list')
  const [secretsByServer, setSecretsByServer] = useState<Record<string, Record<string, string>>>({})
  const [pendingSecretServerIds, setPendingSecretServerIds] = useState<string[]>([])

  const refreshInstalled = useCallback((): void => {
    klikApi.getInstalled().then((records) => setInstalledServerIds(records.map((r) => r.serverId)))
  }, [])

  useEffect(() => {
    klikApi
      .getServers()
      .then(({ servers: fetchedServers, fromCache: fetchedFromCache }) => {
        setServers(fetchedServers)
        setFromCache(fetchedFromCache)
      })
      .finally(() => setIsLoadingServers(false))
    klikApi.getClients().then((fetchedClients) => {
      setClients(fetchedClients)
      setSelectedClientIds(fetchedClients.filter((c) => c.installed).map((c) => c.id))
    })
    refreshInstalled()
  }, [refreshInstalled])

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

  function startInstall(): void {
    const needsSecrets = selectedServers.filter((server) => server.requiredEnv.some((e) => e.isRequired))
    if (needsSecrets.length > 0) {
      setPendingSecretServerIds(needsSecrets.map((s) => s.id))
      setView('secrets')
      return
    }
    void runInstall(selectedServers, {})
  }

  function handleSecretsSubmit(secrets: Record<string, string>): void {
    const [currentId, ...rest] = pendingSecretServerIds
    const nextSecretsByServer = { ...secretsByServer, [currentId]: secrets }
    setSecretsByServer(nextSecretsByServer)
    if (rest.length > 0) {
      setPendingSecretServerIds(rest)
      return
    }
    setPendingSecretServerIds([])
    void runInstall(selectedServers, nextSecretsByServer)
  }

  async function runInstall(
    targets: MergedServerEntry[],
    secretsMap: Record<string, Record<string, string>>
  ): Promise<void> {
    setView('progress')
    setIsInstalling(true)
    setResults([])
    const allResults: InstallStepResult[] = []
    for (const server of targets) {
      const stepResults = await klikApi.install({
        server,
        targetClients: selectedClientIds,
        secrets: secretsMap[server.id] ?? {}
      })
      allResults.push(...stepResults)
      setResults([...allResults])
    }
    setIsInstalling(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="font-heading text-2xl font-bold">Klik</h1>

      {view === 'list' && (
        <div className="flex w-full flex-col gap-4">
          {fromCache && (
            <Alert>
              <AlertTitle>Showing cached data — could not reach the registry.</AlertTitle>
            </Alert>
          )}
          <ServerListView
            servers={servers}
            isLoadingServers={isLoadingServers}
            clients={clients}
            installedServerIds={installedServerIds}
            selectedServerIds={selectedServerIds}
            onChangeSelectedServerIds={setSelectedServerIds}
            selectedClientIds={selectedClientIds}
            onChangeSelectedClientIds={setSelectedClientIds}
            onInstall={startInstall}
            isInstalling={isInstalling}
            onUninstall={handleUninstall}
          />
        </div>
      )}

      {view === 'secrets' && pendingSecretServerIds.length > 0 && (
        <SecretPromptDialog
          server={servers.find((s) => s.id === pendingSecretServerIds[0])!}
          onSubmit={handleSecretsSubmit}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'progress' && (
        <InstallProgressView results={results} isInstalling={isInstalling} onDone={() => setView('list')} />
      )}
    </div>
  )
}
