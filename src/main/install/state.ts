import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ClientId, InstalledServerRecord } from '../../shared/types'

export function statePath(userDataDir: string): string {
  return join(userDataDir, 'installed-servers.json')
}

function readState(userDataDir: string): InstalledServerRecord[] {
  const path = statePath(userDataDir)
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as InstalledServerRecord[]
  } catch {
    return []
  }
}

function writeState(userDataDir: string, records: InstalledServerRecord[]): void {
  const path = statePath(userDataDir)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(records, null, 2))
}

export function listInstalled(userDataDir: string): InstalledServerRecord[] {
  return readState(userDataDir)
}

export function recordInstall(
  userDataDir: string,
  serverId: string,
  clients: ClientId[],
  installedAt: string
): void {
  const records = readState(userDataDir).filter((r) => r.serverId !== serverId)
  records.push({ serverId, clients, installedAt })
  writeState(userDataDir, records)
}

export function recordUninstall(userDataDir: string, serverId: string): void {
  const records = readState(userDataDir).filter((r) => r.serverId !== serverId)
  writeState(userDataDir, records)
}
