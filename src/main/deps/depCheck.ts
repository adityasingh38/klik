import { execAsync, memoizeFor } from '../lib/exec'
import type { RuntimeKind } from '../../shared/types'

/** Whether a runtime is on PATH doesn't change while the app is open. */
const RUNTIME_TTL_MS = 60000

const WINGET_PACKAGE_IDS: Record<RuntimeKind, string | null> = {
  node: 'OpenJS.NodeJS.LTS',
  python: 'Python.Python.3.12',
  uv: 'astral-sh.uv',
  docker: null // not auto-installed in v1; detection only
}

const CHECK_COMMANDS: Record<RuntimeKind, string> = {
  node: 'node',
  python: 'python',
  uv: 'uv',
  docker: 'docker'
}

/**
 * Async and memoized. This runs once per required runtime while building an install
 * preview; done synchronously on the main process it froze the interface for the
 * duration of every lookup, which is the moment the user is waiting on a dialog.
 */
const probes = new Map<RuntimeKind, () => Promise<boolean>>()

/** Clears memoized probes. Exists so tests aren't served an answer from a prior case. */
export function resetRuntimeProbes(): void {
  probes.clear()
}

export function isRuntimeAvailable(runtime: RuntimeKind): Promise<boolean> {
  let probe = probes.get(runtime)
  if (!probe) {
    probe = memoizeFor(RUNTIME_TTL_MS, async () => {
      const result = await execAsync('where', [CHECK_COMMANDS[runtime]], 8000)
      return result.ok
    })
    probes.set(runtime, probe)
  }
  return probe()
}

export function wingetPackageId(runtime: RuntimeKind): string | null {
  return WINGET_PACKAGE_IDS[runtime]
}
