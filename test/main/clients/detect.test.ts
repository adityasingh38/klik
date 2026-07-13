import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectInstalledClients } from '../../../src/main/clients/detect'

describe('detectInstalledClients', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-detect-'))
    process.env.APPDATA = tmpDir
    process.env.LOCALAPPDATA = tmpDir
    process.env.USERPROFILE = tmpDir
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    delete process.env.APPDATA
    delete process.env.LOCALAPPDATA
    delete process.env.USERPROFILE
  })

  it('reports all three clients as not installed when none are present', () => {
    const clients = detectInstalledClients()
    expect(clients.map((c) => c.installed)).toEqual([false, false, false])
    expect(clients.map((c) => c.id)).toEqual(['claude-desktop', 'cursor', 'vscode'])
  })

  it('reports a client as installed once its exe is present', () => {
    mkdirSync(join(tmpDir, 'AnthropicClaude'), { recursive: true })
    writeFileSync(join(tmpDir, 'AnthropicClaude', 'claude.exe'), '')

    const clients = detectInstalledClients()

    expect(clients.find((c) => c.id === 'claude-desktop')?.installed).toBe(true)
    expect(clients.find((c) => c.id === 'cursor')?.installed).toBe(false)
  })
})
