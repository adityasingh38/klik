import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installServer } from '../../../src/main/install/installer'
import { statePath } from '../../../src/main/install/state'
import type { ClientAdapter } from '../../../src/main/clients/types'
import type { InstallRequest, MergedServerEntry } from '../../../src/shared/types'

vi.mock('../../../src/main/deps/depCheck', () => ({
  isRuntimeAvailable: vi.fn(() => true),
  wingetPackageId: vi.fn(() => 'Some.Package')
}))
vi.mock('../../../src/main/deps/winget', () => ({
  wingetInstall: vi.fn(() => ({ success: true, message: '' }))
}))

import { isRuntimeAvailable, wingetPackageId } from '../../../src/main/deps/depCheck'
import { wingetInstall } from '../../../src/main/deps/winget'

function fakeAdapter(id: 'claude-desktop' | 'cursor', installed = true): ClientAdapter {
  const store: Record<string, unknown> = {}
  return {
    id,
    displayName: id,
    isInstalled: () => installed,
    getConfigPath: () => '/fake/path',
    readConfig: () => store as any,
    writeServer: (name, entry) => {
      store[name] = entry
    },
    removeServer: (name) => {
      delete store[name]
    }
  }
}

const baseServer: MergedServerEntry = {
  id: 'ai.example/foo',
  title: 'Foo',
  description: 'desc',
  version: '1.0.0',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', 'foo@1.0.0'],
  requiredRuntime: ['node'],
  requiredEnv: [{ name: 'FOO_KEY', description: '', isRequired: true, isSecret: true }]
}

