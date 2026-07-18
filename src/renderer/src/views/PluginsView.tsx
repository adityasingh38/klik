import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Blocks } from 'lucide-react'
import { CatalogView, type CatalogDetailItem, type CatalogKindMeta } from './CatalogView'
import { PluginInstallDialog } from '../components/app/PluginInstallDialog'
import { PLUGINS_CATALOG } from '../data/pluginsCatalog'
import { klikApi } from '../api/klikApi'
import type { PluginEntry } from '../../../shared/catalog'

const PLUGIN_META: CatalogKindMeta = {
  icon: Blocks,
  filterPlaceholder: 'Filter these plugins…',
  compatNote:
    'A plugin is added from a marketplace and bundles commands, agents, hooks, skills, and MCP servers. Klik installs it through Claude Code’s own CLI.',
  actionLabel: 'Add plugin',
  actionPendingReason: 'The Claude Code CLI was not found on PATH.',
  emptyHint:
    'Plugins bundle commands, agents, hooks, skills, and MCP servers, installed together from a marketplace.'
}

interface PluginsViewProps {
  detectedToolIds: string[]
  focusItemId?: string | null
  onFocusHandled?: () => void
}

export function PluginsView({ detectedToolIds, focusItemId, onFocusHandled }: PluginsViewProps): React.JSX.Element {
  const [installedIds, setInstalledIds] = useState<string[]>([])
  const [cliAvailable, setCliAvailable] = useState(true)
  const [pending, setPending] = useState<PluginEntry | null>(null)

  const refreshInstalled = useCallback((): void => {
    klikApi
      .getInstalledPlugins()
      .then((records) => {
        setInstalledIds(records.map((r) => r.id))
        setCliAvailable(true)
      })
      .catch(() => setCliAvailable(false))
  }, [])

  useEffect(() => refreshInstalled(), [refreshInstalled])

  const items = useMemo<CatalogDetailItem[]>(
    () =>
      PLUGINS_CATALOG.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        metaTags: [p.category, ...(p.author ? [p.author] : [])],
        compatibleTools: p.compatibleTools,
        verified: p.verified,
        warnings: p.warnings,
        author: p.author,
        source: p.marketplace,
        sourceLabel: 'Marketplace',
        repositoryUrl: p.repositoryUrl
      })),
    []
  )

  function handleAction(item: CatalogDetailItem): void {
    const plugin = PLUGINS_CATALOG.find((p) => p.id === item.id)
    if (plugin) setPending(plugin)
  }

  function handleUninstall(id: string): void {
    void klikApi.uninstallPlugin(id).then(refreshInstalled)
  }

  return (
    <>
      <CatalogView
        items={items}
        detectedToolIds={detectedToolIds}
        meta={PLUGIN_META}
        installedIds={installedIds}
        onAction={cliAvailable ? handleAction : undefined}
        onUninstall={handleUninstall}
        focusItemId={focusItemId}
        onFocusHandled={onFocusHandled}
        notice={
          cliAvailable ? undefined : (
            <>
              The Claude Code CLI wasn&rsquo;t found on your PATH, so plugins are read-only here.
              Install Claude Code, then reopen this tab.
            </>
          )
        }
      />
      {pending && (
        <PluginInstallDialog
          plugin={pending}
          onCancel={() => setPending(null)}
          onDone={() => {
            setPending(null)
            refreshInstalled()
          }}
        />
      )}
    </>
  )
}
