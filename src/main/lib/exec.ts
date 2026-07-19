import { execFile } from 'node:child_process'

/**
 * Never use spawnSync here. The main process is single-threaded and serves every IPC
 * call and window event, so a synchronous spawn freezes the entire interface for as
 * long as the child takes — switching to the Plugins tab used to block the app for
 * nearly two seconds while the Claude Code CLI started up.
 */
export interface ExecResult {
  ok: boolean
  stdout: string
  stderr: string
  /** Set when the process could not be started at all. */
  errorCode?: string
}

export function execAsync(
  command: string,
  args: string[],
  timeoutMs = 120000
): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { encoding: 'utf-8', timeout: timeoutMs, windowsHide: true, shell: false },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            ok: false,
            stdout: stdout ?? '',
            stderr: stderr ?? error.message,
            errorCode: (error as NodeJS.ErrnoException).code
          })
          return
        }
        resolve({ ok: true, stdout: stdout ?? '', stderr: stderr ?? '' })
      }
    )
  })
}

/**
 * Remembers a result for a short while. Whether a CLI exists, and what it has
 * installed, does not change between two clicks — but re-answering it costs a process
 * launch every time a view mounts.
 */
export function memoizeFor<T>(ttlMs: number, load: () => Promise<T>): () => Promise<T> {
  let cachedAt = 0
  let inFlight: Promise<T> | null = null
  let value: T | null = null

  return async () => {
    const fresh = value !== null && Date.now() - cachedAt < ttlMs
    if (fresh) return value as T
    if (inFlight) return inFlight

    inFlight = load()
      .then((result) => {
        value = result
        cachedAt = Date.now()
        return result
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }
}
