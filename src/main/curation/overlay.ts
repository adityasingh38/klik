import { join } from 'node:path'
import { readFeed, refreshFeed } from './feed'
import type { CurationEntry, MergedServerEntry, RegistryServerEntry } from '../../shared/types'
import { categorize } from '../registry/categorize'

const OVERLAY_FILE = 'overlay.json'
// Was pointed at `adityasuper38/klikmcp`, which does not exist — so this request
// failed on every launch, and the app waited for it to before rendering.
const OVERLAY_URL = `https://raw.githubusercontent.com/adityasingh38/klik/master/curation/${OVERLAY_FILE}`

export function bundledOverlayPath(resourcesDir: string): string {
  return join(resourcesDir, 'curation', 'overlay.json')
}

/** Read from disk; a fresher copy is fetched behind the interface for next launch. */
export function loadCuration(resourcesDir: string, userDataDir: string): CurationEntry[] {
  refreshFeed(OVERLAY_FILE, OVERLAY_URL, userDataDir)
  return readFeed<CurationEntry>(OVERLAY_FILE, resourcesDir, userDataDir)
}

export function mergeCuration(entries: RegistryServerEntry[], curation: CurationEntry[]): MergedServerEntry[] {
  const byId = new Map(curation.map((c) => [c.registryId, c]))
  return entries.map((entry) => {
    const entryCuration = byId.get(entry.id)
    const curatedCategory = entryCuration?.category?.trim()
    return {
      ...entry,
      curation: entryCuration,
      category: curatedCategory || categorize(entry)
    }
  })
}
