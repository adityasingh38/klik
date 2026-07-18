import React, { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { CatalogView, type CatalogDetailItem, type CatalogKindMeta } from './CatalogView'
import { SKILLS_CATALOG } from '../data/skillsCatalog'

const SKILL_META: CatalogKindMeta = {
  icon: Sparkles,
  searchPlaceholder: 'Search skills…',
  compatNote:
    'A skill installs as an on-demand capability file. Compatibility depends on which tools load skill files — not the model behind each one.',
  actionLabel: 'Install skill',
  actionPendingReason: 'One-click skill install lands in the next update.'
}

interface SkillsViewProps {
  detectedToolIds: string[]
}

export function SkillsView({ detectedToolIds }: SkillsViewProps): React.JSX.Element {
  const items = useMemo<CatalogDetailItem[]>(
    () =>
      SKILLS_CATALOG.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        metaTags: [s.category, ...(s.author ? [s.author] : [])],
        compatibleTools: s.compatibleTools,
        verified: s.verified,
        warnings: s.warnings,
        author: s.author,
        source: s.source,
        sourceLabel: 'Source',
        repositoryUrl: s.repositoryUrl
      })),
    []
  )

  return <CatalogView items={items} detectedToolIds={detectedToolIds} meta={SKILL_META} />
}
