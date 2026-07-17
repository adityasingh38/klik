import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CuratedServerEntry, MergedServerEntry } from '../../shared/types'

const SEED_URL = 'https://raw.githubusercontent.com/adityasingh38/klik/master/curation/servers.json'
const FETCH_TIMEOUT_MS = 5000

export function bundledSeedPath(resourcesDir: string): string {
  return join(resourcesDir, 'curation', 'servers.json')
}

function readBundledSeed(resourcesDir: string): CuratedServerEntry[] {
  const path = bundledSeedPath(resourcesDir)
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as CuratedServerEntry[]
  } catch {
    return []
  }
}

/**
 * Klik's own catalog of well-known servers. Fetched remotely so the list can be
 * corrected between releases (a package getting deprecated is a correctness issue,
 * not a cosmetic one), falling back to the copy shipped in the installer.
 */
export async function loadSeedServers(resourcesDir: string): Promise<CuratedServerEntry[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const response = await fetch(SEED_URL, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) throw new Error(`seed fetch failed: ${response.status}`)
    return (await response.json()) as CuratedServerEntry[]
  } catch {
    return readBundledSeed(resourcesDir)
  }
}

/**
 * Curated servers lead the list and win on id collision — a hand-verified entry is
 * more trustworthy than whatever the registry happens to carry under the same name.
 */
export function mergeSeedServers(
  registryEntries: MergedServerEntry[],
  seed: CuratedServerEntry[]
): MergedServerEntry[] {
  const seedIds = new Set(seed.map((entry) => entry.id))
  const curatedAsMerged: MergedServerEntry[] = seed.map(
    ({ verified, tested, category, warnings, ...server }) => ({
      ...server,
      category,
      curation: { registryId: server.id, verified, tested, category, warnings }
    })
  )
  const rest = registryEntries.filter((entry) => !seedIds.has(entry.id))
  return [...curatedAsMerged, ...rest]
}
