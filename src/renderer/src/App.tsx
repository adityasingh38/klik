import React, { useEffect, useMemo, useState } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { klikApi } from './api/klikApi'
import { ServerListView } from './components/ServerListView'
import { InstallProgressView } from './components/InstallProgressView'
import { SecretPromptDialog } from './components/SecretPromptDialog'
import type { ClientId, ClientInfo, InstallStepResult, MergedServerEntry } from '../../shared/types'

type ViewMode = 'list' | 'secrets' | 'progress'

export default function App(): React.JSX.Element {
  const [servers, setServers] = useState<MergedServerEntry[]>([])
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<ClientId[]>([])
  const [results, setResults] = useState<InstallStepResult[]>([])
  const [isInstalling, setIsInstalling] = useState(false)
  const [view, setView] = useState<ViewMode>('list')
  const [secretsByServer, setSecretsByServer] = useState<Record<string, Record<string, string>>>({})
  const [pendingSecretServerIds, setPendingSecretServerIds] = useState<string[]>([])

  useEffect(() => {
    klikApi.getServers().then(setServers)
    klikApi.getClients().then((fetchedClients) => {
      setClients(fetchedClients)
      setSelectedClientIds(fetchedClients.filter((c) => c.installed).map((c) => c.id))
    })
  }, [])

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
    <VStack gap={6} width="100%" hAlign="stretch">
      <Heading level={1}>Klik</Heading>
      {view === 'list' && (
        <ServerListView
          servers={servers}
          clients={clients}
          selectedServerIds={selectedServerIds}
          onChangeSelectedServerIds={setSelectedServerIds}
          selectedClientIds={selectedClientIds}
          onChangeSelectedClientIds={setSelectedClientIds}
          onInstall={startInstall}
          isInstalling={isInstalling}
        />
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
    </VStack>
  )
}
