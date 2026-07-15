import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { isRuntimeAvailable, wingetPackageId } from '../../../src/main/deps/depCheck'

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }))

describe('depCheck', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockReset()
  })

  it('reports a runtime available when `where` exits 0', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as any)
    expect(isRuntimeAvailable('node')).toBe(true)
    expect(spawnSync).toHaveBeenCalledWith('where', ['node'], { encoding: 'utf-8' })
  })

  it('reports a runtime unavailable when `where` exits non-zero', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1 } as any)
    expect(isRuntimeAvailable('python')).toBe(false)
  })

  it('returns the correct winget package id for node, python, and uv', () => {
    expect(wingetPackageId('node')).toBe('OpenJS.NodeJS.LTS')
    expect(wingetPackageId('python')).toBe('Python.Python.3.12')
    expect(wingetPackageId('uv')).toBe('astral-sh.uv')
  })

  it('returns null for docker (not auto-installed in v1)', () => {
    expect(wingetPackageId('docker')).toBeNull()
  })
})
