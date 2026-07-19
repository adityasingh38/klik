import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DEFAULT_PREFERENCES, type Preferences } from '../../shared/prefs'

/**
 * Interface preferences live beside Klik's other state rather than in the renderer's
 * storage: the packaged app loads over file://, where web storage is unreliable, and
 * a theme that forgets itself between launches is exactly the kind of detail that
 * makes an app feel unfinished.
 */
export function prefsPath(userDataDir: string): string {
  return join(userDataDir, 'preferences.json')
}

export function readPreferences(userDataDir: string): Preferences {
  const path = prefsPath(userDataDir)
  if (!existsSync(path)) return { ...DEFAULT_PREFERENCES }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<Preferences>
    // Merged rather than trusted, so a hand-edited or older file can't produce an
    // interface with no theme at all.
    return { ...DEFAULT_PREFERENCES, ...parsed }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export function writePreferences(userDataDir: string, next: Partial<Preferences>): Preferences {
  const merged = { ...readPreferences(userDataDir), ...next }
  const path = prefsPath(userDataDir)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(merged, null, 2))
  return merged
}
