import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Confetti, type ConfettiRef } from '@/components/ui/confetti'
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

  const confettiRef = useRef<ConfettiRef>(null)
  const hasFiredConfettiRef = useRef(false)
  const installSucceeded =
    results.length > 0 && !isInstalling && results.every((r) => r.status === 'done')

  useEffect(() => {
    if (installSucceeded && !hasFiredConfettiRef.current) {
      hasFiredConfettiRef.current = true
      confettiRef.current?.fire({
        particleCount: 80,
        spread: 70,
        colors: ['#e0873f', '#eeeae2', '#2c2521']
      })
    }
    if (!installSucceeded) {
      hasFiredConfettiRef.current = false
    }
  }, [installSucceeded])

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
    <div className="relative min-h-screen overflow-hidden">
      <DotPattern className="text-border/25" />
      <Confetti
        ref={confettiRef}
        manualstart
        className="pointer-events-none fixed inset-0 z-50 size-full"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <h1 className="font-heading text-2xl font-bold">Klik</h1>

        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex w-full flex-col gap-4"
            >
              {fromCache && (
                <Alert>
                  <AlertTitle>Showing cached servers while refreshing in the background.</AlertTitle>
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
            </motion.div>
          )}

          {view === 'secrets' && pendingSecretServerIds.length > 0 && (
            <motion.div
              key="secrets"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SecretPromptDialog
                server={servers.find((s) => s.id === pendingSecretServerIds[0])!}
                onSubmit={handleSecretsSubmit}
                onCancel={() => setView('list')}
              />
            </motion.div>
          )}

          {view === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <InstallProgressView results={results} isInstalling={isInstalling} onDone={() => setView('list')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
