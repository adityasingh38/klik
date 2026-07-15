import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listInstalled, recordInstall, recordUninstall } from '../../../src/main/install/state'

describe('install state tracker', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-state-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns an empty list when no state file exists', () => {
    expect(listInstalled(tmpDir)).toEqual([])
  })

  it('records a new install', () => {
    recordInstall(tmpDir, 'ai.example/foo', ['claude-desktop'], '2026-07-13T00:00:00.000Z')

    expect(listInstalled(tmpDir)).toEqual([
      { serverId: 'ai.example/foo', clients: ['claude-desktop'], installedAt: '2026-07-13T00:00:00.000Z' }
    ])
  })

  it('replaces the record when the same server is installed again', () => {
    recordInstall(tmpDir, 'ai.example/foo', ['claude-desktop'], '2026-07-13T00:00:00.000Z')
    recordInstall(tmpDir, 'ai.example/foo', ['claude-desktop', 'cursor'], '2026-07-14T00:00:00.000Z')

    expect(listInstalled(tmpDir)).toEqual([
      { serverId: 'ai.example/foo', clients: ['claude-desktop', 'cursor'], installedAt: '2026-07-14T00:00:00.000Z' }
    ])
  })

  it('removes a record on uninstall', () => {
    recordInstall(tmpDir, 'ai.example/foo', ['claude-desktop'], '2026-07-13T00:00:00.000Z')
    recordInstall(tmpDir, 'ai.example/bar', ['cursor'], '2026-07-13T00:00:00.000Z')

    recordUninstall(tmpDir, 'ai.example/foo')

    expect(listInstalled(tmpDir)).toEqual([
      { serverId: 'ai.example/bar', clients: ['cursor'], installedAt: '2026-07-13T00:00:00.000Z' }
    ])
  })
})
