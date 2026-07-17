import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CurationEntry, MergedServerEntry, RegistryServerEntry } from '../../shared/types'
import { categorize } from '../registry/categorize'

const OVERLAY_URL = 'https://raw.githubusercontent.com/adityasuper38/klikmcp/main/curation/overlay.json'
const FETCH_TIMEOUT_MS = 5000

export function bundledOverlayPath(resourcesDir: string): string {
  return join(resourcesDir, 'curation', 'overlay.json')
}

function readBundledOverlay(resourcesDir: string): CurationEntry[] {
  const path = bundledOverlayPath(resourcesDir)
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as CurationEntry[]
  } catch {
    return []
  }
}

export async function loadCuration(resourcesDir: string): Promise<CurationEntry[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const response = await fetch(OVERLAY_URL, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) throw new Error(`overlay fetch failed: ${response.status}`)
    return (await response.json()) as CurationEntry[]
  } catch {
    return readBundledOverlay(resourcesDir)
  }
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
