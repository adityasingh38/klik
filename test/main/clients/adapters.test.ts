import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { claudeDesktopAdapter } from '../../../src/main/clients/claudeDesktop'
import { cursorAdapter } from '../../../src/main/clients/cursor'
import { vscodeAdapter } from '../../../src/main/clients/vscode'

describe('client adapter path + key configuration', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-adapters-'))
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

  it('Claude Desktop reads/writes claude_desktop_config.json under mcpServers', () => {
    expect(claudeDesktopAdapter.getConfigPath()).toBe(join(tmpDir, 'Claude', 'claude_desktop_config.json'))
    claudeDesktopAdapter.writeServer('demo', { command: 'npx', args: ['-y', 'demo'] })
    const written = JSON.parse(readFileSync(claudeDesktopAdapter.getConfigPath(), 'utf-8'))
    expect(written.mcpServers.demo).toEqual({ command: 'npx', args: ['-y', 'demo'] })
  })

  it('Cursor reads/writes .cursor/mcp.json under mcpServers', () => {
    expect(cursorAdapter.getConfigPath()).toBe(join(tmpDir, '.cursor', 'mcp.json'))
    cursorAdapter.writeServer('demo', { command: 'npx', args: ['-y', 'demo'] })
    const written = JSON.parse(readFileSync(cursorAdapter.getConfigPath(), 'utf-8'))
    expect(written.mcpServers.demo).toEqual({ command: 'npx', args: ['-y', 'demo'] })
  })

  it('VS Code reads/writes Code/User/mcp.json under servers, not mcpServers', () => {
    expect(vscodeAdapter.getConfigPath()).toBe(join(tmpDir, 'Code', 'User', 'mcp.json'))
    vscodeAdapter.writeServer('demo', { command: 'npx', args: ['-y', 'demo'] })
    const written = JSON.parse(readFileSync(vscodeAdapter.getConfigPath(), 'utf-8'))
    expect(written.servers.demo).toEqual({ command: 'npx', args: ['-y', 'demo'] })
  })
})
