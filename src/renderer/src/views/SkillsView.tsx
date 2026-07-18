import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { CatalogView, type CatalogDetailItem, type CatalogKindMeta } from './CatalogView'
import { SkillInstallDialog } from '../components/app/SkillInstallDialog'
import { SKILLS_CATALOG } from '../data/skillsCatalog'
import { klikApi } from '../api/klikApi'
import type { DetectedTool, SkillEntry } from '../../../shared/catalog'

const SKILL_META: CatalogKindMeta = {
  icon: Sparkles,
  searchPlaceholder: 'Search skills…',
  compatNote:
    'A skill installs as an on-demand capability file. Compatibility depends on which tools load skill files — not the model behind each one.',
  actionLabel: 'Install skill',
  actionPendingReason: 'No detected tool can accept a skill install.',
  emptyHint:
    'Skills are on-demand capabilities your AI tool loads when a task needs them — reading a PDF, building a deck, driving a browser.'
}

interface SkillsViewProps {
  detectedToolIds: string[]
  tools: DetectedTool[]
}

export function SkillsView({ detectedToolIds, tools }: SkillsViewProps): React.JSX.Element {
  const [installedIds, setInstalledIds] = useState<string[]>([])
  const [pending, setPending] = useState<SkillEntry | null>(null)

  const refreshInstalled = useCallback((): void => {
    klikApi.getInstalledSkills().then((records) => setInstalledIds(records.map((r) => r.skillId)))
  }, [])

  useEffect(() => refreshInstalled(), [refreshInstalled])

  /** Tools that are present on this machine and can actually take a skill. */
  const skillCapableToolIds = useMemo(
    () => tools.filter((t) => t.installed && t.capabilities.skills).map((t) => t.id),
    [tools]
  )

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

  /** Where a given skill would go: declared compatibility ∩ what's actually here. */
  function targetsFor(skill: SkillEntry): string[] {
    return skill.compatibleTools.filter((id) => skillCapableToolIds.includes(id))
  }

  function handleAction(item: CatalogDetailItem): void {
    const skill = SKILLS_CATALOG.find((s) => s.id === item.id)
    if (skill && targetsFor(skill).length > 0) setPending(skill)
  }

  function handleUninstall(id: string): void {
    void klikApi.uninstallSkill(id).then(refreshInstalled)
  }

  const canInstallAny = skillCapableToolIds.length > 0

  return (
    <>
      <CatalogView
        items={items}
        detectedToolIds={detectedToolIds}
        meta={SKILL_META}
        installedIds={installedIds}
        onAction={canInstallAny ? handleAction : undefined}
        onUninstall={handleUninstall}
        notice={
          canInstallAny ? undefined : (
            <>
              No tool on this machine accepts skills yet, so these are read-only. Klik writes skills
              into Claude Code&rsquo;s skills directory — install it and this catalog becomes live.
            </>
          )
        }
      />
      {pending && (
        <SkillInstallDialog
          skill={pending}
          targetToolIds={targetsFor(pending)}
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
