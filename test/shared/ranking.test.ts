import { describe, it, expect } from 'vitest'
import { rankServers, significanceScore, countByNamespace } from '../../src/shared/ranking'
import type { MergedServerEntry } from '../../src/shared/types'

function server(id: string, extra: Partial<MergedServerEntry> = {}): MergedServerEntry {
  return {
    id,
    title: extra.title ?? id,
    description: 'A server.',
    version: '1.0.0',
    transport: 'stdio',
    requiredRuntime: [],
    requiredEnv: [],
    category: 'Other',
    ...extra
  } as MergedServerEntry
}

describe('significanceScore', () => {
  it('puts a verified server above an unverified one', () => {
    const counts = new Map<string, number>()
    const verified = server('com.acme/x', {
      curation: { registryId: 'x', verified: true, tested: true, category: 'Other', warnings: [] }
    })
    expect(significanceScore(verified, counts)).toBeGreaterThan(
      significanceScore(server('io.github.someone/y'), counts)
    )
  })

  it('rewards a vendor namespace over a personal github one', () => {
    const counts = new Map<string, number>()
    expect(significanceScore(server('com.notion/mcp'), counts)).toBeGreaterThan(
      significanceScore(server('io.github.person/mcp'), counts)
    )
  })

  it('penalises a namespace that has bulk-registered', () => {
    const counts = new Map([['io.github.flooder', 1240]])
    const flooded = significanceScore(server('io.github.flooder/one'), counts)
    const normal = significanceScore(server('io.github.person/one'), new Map([['io.github.person', 1]]))
    expect(flooded).toBeLessThan(normal)
  })

  it('counts a publisher with an icon as more significant', () => {
    const counts = new Map<string, number>()
    expect(significanceScore(server('io.github.a/x', { iconUrl: 'https://x/i.png' }), counts)).toBeGreaterThan(
      significanceScore(server('io.github.a/x'), counts)
    )
  })
})

describe('rankServers', () => {
  it('leads with the servers a person actually wants, and keeps the rest', () => {
    const bulk = Array.from({ length: 40 }, (_, i) => server(`io.github.flooder/s${i}`))
    const good = server('com.notion/notion-mcp', {
      title: 'Notion',
      iconUrl: 'https://notion.so/i.png',
      websiteUrl: 'https://notion.so',
      curation: { registryId: 'x', verified: true, tested: true, category: 'Docs', warnings: [] }
    })

    const ranked = rankServers([...bulk, good])

    expect(ranked[0].id).toBe('com.notion/notion-mcp')
    // Nothing is dropped — ranking only decides order.
    expect(ranked).toHaveLength(41)
  })

  it('is stable for equal scores', () => {
    const ranked = rankServers([server('io.github.a/z', { title: 'Zebra' }), server('io.github.a/a', { title: 'Apple' })])
    expect(ranked.map((s) => s.title)).toEqual(['Apple', 'Zebra'])
  })
})

describe('countByNamespace', () => {
  it('groups by the publisher prefix', () => {
    const counts = countByNamespace([{ id: 'a.b/one' }, { id: 'a.b/two' }, { id: 'c.d/one' }])
    expect(counts.get('a.b')).toBe(2)
    expect(counts.get('c.d')).toBe(1)
  })
})
