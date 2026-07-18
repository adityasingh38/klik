import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/main/lib/exec', () => ({
  execAsync: vi.fn(),
  memoizeFor: (_ttl: number, load: () => Promise<unknown>) => load
}))

import { execAsync } from '../../../src/main/lib/exec'
import { wingetInstall } from '../../../src/main/deps/winget'

beforeEach(() => {
  vi.mocked(execAsync).mockReset()
})

describe('wingetInstall', () => {
  it('reports success when winget succeeds', async () => {
    vi.mocked(execAsync).mockResolvedValue({ ok: true, stdout: 'Installed', stderr: '' })
    await expect(wingetInstall('OpenJS.NodeJS.LTS')).resolves.toEqual({
      success: true,
      message: 'Installed'
    })
  })

  it('surfaces stderr when winget fails', async () => {
    vi.mocked(execAsync).mockResolvedValue({ ok: false, stdout: '', stderr: 'package not found' })
    const result = await wingetInstall('Bogus.Package')
    expect(result.success).toBe(false)
    expect(result.message).toBe('package not found')
  })

  it('reports a helpful failure when winget itself is missing', async () => {
    vi.mocked(execAsync).mockResolvedValue({ ok: false, stdout: '', stderr: '', errorCode: 'ENOENT' })
    const result = await wingetInstall('OpenJS.NodeJS.LTS')
    expect(result.success).toBe(false)
    expect(result.message).toBeTruthy()
  })

  it('allows a long timeout — a system install can take minutes', async () => {
    vi.mocked(execAsync).mockResolvedValue({ ok: true, stdout: '', stderr: '' })
    await wingetInstall('OpenJS.NodeJS.LTS')
    expect(vi.mocked(execAsync).mock.calls[0][2]).toBeGreaterThanOrEqual(60_000)
  })
})
