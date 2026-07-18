import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const FETCH_TIMEOUT_MS = 8000

/**
 * Curation feeds are read from disk and refreshed behind the interface.
 *
 * They used to be fetched first and fall back to the bundled copy only on failure,
 * which put two network round trips — each with a five second timeout — in front of
 * the first screen. On a slow connection that is the whole startup; and because one
 * of the URLs was mistyped, that request could never succeed, so every launch paid
 * for a request that was always going to fail.
 *
 * Reading the shipped copy is instant and always correct enough to render. A fresher
 * copy, when one arrives, is used from the next launch.
 */
export function readFeed<T>(fileName: string, resourcesDir: string, userDataDir: string): T[] {
  // A previously refreshed copy wins over the one in the installer.
  for (const path of [join(userDataDir, 'feeds', fileName), join(resourcesDir, 'curation', fileName)]) {
    if (!existsSync(path)) continue
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf-8')) as T[]
      if (Array.isArray(parsed)) return parsed
    } catch {
      // A corrupt copy shouldn't stop the next candidate from being tried.
    }
  }
  return []
}

/** Fetches a fresher copy for next launch. Never awaited on the startup path. */
export function refreshFeed(fileName: string, url: string, userDataDir: string): void {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  void fetch(url, { signal: controller.signal })
    .then(async (response) => {
      if (!response.ok) throw new Error(`${fileName} refresh failed: ${response.status}`)
      const parsed = (await response.json()) as unknown
      if (!Array.isArray(parsed) || parsed.length === 0) return
      const path = join(userDataDir, 'feeds', fileName)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, JSON.stringify(parsed, null, 2))
    })
    .catch(() => {
      // A feed that won't refresh is not an error worth surfacing: the shipped copy
      // is still serving.
    })
    .finally(() => clearTimeout(timeout))
}
