import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createConfigFileAdapter } from '../../../src/main/clients/configFileAdapter'

describe('createConfigFileAdapter', () => {
  let tmpDir: string
  let exePath: string
  let configPath: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-configfile-'))
    exePath = join(tmpDir, 'fake-app', 'app.exe')
    configPath = join(tmpDir, 'fake-app-config', 'config.json')
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  function makeAdapter() {
    return createConfigFileAdapter({
      id: 'claude-desktop',
      displayName: 'Fake App',
      serversKey: 'mcpServers',
      supportsHttpTransport: true,
      resolveExePath: () => exePath,
      resolveConfigPath: () => configPath
    })
  }

  it('reports not installed when the exe is absent, installed once present', () => {
    const adapter = makeAdapter()
    expect(adapter.isInstalled()).toBe(false)
    mkdirSync(dirname(exePath), { recursive: true })
    writeFileSync(exePath, '')
    expect(adapter.isInstalled()).toBe(true)
  })

  it('returns an empty server map when no config file exists', () => {
    expect(makeAdapter().readConfig()).toEqual({})
  })

  it('writes a new server without touching existing unrelated keys', () => {
    const adapter = makeAdapter()
    mkdirSync(dirname(configPath), { recursive: true })
    const existing = {
      mcpServers: { existing: { command: 'npx', args: ['existing'] } },
      unrelatedKey: 'preserve-me'
    }
    writeFileSync(configPath, JSON.stringify(existing, null, 2))

    adapter.writeServer('new-server', { command: 'npx', args: ['new-server'] })

    const written = JSON.parse(readFileSync(configPath, 'utf-8'))
    expect(written.mcpServers.existing).toEqual(existing.mcpServers.existing)
    expect(written.mcpServers['new-server']).toEqual({ command: 'npx', args: ['new-server'] })
    expect(written.unrelatedKey).toBe('preserve-me')
  })

  it('backs up the original config before writing', () => {
    const adapter = makeAdapter()
    mkdirSync(dirname(configPath), { recursive: true })
    writeFileSync(configPath, JSON.stringify({ mcpServers: {} }))

    adapter.writeServer('new-server', { command: 'npx', args: [] })

    expect(existsSync(`${configPath}.bak`)).toBe(true)
  })

  it('removes a server by name', () => {
    const adapter = makeAdapter()
    mkdirSync(dirname(configPath), { recursive: true })
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: { toRemove: { command: 'npx', args: [] }, keep: { command: 'npx', args: [] } }
      })
    )

    adapter.removeServer('toRemove')

    const written = JSON.parse(readFileSync(configPath, 'utf-8'))
    expect(written.mcpServers.toRemove).toBeUndefined()
    expect(written.mcpServers.keep).toBeDefined()
  })

  it('throws a clear error instead of a raw SyntaxError when the config file has invalid JSON', () => {
    const adapter = makeAdapter()
    mkdirSync(dirname(configPath), { recursive: true })
    writeFileSync(configPath, '{ this is not valid json')

    expect(() => adapter.readConfig()).toThrow(/not valid JSON/)
    expect(() => adapter.readConfig()).not.toThrow(SyntaxError)
  })
})
