import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/main/lib/exec', () => ({
  execAsync: vi.fn(),
  memoizeFor: (_ttl: number, load: () => Promise<unknown>) => load
}))

import { execAsync } from '../../../src/main/lib/exec'
import { isRuntimeAvailable, wingetPackageId, resetRuntimeProbes } from '../../../src/main/deps/depCheck'

beforeEach(() => {
  resetRuntimeProbes()
  vi.mocked(execAsync).mockReset()
})

describe('depCheck', () => {
  it('reports a runtime available when the lookup succeeds', async () => {
    vi.mocked(execAsync).mockResolvedValue({ ok: true, stdout: 'C:\node.exe', stderr: '' })
    await expect(isRuntimeAvailable('node')).resolves.toBe(true)
  })

  it('reports a runtime unavailable when the lookup fails', async () => {
    vi.mocked(execAsync).mockResolvedValue({ ok: false, stdout: '', stderr: '', errorCode: 'ENOENT' })
    await expect(isRuntimeAvailable('docker')).resolves.toBe(false)
  })

  it('never blocks the main process — the probe is asynchronous', () => {
    vi.mocked(execAsync).mockResolvedValue({ ok: true, stdout: '', stderr: '' })
    expect(isRuntimeAvailable('node')).toBeInstanceOf(Promise)
  })

  it('maps runtimes to winget packages, and docker to none', () => {
    expect(wingetPackageId('node')).toBe('OpenJS.NodeJS.LTS')
    expect(wingetPackageId('docker')).toBeNull()
  })
})
