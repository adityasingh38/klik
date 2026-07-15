import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { wingetInstall } from '../../../src/main/deps/winget'

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }))

describe('wingetInstall', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockReset()
  })

  it('reports success when winget exits 0', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: 'Installed', stderr: '' } as any)

    const result = wingetInstall('OpenJS.NodeJS.LTS')

    expect(result).toEqual({ success: true, message: 'Installed' })
    expect(spawnSync).toHaveBeenCalledWith(
      'winget',
      ['install', '--id', 'OpenJS.NodeJS.LTS', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements'],
      { encoding: 'utf-8' }
    )
  })

  it('reports failure with stderr when winget exits non-zero', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr: 'network error' } as any)

    const result = wingetInstall('OpenJS.NodeJS.LTS')

    expect(result).toEqual({ success: false, message: 'network error' })
  })

  it('reports failure when spawnSync itself errors (e.g. winget not found)', () => {
    vi.mocked(spawnSync).mockReturnValue({ error: new Error('ENOENT') } as any)

    const result = wingetInstall('OpenJS.NodeJS.LTS')

    expect(result).toEqual({ success: false, message: 'ENOENT' })
  })
})
