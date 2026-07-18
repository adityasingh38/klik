import React, { useMemo } from 'react'
import { Blocks } from 'lucide-react'
import { CatalogView, type CatalogDetailItem, type CatalogKindMeta } from './CatalogView'
import { PLUGINS_CATALOG } from '../data/pluginsCatalog'

const PLUGIN_META: CatalogKindMeta = {
  icon: Blocks,
  searchPlaceholder: 'Search plugins…',
  compatNote:
    'A plugin is added from a marketplace and bundles commands, agents, hooks, skills, and MCP servers. Compatibility depends on which tools support the plugin format.',
  actionLabel: 'Add plugin',
  actionPendingReason: 'One-click plugin install lands in the next update.'
}

interface PluginsViewProps {
  detectedToolIds: string[]
}

export function PluginsView({ detectedToolIds }: PluginsViewProps): React.JSX.Element {
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

  return <CatalogView items={items} detectedToolIds={detectedToolIds} meta={PLUGIN_META} />
}
