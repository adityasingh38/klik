import type { MergedServerEntry } from './types'

/**
 * The registry holds ~15,000 servers, and most of it is noise: three quarters are
 * personal `io.github.*` repositories, only 5% ship an icon, and a single publisher
 * has bulk-registered over a thousand entries. Showing all of it unranked buries the
 * servers people actually want under whatever happened to be published last.
 *
 * Nothing is hidden — every server stays searchable and installable. This only decides
 * what the list leads with.
 */

/** How many entries a namespace can publish before it reads as bulk registration. */
const FLOOD_THRESHOLD = 12

export function namespaceOf(id: string): string {
  return id.split('/')[0] ?? id
}

export function countByNamespace(servers: Array<{ id: string }>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const server of servers) {
    const ns = namespaceOf(server.id)
    counts.set(ns, (counts.get(ns) ?? 0) + 1)
  }
  return counts
}

/**
 * A publisher's own reverse-DNS namespace (com.notion, ai.exa) means someone claimed
 * the entry as their product. `io.github.*` is the default for anything pushed from a
 * personal repository, which is most of the registry.
 */
function isVendorNamespace(id: string): boolean {
  const ns = namespaceOf(id)
  return !ns.startsWith('io.github.') && ns.includes('.')
}

export function significanceScore(
  server: MergedServerEntry,
  namespaceCounts: Map<string, number>
): number {
  let score = 0

  // Hand-verified by Klik outranks every automatic signal.
  if (server.curation?.verified) score += 60
  if (server.curation?.tested) score += 15

  // Effort the publisher put into being recognisable.
  if (server.iconUrl) score += 20
  if (isVendorNamespace(server.id)) score += 16
  if (server.websiteUrl) score += 8
  if (server.repositoryUrl) score += 4

  // A description that says something beyond the name.
  if (server.description && server.description.length > 60) score += 4

  // Bulk registration: one namespace with hundreds of entries shouldn't be able to
  // occupy the whole list.
  const siblings = namespaceCounts.get(namespaceOf(server.id)) ?? 1
  if (siblings > FLOOD_THRESHOLD) {
    score -= Math.min(40, Math.floor(siblings / FLOOD_THRESHOLD) * 6)
  }

  return score
}

/** Most significant first; ties broken alphabetically so the order is stable. */
export function rankServers(servers: MergedServerEntry[]): MergedServerEntry[] {
  const counts = countByNamespace(servers)
  return [...servers].sort((a, b) => {
    const diff = significanceScore(b, counts) - significanceScore(a, counts)
    if (diff !== 0) return diff
    return a.title.localeCompare(b.title)
  })
}
