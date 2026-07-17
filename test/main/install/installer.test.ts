import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installServer, uninstallServer } from '../../../src/main/install/installer'
import { statePath, recordInstall } from '../../../src/main/install/state'
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

function fakeAdapter(
  id: 'claude-desktop' | 'cursor',
  installed = true,
  supportsHttpTransport = true
): ClientAdapter {
  const store: Record<string, unknown> = {}
  return {
    id,
    displayName: id,
    supportsHttpTransport,
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
  requiredEnv: [{ name: 'FOO_KEY', description: '', isRequired: true, isSecret: true }],
  category: 'Other'
}

describe('installServer', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-install-'))
    // Reset call history too — assertions like "winget was never called" are
    // meaningless if counts leak in from the previous test.
    vi.clearAllMocks()
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

  it('installs a missing runtime via winget when the user consented', async () => {
    vi.mocked(isRuntimeAvailable).mockReturnValue(false)
    const request: InstallRequest = {
      server: baseServer,
      targetClients: ['claude-desktop'],
      secrets: { FOO_KEY: 'secret-value' },
      allowRuntimeInstall: true
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

  it('never installs a runtime system-wide without consent, warning instead', async () => {
    vi.mocked(isRuntimeAvailable).mockReturnValue(false)
    const request: InstallRequest = {
      server: baseServer,
      targetClients: ['claude-desktop'],
      secrets: { FOO_KEY: 'secret-value' }
      // allowRuntimeInstall omitted — the default must not touch the system.
    }
    const adapter = fakeAdapter('claude-desktop')

    const results = await installServer(request, {
      adaptersById: { 'claude-desktop': adapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    expect(wingetInstall).not.toHaveBeenCalled()
    expect(results[0]).toMatchObject({ status: 'done' })
    expect(results[0].message).toMatch(/Node/)
    expect(adapter.readConfig()).toMatchObject({ 'ai.example/foo': { command: 'npx' } })
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
      secrets: { FOO_KEY: 'secret-value' },
      allowRuntimeInstall: true
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

  it('warns (but still succeeds) when a runtime has no winget package id (e.g. docker)', async () => {
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

    expect(results).toHaveLength(1)
    expect(results[0].status).toBe('done')
    expect(results[0].message).toMatch(/docker/i)
    expect(results[0].message).toMatch(/not installed/i)
    expect(adapter.readConfig()).toMatchObject({
      'ai.example/foo': { command: 'npx', args: ['-y', 'foo@1.0.0'], env: { FOO_KEY: 'secret-value' } }
    })
  })

  it('reports an error and does not write when an http-transport server targets a client without HTTP support, while still succeeding for a client that supports it', async () => {
    const httpServer: MergedServerEntry = {
      ...baseServer,
      transport: 'http',
      command: undefined,
      args: undefined,
      url: 'https://example.com/mcp',
      requiredRuntime: [],
      requiredEnv: []
    }
    const request: InstallRequest = {
      server: httpServer,
      targetClients: ['claude-desktop', 'cursor'],
      secrets: {}
    }
    const claudeAdapter = fakeAdapter('claude-desktop', true, false)
    const cursorAdapter = fakeAdapter('cursor', true, true)
    const claudeWriteSpy = vi.spyOn(claudeAdapter, 'writeServer')
    const cursorWriteSpy = vi.spyOn(cursorAdapter, 'writeServer')

    const results = await installServer(request, {
      adaptersById: { 'claude-desktop': claudeAdapter, cursor: cursorAdapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    expect(results).toContainEqual({
      serverId: 'ai.example/foo',
      clientId: 'claude-desktop',
      status: 'error',
      message: 'claude-desktop does not support HTTP-transport MCP servers'
    })
    expect(results).toContainEqual({ serverId: 'ai.example/foo', clientId: 'cursor', status: 'done' })
    expect(claudeWriteSpy).not.toHaveBeenCalled()
    expect(cursorWriteSpy).toHaveBeenCalled()
  })
})

describe('uninstallServer', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-uninstall-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('removes the server from every recorded client and clears the state record', () => {
    const claudeAdapter = fakeAdapter('claude-desktop')
    const cursorAdapter = fakeAdapter('cursor')
    claudeAdapter.writeServer('ai.example/foo', { command: 'npx', args: ['-y', 'foo@1.0.0'] })
    cursorAdapter.writeServer('ai.example/foo', { command: 'npx', args: ['-y', 'foo@1.0.0'] })
    recordInstall(tmpDir, 'ai.example/foo', ['claude-desktop', 'cursor'], '2026-07-13T00:00:00.000Z')

    uninstallServer('ai.example/foo', {
      adaptersById: { 'claude-desktop': claudeAdapter, cursor: cursorAdapter } as any,
      userDataDir: tmpDir
    })

    expect(claudeAdapter.readConfig()).toEqual({})
    expect(cursorAdapter.readConfig()).toEqual({})
    const state = JSON.parse(readFileSync(statePath(tmpDir), 'utf-8'))
    expect(state).toEqual([])
  })

  it('skips a client that is no longer installed without throwing, and still clears state', () => {
    const claudeAdapter = fakeAdapter('claude-desktop')
    const cursorAdapter = fakeAdapter('cursor', false)
    claudeAdapter.writeServer('ai.example/foo', { command: 'npx', args: ['-y', 'foo@1.0.0'] })
    recordInstall(tmpDir, 'ai.example/foo', ['claude-desktop', 'cursor'], '2026-07-13T00:00:00.000Z')

    expect(() =>
      uninstallServer('ai.example/foo', {
        adaptersById: { 'claude-desktop': claudeAdapter, cursor: cursorAdapter } as any,
        userDataDir: tmpDir
      })
    ).not.toThrow()

    expect(claudeAdapter.readConfig()).toEqual({})
    const state = JSON.parse(readFileSync(statePath(tmpDir), 'utf-8'))
    expect(state).toEqual([])
  })
})