describe('installServer', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-install-'))
    vi.mocked(isRuntimeAvailable).mockReturnValue(true)
    vi.mocked(wingetPackageId).mockReturnValue('Some.Package')
    vi.mocked(wingetInstall).mockReturnValue({ success: true, message: '' })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('errors per client when a required secret is missing, without calling winget or writing config', async () => {
    const request: InstallRequest = { server: baseServer, targetClients: ['claude-desktop'], secrets: {} }
    const adapter = fakeAdapter('claude-desktop')

    const results = await installServer(request, {
      adaptersById: { 'claude-desktop': adapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    expect(results).toEqual([
      { serverId: 'ai.example/foo', clientId: 'claude-desktop', status: 'error', message: 'Missing required value(s): FOO_KEY' }
    ])
    expect(adapter.readConfig()).toEqual({})
  })

  it('installs a missing runtime via winget before writing config', async () => {
    vi.mocked(isRuntimeAvailable).mockReturnValue(false)
    const request: InstallRequest = {
      server: baseServer,
      targetClients: ['claude-desktop'],
      secrets: { FOO_KEY: 'secret-value' }
    }
    const adapter = fakeAdapter('claude-desktop')

    const results = await installServer(request, {
      adaptersById: { 'claude-desktop': adapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    expect(wingetInstall).toHaveBeenCalledWith('Some.Package')
    expect(results).toEqual([{ serverId: 'ai.example/foo', clientId: 'claude-desktop', status: 'done' }])
    expect(adapter.readConfig()).toMatchObject({
      'ai.example/foo': { command: 'npx', args: ['-y', 'foo@1.0.0'], env: { FOO_KEY: 'secret-value' } }
    })
  })

  it('records a successful install in local state', async () => {
    const request: InstallRequest = {
      server: baseServer,
      targetClients: ['claude-desktop'],
      secrets: { FOO_KEY: 'secret-value' }
    }
    const adapter = fakeAdapter('claude-desktop')

    await installServer(request, {
      adaptersById: { 'claude-desktop': adapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    const state = JSON.parse(readFileSync(statePath(tmpDir), 'utf-8'))
    expect(state).toEqual([{ serverId: 'ai.example/foo', clients: ['claude-desktop'], installedAt: '2026-07-13T00:00:00.000Z' }])
  })

  it('reports an error for a target client that is not installed, without blocking other clients', async () => {
    const request: InstallRequest = {
      server: baseServer,
      targetClients: ['claude-desktop', 'cursor'],
      secrets: { FOO_KEY: 'secret-value' }
    }
    const claudeAdapter = fakeAdapter('claude-desktop')
    const cursorAdapter = fakeAdapter('cursor', false)

    const results = await installServer(request, {
      adaptersById: { 'claude-desktop': claudeAdapter, cursor: cursorAdapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    expect(results).toContainEqual({ serverId: 'ai.example/foo', clientId: 'claude-desktop', status: 'done' })
    expect(results).toContainEqual({
      serverId: 'ai.example/foo',
      clientId: 'cursor',
      status: 'error',
      message: 'cursor is not installed'
    })
  })

  it('errors per client for http-transport servers with a required secret, without writing config', async () => {
    const httpServer: MergedServerEntry = {
      ...baseServer,
      transport: 'http',
      command: undefined,
      args: undefined,
      url: 'https://example.com/mcp',
      requiredRuntime: []
    }
    const request: InstallRequest = {
      server: httpServer,
      targetClients: ['claude-desktop'],
      secrets: { FOO_KEY: 'secret-value' }
    }
    const adapter = fakeAdapter('claude-desktop')

    const results = await installServer(request, {
      adaptersById: { 'claude-desktop': adapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    expect(results).toEqual([
      {
        serverId: 'ai.example/foo',
        clientId: 'claude-desktop',
        status: 'error',
        message: 'HTTP-transport servers with required secrets are not supported in v1 (no way to deliver the secret to the client config)'
      }
    ])
    expect(adapter.readConfig()).toEqual({})
  })

  it('propagates a writeServer failure as a per-client error without blocking other clients', async () => {
    const request: InstallRequest = {
      server: baseServer,
      targetClients: ['claude-desktop', 'cursor'],
      secrets: { FOO_KEY: 'secret-value' }
    }
    const claudeAdapter = fakeAdapter('claude-desktop')
    claudeAdapter.writeServer = () => {
      throw new Error('disk full')
    }
    const cursorAdapter = fakeAdapter('cursor')

    const results = await installServer(request, {
      adaptersById: { 'claude-desktop': claudeAdapter, cursor: cursorAdapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    expect(results).toContainEqual({
      serverId: 'ai.example/foo',
      clientId: 'claude-desktop',
      status: 'error',
      message: 'disk full'
    })
    expect(results).toContainEqual({ serverId: 'ai.example/foo', clientId: 'cursor', status: 'done' })
  })

  it('aborts with a per-client error and writes nothing when winget install fails', async () => {
    vi.mocked(isRuntimeAvailable).mockReturnValue(false)
    vi.mocked(wingetInstall).mockReturnValue({ success: false, message: 'network error' })
    const request: InstallRequest = {
      server: baseServer,
      targetClients: ['claude-desktop', 'cursor'],
      secrets: { FOO_KEY: 'secret-value' }
    }
    const claudeAdapter = fakeAdapter('claude-desktop')
    const cursorAdapter = fakeAdapter('cursor')

    const results = await installServer(request, {
      adaptersById: { 'claude-desktop': claudeAdapter, cursor: cursorAdapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    expect(results).toEqual([
      {
        serverId: 'ai.example/foo',
        clientId: 'claude-desktop',
        status: 'error',
        message: 'Failed to install node: network error'
      },
      {
        serverId: 'ai.example/foo',
        clientId: 'cursor',
        status: 'error',
        message: 'Failed to install node: network error'
      }
    ])
    expect(claudeAdapter.readConfig()).toEqual({})
    expect(cursorAdapter.readConfig()).toEqual({})
  })

  it('silently skips a runtime with no winget package id (e.g. docker) and still succeeds', async () => {
    vi.mocked(isRuntimeAvailable).mockImplementation((runtime: string) => runtime !== 'docker')
    vi.mocked(wingetPackageId).mockImplementation((runtime: string) => (runtime === 'docker' ? null : 'Some.Package'))
    const dockerServer: MergedServerEntry = {
      ...baseServer,
      requiredRuntime: ['node', 'docker']
    }
    const request: InstallRequest = {
      server: dockerServer,
      targetClients: ['claude-desktop'],
      secrets: { FOO_KEY: 'secret-value' }
    }
    const adapter = fakeAdapter('claude-desktop')

    const results = await installServer(request, {
      adaptersById: { 'claude-desktop': adapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    expect(results).toEqual([{ serverId: 'ai.example/foo', clientId: 'claude-desktop', status: 'done' }])
    expect(adapter.readConfig()).toMatchObject({
      'ai.example/foo': { command: 'npx', args: ['-y', 'foo@1.0.0'], env: { FOO_KEY: 'secret-value' } }
    })
  })
})
