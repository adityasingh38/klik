import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadSeedServers, mergeSeedServers, bundledSeedPath } from '../../../src/main/curation/seed'
import type { CuratedServerEntry, MergedServerEntry } from '../../../src/shared/types'

const seedEntry: CuratedServerEntry = {
  id: 'io.modelcontextprotocol/server-memory',
  title: 'Memory',
  description: 'Knowledge graph memory',
  version: '1.0.0',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-memory'],
  requiredRuntime: ['node'],
  requiredEnv: [],
  verified: true,
  tested: false,
  category: 'Productivity',
  warnings: []
}

describe('loadSeedServers', () => {
  let resourcesDir: string
  let userDataDir: string

  beforeEach(() => {
    resourcesDir = mkdtempSync(join(tmpdir(), 'klik-seed-res-'))
    userDataDir = mkdtempSync(join(tmpdir(), 'klik-seed-data-'))
    // Never let a test hit the network; the refresh is fire-and-forget.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  })

  afterEach(() => {
    rmSync(resourcesDir, { recursive: true, force: true })
    rmSync(userDataDir, { recursive: true, force: true })
    vi.unstubAllGlobals()
  })

  it('returns the bundled catalog without waiting on the network', () => {
    mkdirSync(join(resourcesDir, 'curation'), { recursive: true })
    writeFileSync(bundledSeedPath(resourcesDir), JSON.stringify([seedEntry]))
    // Synchronous by design: the first screen must not wait for a fetch.
    expect(loadSeedServers(resourcesDir, userDataDir)).toEqual([seedEntry])
  })

  it('prefers a previously refreshed copy over the bundled one', () => {
    mkdirSync(join(resourcesDir, 'curation'), { recursive: true })
    writeFileSync(bundledSeedPath(resourcesDir), JSON.stringify([seedEntry]))
    const fresher = [{ ...seedEntry, title: 'Memory (updated)' }]
    mkdirSync(join(userDataDir, 'feeds'), { recursive: true })
    writeFileSync(join(userDataDir, 'feeds', 'servers.json'), JSON.stringify(fresher))

    expect(loadSeedServers(resourcesDir, userDataDir)[0].title).toBe('Memory (updated)')
  })

  it('falls back to the bundled copy when the refreshed one is corrupt', () => {
    mkdirSync(join(resourcesDir, 'curation'), { recursive: true })
    writeFileSync(bundledSeedPath(resourcesDir), JSON.stringify([seedEntry]))
    mkdirSync(join(userDataDir, 'feeds'), { recursive: true })
    writeFileSync(join(userDataDir, 'feeds', 'servers.json'), '{ not json')

    expect(loadSeedServers(resourcesDir, userDataDir)).toEqual([seedEntry])
  })

  it('returns an empty array when neither source is available', () => {
    expect(loadSeedServers(resourcesDir, userDataDir)).toEqual([])
  })
})

describe('mergeSeedServers', () => {
  const registryEntry: MergedServerEntry = {
    id: 'ai.example/foo',
    title: 'Foo',
    description: 'desc',
    version: '1.0.0',
    transport: 'stdio',
    requiredRuntime: [],
    requiredEnv: [],
    category: 'Other'
  }

  it('puts curated servers first and exposes their verification as curation', () => {
    const merged = mergeSeedServers([registryEntry], [seedEntry])

    expect(merged).toHaveLength(2)
    expect(merged[0]).toMatchObject({
      id: 'io.modelcontextprotocol/server-memory',
      category: 'Productivity',
      curation: { verified: true, tested: false }
    })
    expect(merged[1].id).toBe('ai.example/foo')
  })

  it('lets a curated entry win over a registry entry with the same id', () => {
    const collision: MergedServerEntry = { ...registryEntry, id: seedEntry.id, title: 'Registry copy' }
    const merged = mergeSeedServers([collision], [seedEntry])

    expect(merged).toHaveLength(1)
    expect(merged[0].title).toBe('Memory')
  })

  it('does not leak the flat curation fields onto the merged entry', () => {
    const merged = mergeSeedServers([], [seedEntry])
    expect(merged[0]).not.toHaveProperty('verified')
    expect(merged[0]).not.toHaveProperty('warnings')
  })
})

describe('the shipped catalog', () => {
  const catalog = JSON.parse(
    readFileSync(join(process.cwd(), 'curation', 'servers.json'), 'utf-8')
  ) as CuratedServerEntry[]

  it('is non-empty and free of duplicate ids', () => {
    expect(catalog.length).toBeGreaterThan(0)
    expect(new Set(catalog.map((s) => s.id)).size).toBe(catalog.length)
  })

  it('gives every entry the metadata an install needs', () => {
    for (const server of catalog) {
      expect(server.title, server.id).toBeTruthy()
      expect(server.description, server.id).toBeTruthy()
      expect(server.category, server.id).toBeTruthy()
      expect(server.requiredRuntime.length, server.id).toBeGreaterThan(0)
      // Curated servers are stdio packages; a command is what actually gets run.
      expect(server.command, server.id).toBeTruthy()
      expect(server.args?.length, server.id).toBeGreaterThan(0)
    }
  })

  it('never claims a server was tested, and describes every required secret', () => {
    for (const server of catalog) {
      // Klik has reviewed these packages but does not run them — don't imply otherwise.
      expect(server.tested, server.id).toBe(false)
      for (const env of server.requiredEnv) {
        expect(env.description, `${server.id}:${env.name}`).toBeTruthy()
        expect(env.isSecret, `${server.id}:${env.name}`).toBe(true)
      }
    }
  })
})
