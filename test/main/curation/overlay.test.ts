import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadCuration, mergeCuration, bundledOverlayPath } from '../../../src/main/curation/overlay'

describe('loadCuration', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-curation-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    vi.unstubAllGlobals()
  })

  it('returns the fetched overlay when the network call succeeds', async () => {
    const remoteOverlay = [{ registryId: 'ai.example/foo', verified: true, tested: true, category: 'dev-tools', warnings: [] }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => remoteOverlay }))

    const result = await loadCuration(tmpDir)

    expect(result).toEqual(remoteOverlay)
  })

  it('falls back to the bundled overlay file when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const bundled = [{ registryId: 'ai.example/bar', verified: false, tested: false, category: 'misc', warnings: [] }]
    mkdirSync(join(tmpDir, 'curation'), { recursive: true })
    writeFileSync(bundledOverlayPath(tmpDir), JSON.stringify(bundled))

    const result = await loadCuration(tmpDir)

    expect(result).toEqual(bundled)
  })

  it('returns an empty array when both the fetch and the bundled file are unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await loadCuration(tmpDir)

    expect(result).toEqual([])
  })
})

describe('mergeCuration', () => {
  it('attaches curation data to matching registry entries by id', () => {
    const entries = [
      { id: 'ai.example/foo', title: 'Foo', description: '', version: '1.0.0', transport: 'stdio' as const, requiredRuntime: [], requiredEnv: [] },
      { id: 'ai.example/bar', title: 'Bar', description: '', version: '1.0.0', transport: 'stdio' as const, requiredRuntime: [], requiredEnv: [] }
    ]
    const curation = [{ registryId: 'ai.example/foo', verified: true, tested: true, category: 'dev-tools', warnings: [] }]

    const merged = mergeCuration(entries, curation)

    expect(merged[0].curation).toEqual(curation[0])
    expect(merged[1].curation).toBeUndefined()
  })
})
