import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/main/deps/depCheck', () => ({
  isRuntimeAvailable: vi.fn(() => true),
  wingetPackageId: vi.fn(() => 'Some.Package')
}))

import { isRuntimeAvailable, wingetPackageId } from '../../../src/main/deps/depCheck'
import { buildInstallPreview, commandLineFor } from '../../../src/main/install/preflight'
import type { MergedServerEntry } from '../../../src/shared/types'

function fakeAdapter(id: string, { installed = true, supportsHttpTransport = true } = {}) {
  return {
    id,
    displayName: id === 'claude-desktop' ? 'Claude Desktop' : id,
    supportsHttpTransport,
    isInstalled: () => installed,
    getConfigPath: () => `C:\\fake\\${id}.json`,
    readConfig: () => ({}),
    writeServer: () => {},
    removeServer: () => {}
  }
}

const stdioServer: MergedServerEntry = {
  id: 'ai.example/foo',
  title: 'Foo',
  description: 'desc',
  version: '1.0.0',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', 'foo@1.0.0'],
  requiredRuntime: ['node'],
  requiredEnv: [{ name: 'FOO_KEY', description: '', isRequired: true, isSecret: true }],
  category: 'Other'
}

describe('commandLineFor', () => {
  it('joins the command and args exactly as the client will run them', async () => {
    expect(commandLineFor('npx', ['-y', 'foo@1.0.0'])).toBe('npx -y foo@1.0.0')
  })

  it('returns undefined for a server with no command (http transport)', async () => {
    expect(commandLineFor(undefined, undefined)).toBeUndefined()
  })
})

describe('buildInstallPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isRuntimeAvailable).mockResolvedValue(true)
    vi.mocked(wingetPackageId).mockReturnValue('Some.Package')
  })

  it('reports the exact command, config paths, and secret names without writing anything', async () => {
    const adapter = fakeAdapter('claude-desktop')
    const preview = await buildInstallPreview(
      { server: stdioServer, targetClients: ['claude-desktop'] },
      { adaptersById: { 'claude-desktop': adapter } as any }
    )

    expect(preview).toMatchObject({
      serverId: 'ai.example/foo',
      commandLine: 'npx -y foo@1.0.0',
      secretNames: ['FOO_KEY'],
      verified: false
    })
    expect(preview.targets).toEqual([
      {
        clientId: 'claude-desktop',
        displayName: 'Claude Desktop',
        configPath: 'C:\\fake\\claude-desktop.json',
        supported: true
      }
    ])
  })

  it('flags a missing runtime and whether Klik could install it', async () => {
    vi.mocked(isRuntimeAvailable).mockResolvedValue(false)
    const preview = await buildInstallPreview(
      { server: stdioServer, targetClients: ['claude-desktop'] },
      { adaptersById: { 'claude-desktop': fakeAdapter('claude-desktop') } as any }
    )
    expect(preview.runtimes).toEqual([{ runtime: 'node', available: false, canAutoInstall: true }])
  })

  it('marks a runtime with no winget package as not auto-installable', async () => {
    vi.mocked(isRuntimeAvailable).mockResolvedValue(false)
    vi.mocked(wingetPackageId).mockReturnValue(null)
    const preview = await buildInstallPreview(
      { server: { ...stdioServer, requiredRuntime: ['docker'] }, targetClients: ['claude-desktop'] },
      { adaptersById: { 'claude-desktop': fakeAdapter('claude-desktop') } as any }
    )
    expect(preview.runtimes).toEqual([{ runtime: 'docker', available: false, canAutoInstall: false }])
  })

  it('marks an uninstalled client as an unsupported target with a reason', async () => {
    const preview = await buildInstallPreview(
      { server: stdioServer, targetClients: ['claude-desktop'] },
      { adaptersById: { 'claude-desktop': fakeAdapter('claude-desktop', { installed: false }) } as any }
    )
    expect(preview.targets[0]).toMatchObject({
      supported: false,
      reason: 'Claude Desktop is not installed'
    })
  })

  it('marks an http server unsupported for a client without http transport', async () => {
    const httpServer: MergedServerEntry = {
      ...stdioServer,
      transport: 'http',
      command: undefined,
      args: undefined,
      url: 'https://example.com/mcp',
      requiredRuntime: [],
      requiredEnv: []
    }
    const preview = await buildInstallPreview(
      { server: httpServer, targetClients: ['claude-desktop'] },
      { adaptersById: { 'claude-desktop': fakeAdapter('claude-desktop', { supportsHttpTransport: false }) } as any }
    )
    expect(preview.targets[0]).toMatchObject({ supported: false })
    expect(preview.commandLine).toBeUndefined()
    expect(preview.url).toBe('https://example.com/mcp')
  })

  it('surfaces curation warnings and verification state', async () => {
    const curated: MergedServerEntry = {
      ...stdioServer,
      curation: {
        registryId: stdioServer.id,
        verified: true,
        tested: true,
        category: 'Dev Tools',
        warnings: ['Requires full disk access.']
      }
    }
    const preview = await buildInstallPreview(
      { server: curated, targetClients: ['claude-desktop'] },
      { adaptersById: { 'claude-desktop': fakeAdapter('claude-desktop') } as any }
    )
    expect(preview).toMatchObject({ verified: true, tested: true, warnings: ['Requires full disk access.'] })
  })
})
