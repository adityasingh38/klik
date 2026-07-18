import { existsSync, mkdirSync, rmSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseSkillSource, listSkillFiles, downloadFile } from './source'
import { recordSkillInstall, recordSkillUninstall, listInstalledSkills } from './state'
import type {
  DetectedTool,
  SkillInstallRequest,
  SkillInstallStepResult
} from '../../shared/catalog'

export interface SkillInstallerDeps {
  tools: DetectedTool[]
  userDataDir: string
  now: () => string
}

interface FetchedFile {
  relativePath: string
  contents: Buffer
}

function errorFor(skillId: string, toolIds: string[], message: string): SkillInstallStepResult[] {
  return toolIds.map((toolId) => ({ skillId, toolId, status: 'error' as const, message }))
}

/**
 * Writes a fully-downloaded skill into one directory. The files land in a sibling
 * temp directory first and only swap into place once every byte is on disk, so an
 * interrupted install can never leave a half-written skill where a working one was.
 */
function writeSkillDir(skillDir: string, files: FetchedFile[]): void {
  const tempDir = `${skillDir}.klik-tmp`
  if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true })
  mkdirSync(tempDir, { recursive: true })

  try {
    for (const file of files) {
      const destination = join(tempDir, file.relativePath)
      mkdirSync(dirname(destination), { recursive: true })
      writeFileSync(destination, file.contents)
    }
    if (existsSync(skillDir)) rmSync(skillDir, { recursive: true, force: true })
    renameSync(tempDir, skillDir)
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true })
    throw error
  }
}

export async function installSkill(
  request: SkillInstallRequest,
  deps: SkillInstallerDeps
): Promise<SkillInstallStepResult[]> {
  const { skill, targetToolIds, allowOverwrite } = request

  const ref = parseSkillSource(skill.source)
  if (!ref) return errorFor(skill.id, targetToolIds, `Unsupported skill source: ${skill.source}`)

  // Resolve targets before fetching, so an unusable request costs no network.
  const resolved = targetToolIds.map((toolId) => {
    const tool = deps.tools.find((t) => t.id === toolId)
    const skillsDir = tool?.capabilities.skills?.dir
    return { toolId, tool, skillDir: skillsDir ? join(skillsDir, skill.installName) : null }
  })

  const writable = resolved.filter((r) => r.tool?.installed && r.skillDir)
  if (writable.length === 0) {
    return errorFor(skill.id, targetToolIds, 'No selected tool can accept a skill install.')
  }

  // Replacing an existing skill is only ever done with explicit consent.
  const blocked = writable.filter((r) => existsSync(r.skillDir as string) && !allowOverwrite)
  if (blocked.length > 0) {
    return errorFor(
      skill.id,
      blocked.map((b) => b.toolId),
      `A skill named "${skill.installName}" already exists — confirm replacing it to continue.`
    )
  }

  let files: FetchedFile[]
  try {
    const remote = await listSkillFiles(ref)
    files = await Promise.all(
      remote.map(async (file) => ({
        relativePath: file.relativePath,
        contents: await downloadFile(file.downloadUrl)
      }))
    )
  } catch (error) {
    return errorFor(skill.id, targetToolIds, error instanceof Error ? error.message : String(error))
  }

  const results: SkillInstallStepResult[] = []
  const succeeded: string[] = []

  for (const target of resolved) {
    if (!target.tool || !target.skillDir) {
      results.push({ skillId: skill.id, toolId: target.toolId, status: 'error', message: 'Unknown tool' })
      continue
    }
    if (!target.tool.capabilities.skills) {
      results.push({
        skillId: skill.id,
        toolId: target.toolId,
        status: 'error',
        message: `${target.tool.displayName} does not support skills`
      })
      continue
    }
    if (!target.tool.installed) {
      results.push({
        skillId: skill.id,
        toolId: target.toolId,
        status: 'error',
        message: `${target.tool.displayName} is not installed`
      })
      continue
    }
    try {
      writeSkillDir(target.skillDir, files)
      results.push({ skillId: skill.id, toolId: target.toolId, status: 'done' })
      succeeded.push(target.toolId)
    } catch (error) {
      results.push({
        skillId: skill.id,
        toolId: target.toolId,
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  if (succeeded.length > 0) {
    recordSkillInstall(deps.userDataDir, skill.id, skill.installName, succeeded, deps.now())
  }
  return results
}

/** Removes a skill Klik installed, from every tool it recorded writing it into. */
export function uninstallSkill(
  skillId: string,
  deps: Pick<SkillInstallerDeps, 'tools' | 'userDataDir'>
): void {
  const record = listInstalledSkills(deps.userDataDir).find((r) => r.skillId === skillId)
  if (!record) return

  for (const toolId of record.tools) {
    const tool = deps.tools.find((t) => t.id === toolId)
    const skillsDir = tool?.capabilities.skills?.dir
    if (!skillsDir) continue
    const dir = join(skillsDir, record.installName)
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  }

  recordSkillUninstall(deps.userDataDir, skillId)
}
