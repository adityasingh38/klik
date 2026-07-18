import { readCache, loadRegistry } from './client'
import { loadCuration, mergeCuration } from '../curation/overlay'
import { loadSeedServers, mergeSeedServers } from '../curation/seed'
import { rankServers } from '../../shared/ranking'
import type { MergedServerEntry, ServerPage, ServerQuery } from '../../shared/types'

/**
 * The catalogue lives here, in the main process, and is served in pages.
 *
 * It used to be handed to the renderer whole. That meant reading a 9.5 MB file,
 * parsing it, merging it, structured-cloning ~15,700 objects across the process
 * boundary and ranking them again on the other side — all before a single card could
 * appear. The renderer only ever shows nine of them on arrival and forty-eight at a
 * time after that.
 */
let catalogue: MergedServerEntry[] | null = null
let building: Promise<MergedServerEntry[]> | null = null

async function build(userDataDir: string, resourcesDir: string): Promise<MergedServerEntry[]> {
  const cached = readCache(userDataDir)
  // Both read from disk now, so nothing here waits on the network.
  const curation = loadCuration(resourcesDir, userDataDir)
  const seed = loadSeedServers(resourcesDir, userDataDir)

  if (cached) {
    // Serve what's on disk now; refresh in the background for next launch.
    void loadRegistry(userDataDir).catch(() => {})
    return rankServers(mergeSeedServers(mergeCuration(cached, curation), seed))
  }

  const { entries } = await loadRegistry(userDataDir)
  return rankServers(mergeSeedServers(mergeCuration(entries, curation), seed))
}

/** Parsed, merged and ranked exactly once per launch. */
export async function getCatalogue(
  userDataDir: string,
  resourcesDir: string
): Promise<MergedServerEntry[]> {
  if (catalogue) return catalogue
  if (!building) {
    building = build(userDataDir, resourcesDir)
      .then((result) => {
        catalogue = result
        return result
      })
      .finally(() => {
        building = null
      })
  }
  return building
}

/** Drops the in-memory copy so the next read reflects a refreshed cache. */
export function invalidateCatalogue(): void {
  catalogue = null
}

export function matches(server: MergedServerEntry, query: ServerQuery): boolean {
  if (query.verifiedOnly && !server.curation?.verified) return false
  if (query.category && query.category !== 'All' && server.category !== query.category) return false
  const q = query.search?.trim().toLowerCase()
  if (!q) return true
  return (
    server.title.toLowerCase().includes(q) ||
    server.description.toLowerCase().includes(q) ||
    server.id.toLowerCase().includes(q)
  )
}

/**
 * A window of the catalogue, already ranked. Filtering happens here so the renderer
 * never has to hold the whole thing to answer a keystroke.
 */
export async function queryServers(
  userDataDir: string,
  resourcesDir: string,
  query: ServerQuery
): Promise<ServerPage> {
  const all = await getCatalogue(userDataDir, resourcesDir)
  const filtered = query.search || query.category || query.verifiedOnly
    ? all.filter((s) => matches(s, query))
    : all

  const offset = query.offset ?? 0
  const limit = query.limit ?? 48
  return {
    servers: filtered.slice(offset, offset + limit),
    total: filtered.length,
    catalogueTotal: all.length
  }
}

/** Categories with counts, for the filter chips. */
export async function serverCategories(
  userDataDir: string,
  resourcesDir: string
): Promise<Array<{ name: string; count: number }>> {
  const all = await getCatalogue(userDataDir, resourcesDir)
  const counts = new Map<string, number>()
  for (const server of all) counts.set(server.category, (counts.get(server.category) ?? 0) + 1)
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** The handful of servers the wall opens on, plus the totals the shell needs. */
export async function getFeatured(
  userDataDir: string,
  resourcesDir: string,
  ids: string[]
): Promise<ServerPage> {
  const all = await getCatalogue(userDataDir, resourcesDir)
  const byId = new Map(all.map((s) => [s.id, s]))
  const picked = ids.map((id) => byId.get(id)).filter((s): s is MergedServerEntry => Boolean(s))

  // Curation may not have loaded on a cold start; fall back to the ranking so the
  // wall is never empty.
  const servers = picked.length >= 6 ? picked : all.slice(0, 9)
  return { servers, total: servers.length, catalogueTotal: all.length }
}

/** Looked up by id so the renderer can open a detail without holding the catalogue. */
export async function findServer(
  userDataDir: string,
  resourcesDir: string,
  id: string
): Promise<MergedServerEntry | null> {
  const all = await getCatalogue(userDataDir, resourcesDir)
  return all.find((s) => s.id === id) ?? null
}
