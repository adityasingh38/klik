import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadRegistry, normalizeRawServer, cachePath } from '../../../src/main/registry/client'

function page(servers: unknown[], nextCursor?: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ servers, metadata: { nextCursor, count: servers.length } })
  }
}

describe('normalizeRawServer', () => {
  it('derives an npx command for an npm package', () => {
    const result = normalizeRawServer({
      name: 'ai.example/foo',
      description: 'Example server',
      version: '1.0.0',
      packages: [{ registryType: 'npm', identifier: '@example/foo', version: '1.0.0', transport: { type: 'stdio' } }]
    } as any)
    expect(result).toMatchObject({
      id: 'ai.example/foo',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@example/foo@1.0.0'],
      requiredRuntime: ['node']
    })
  })

  it('derives a uvx command for a pypi package', () => {
    const result = normalizeRawServer({
      name: 'ai.example/bar',
      description: 'Example server',
      version: '2.0.0',
      packages: [{ registryType: 'pypi', identifier: 'example-bar', version: '2.0.0', transport: { type: 'stdio' } }]
    } as any)
    expect(result).toMatchObject({ command: 'uvx', args: ['example-bar@2.0.0'], requiredRuntime: ['uv'] })
  })

  it('normalizes required environment variables from the package', () => {
    const result = normalizeRawServer({
      name: 'ai.example/secret',
      description: 'Example server',
      version: '1.0.0',
      packages: [
        {
          registryType: 'npm',
          identifier: 'secret-server',
          version: '1.0.0',
          transport: { type: 'stdio' },
          environmentVariables: [
            { name: 'API_KEY', description: 'Your API key', isRequired: true, isSecret: true }
          ]
        }
      ]
    } as any)
    expect(result?.requiredEnv).toEqual([
      { name: 'API_KEY', description: 'Your API key', isRequired: true, isSecret: true }
    ])
  })

  it('falls back to a remote http entry when no packages are present', () => {
    const result = normalizeRawServer({
      name: 'ai.example/remote',
      description: 'Remote server',
      version: '1.0.0',
      remotes: [{ type: 'streamable-http', url: 'https://example.com/mcp' }]
    } as any)
    expect(result).toMatchObject({ transport: 'http', url: 'https://example.com/mcp' })
  })

  it('returns null when a server has neither packages nor remotes', () => {
    const result = normalizeRawServer({ name: 'ai.example/empty', description: '', version: '1.0.0' } as any)
    expect(result).toBeNull()
  })
})

describe('loadRegistry', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-registry-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    vi.unstubAllGlobals()
  })

  it('fetches, paginates, filters to latest versions, and caches the result', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        page(
          [
            {
              server: {
                name: 'ai.example/foo',
                description: 'd',
                version: '1.0.0',
                packages: [{ registryType: 'npm', identifier: 'foo', version: '1.0.0', transport: { type: 'stdio' } }]
              },
              _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: false } }
            }
          ],
          'cursor-1'
        )
      )
      .mockResolvedValueOnce(
        page([
          {
            server: {
              name: 'ai.example/foo',
              description: 'd',
              version: '1.1.0',
              packages: [{ registryType: 'npm', identifier: 'foo', version: '1.1.0', transport: { type: 'stdio' } }]
            },
            _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: true } }
          }
        ])
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadRegistry(tmpDir)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.fromCache).toBe(false)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].version).toBe('1.1.0')
    expect(existsSync(cachePath(tmpDir))).toBe(true)
  })

  it('falls back to the cache when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) }))
    const cached = [
      {
        id: 'cached-entry',
        title: 'x',
        description: 'x',
        version: '1.0.0',
        transport: 'stdio',
        requiredRuntime: [],
        requiredEnv: []
      }
    ]
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(cachePath(tmpDir), JSON.stringify(cached))

    const result = await loadRegistry(tmpDir)

    expect(result.fromCache).toBe(true)
    expect(result.entries).toEqual(cached)
  })

  it('returns an empty result when both the fetch and the cache are unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await loadRegistry(tmpDir)

    expect(result.entries).toEqual([])
    expect(result.fromCache).toBe(false)
  })

  it('does not hang on a repeating/non-terminating cursor and falls back to cache', async () => {
    // Every page returns a cursor, so naive `do { } while (cursor)` loops forever.
    const fetchMock = vi.fn().mockImplementation(async () =>
      page(
        [
          {
            server: {
              name: 'ai.example/loop',
              description: 'd',
              version: '1.0.0',
              packages: [{ registryType: 'npm', identifier: 'loop', version: '1.0.0', transport: { type: 'stdio' } }]
            },
            _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: true } }
          }
        ],
        'same-cursor-forever'
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const cached = [
      {
        id: 'cached-entry',
        title: 'x',
        description: 'x',
        version: '1.0.0',
        transport: 'stdio',
        requiredRuntime: [],
        requiredEnv: []
      }
    ]
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(cachePath(tmpDir), JSON.stringify(cached))

    const result = await loadRegistry(tmpDir)

    // Must terminate (bounded by MAX_PAGES) and fall back to cache, same as any other fetch failure.
    expect(result.fromCache).toBe(true)
    expect(result.entries).toEqual(cached)
    expect(fetchMock.mock.calls.length).toBeLessThan(1000)
  }, 10000)

  it('does not overwrite an existing cache when a fetch succeeds with zero latest entries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        page(
          [
            {
              server: {
                name: 'ai.example/stale',
                description: 'd',
                version: '1.0.0',
                packages: [{ registryType: 'npm', identifier: 'stale', version: '1.0.0', transport: { type: 'stdio' } }]
              },
              // Not latest -> normalization yields zero entries even though the fetch succeeded.
              _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: false } }
            }
          ]
        )
      )
    )

    const cached = [
      {
        id: 'cached-entry',
        title: 'x',
        description: 'x',
        version: '1.0.0',
        transport: 'stdio',
        requiredRuntime: [],
        requiredEnv: []
      }
    ]
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(cachePath(tmpDir), JSON.stringify(cached))

    const result = await loadRegistry(tmpDir)

    expect(result.fromCache).toBe(false)
    expect(result.entries).toEqual([])

    const onDisk = JSON.parse(readFileSync(cachePath(tmpDir), 'utf-8'))
    expect(onDisk).toEqual(cached)
  })
})
