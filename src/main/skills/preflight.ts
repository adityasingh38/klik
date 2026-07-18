import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { parseSkillSource, listSkillFiles } from './source'
import type {
  DetectedTool,
  SkillInstallPreview,
  SkillInstallTargetPreview,
  SkillPreflightRequest
} from '../../shared/catalog'

export interface SkillPreflightDeps {
  tools: DetectedTool[]
}

/**
 * Resolves everything a skill install would touch — the exact files fetched from the
 * source, their sizes, the directory each tool would get, and whether that directory
 * already holds a skill — without downloading or writing anything. The preview
 * renders this so replacing an existing skill is always a deliberate choice.
 */
export async function buildSkillInstallPreview(
  request: SkillPreflightRequest,
  deps: SkillPreflightDeps
): Promise<SkillInstallPreview> {
  const { skill, targetToolIds } = request

  const ref = parseSkillSource(skill.source)
  if (!ref) {
    throw new Error(`Unsupported skill source: ${skill.source}`)
  }
  const remoteFiles = await listSkillFiles(ref)

  const targets: SkillInstallTargetPreview[] = targetToolIds.map((toolId) => {
    const tool = deps.tools.find((t) => t.id === toolId)
    if (!tool) {
      return { toolId, displayName: toolId, skillDir: '', supported: false, reason: 'Unknown tool', wouldOverwrite: false }
    }
    const base = { toolId, displayName: tool.displayName }
    if (!tool.capabilities.skills) {
      return { ...base, skillDir: '', supported: false, reason: `${tool.displayName} does not support skills`, wouldOverwrite: false }
    }
    const skillDir = join(tool.capabilities.skills.dir, skill.installName)
    if (!tool.installed) {
      return { ...base, skillDir, supported: false, reason: `${tool.displayName} is not installed`, wouldOverwrite: false }
    }
    return { ...base, skillDir, supported: true, wouldOverwrite: existsSync(skillDir) }
  })

  const warnings = [...skill.warnings]
  const overwriting = targets.filter((t) => t.supported && t.wouldOverwrite)
  if (overwriting.length > 0) {
    warnings.push(
      `A skill named "${skill.installName}" already exists in ${overwriting
        .map((t) => t.displayName)
        .join(', ')} — installing replaces it.`
    )
  }

  return {
    skillId: skill.id,
    title: skill.title,
    source: skill.source,
    files: remoteFiles.map((f) => ({ relativePath: f.relativePath, bytes: f.bytes })),
    totalBytes: remoteFiles.reduce((sum, f) => sum + f.bytes, 0),
    targets,
    warnings,
    verified: skill.verified
  }
}
