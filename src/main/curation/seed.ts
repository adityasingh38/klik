import { join } from 'node:path'
import { readFeed, refreshFeed } from './feed'
import type { CuratedServerEntry, MergedServerEntry } from '../../shared/types'

const SEED_FILE = 'servers.json'
const SEED_URL = `https://raw.githubusercontent.com/adityasingh38/klik/master/curation/${SEED_FILE}`

export function bundledSeedPath(resourcesDir: string): string {
  return join(resourcesDir, 'curation', 'servers.json')
}

/**
 * Klik's own catalogue of well-known servers, read from disk so the first screen
 * never waits on the network. The list can still be corrected between releases — a
 * package being deprecated is a correctness issue, not a cosmetic one — but that
 * correction lands on the next launch rather than holding up this one.
 */
export function loadSeedServers(resourcesDir: string, userDataDir: string): CuratedServerEntry[] {
  refreshFeed(SEED_FILE, SEED_URL, userDataDir)
  return readFeed<CuratedServerEntry>(SEED_FILE, resourcesDir, userDataDir)
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
