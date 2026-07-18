import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Claude Code keeps everything under a single home directory (~/.claude): skills as
 * self-contained folders, plugins as a marketplace cache plus enable flags in
 * settings.json. Klik only ever touches paths derived from here, so a wrong
 * USERPROFILE can't send a write somewhere unexpected.
 */
export function claudeHomeDir(): string {
  return join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.claude')
}

export function isClaudeCodeInstalled(): boolean {
  return existsSync(claudeHomeDir())
}

export function skillsDir(): string {
  return join(claudeHomeDir(), 'skills')
}

export function settingsPath(): string {
  return join(claudeHomeDir(), 'settings.json')
}

export function pluginsDir(): string {
  return join(claudeHomeDir(), 'plugins')
}

/**
 * Where a skill lands. The name is validated rather than trusted: a catalog entry
 * must not be able to escape the skills directory via `..` or an absolute path.
 */
export function skillTargetDir(installName: string): string {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(installName)) {
    throw new Error(`Unsafe skill name: ${installName}`)
  }
  return join(skillsDir(), installName)
}

export function skillExists(installName: string): boolean {
  return existsSync(skillTargetDir(installName))
}

export function removeSkillDir(installName: string): void {
  const dir = skillTargetDir(installName)
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
}
