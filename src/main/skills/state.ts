import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { InstalledSkillRecord } from '../../shared/catalog'

export function skillStatePath(userDataDir: string): string {
  return join(userDataDir, 'installed-skills.json')
}

function readState(userDataDir: string): InstalledSkillRecord[] {
  const path = skillStatePath(userDataDir)
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as InstalledSkillRecord[]
  } catch {
    return []
  }
}

function writeState(userDataDir: string, records: InstalledSkillRecord[]): void {
  const path = skillStatePath(userDataDir)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(records, null, 2))
}

export function listInstalledSkills(userDataDir: string): InstalledSkillRecord[] {
  return readState(userDataDir)
}

export function recordSkillInstall(
  userDataDir: string,
  skillId: string,
  installName: string,
  tools: string[],
  installedAt: string
): void {
  const records = readState(userDataDir).filter((r) => r.skillId !== skillId)
  records.push({ skillId, installName, tools, installedAt })
  writeState(userDataDir, records)
}

export function recordSkillUninstall(userDataDir: string, skillId: string): void {
  writeState(
    userDataDir,
    readState(userDataDir).filter((r) => r.skillId !== skillId)
  )
}
