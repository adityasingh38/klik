import { execAsync, memoizeFor } from '../lib/exec'

/**
 * Klik drives plugin management through Claude Code's own CLI rather than editing
 * ~/.claude by hand. Replicating that internal state (marketplace registry, plugin
 * cache, enable flags across two files) would drift the moment the format changes,
 * and a bad write breaks the user's Claude Code install. Delegating keeps Claude Code
 * the single source of truth — Klik just asks for things and reports back.
 *
 * Every call is async and shell-free. Synchronous spawns froze the whole interface,
 * because the main process serves all IPC on one thread; and read-only answers are
 * memoized, because launching the CLI on every view mount is what made switching to
 * the Plugins tab feel broken.
 */
const CLI = 'claude'
const TIMEOUT_MS = 120000
/** Long enough that repeated navigation is free, short enough to notice a change. */
const READ_TTL_MS = 15000

export interface CliResult {
  success: boolean
  stdout: string
  message: string
}

/** `name` or `name@marketplace` — nothing exotic reaches the process arguments. */
export function isValidPluginId(id: string): boolean {
  return /^[a-z0-9][a-z0-9._-]*(@[a-z0-9][a-z0-9._-]*)?$/i.test(id)
}

/** A GitHub `owner/repo`, or an https URL to one. */
export function isValidMarketplaceSource(source: string): boolean {
  return (
    /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i.test(source) ||
    /^https:\/\/[a-z0-9.-]+\/[a-z0-9._\-/]+$/i.test(source)
  )
}

async function run(args: string[]): Promise<CliResult> {
  const result = await execAsync(CLI, args, TIMEOUT_MS)
  if (!result.ok) {
    return {
      success: false,
      stdout: result.stdout,
      message:
        result.errorCode === 'ENOENT'
          ? 'The Claude Code CLI was not found on PATH — install Claude Code to manage plugins.'
          : (result.stderr || result.stdout || 'claude exited with an error').trim()
    }
  }
  return { success: true, stdout: result.stdout, message: result.stdout.trim() }
}

export interface InstalledPluginInfo {
  id: string
  version: string
  enabled: boolean
  installPath: string
}

export const isCliAvailable = memoizeFor(READ_TTL_MS, async () => (await run(['--version'])).success)

/** The real installed set, straight from Claude Code — not a Klik-side guess. */
export const listInstalledPlugins = memoizeFor(READ_TTL_MS, async (): Promise<InstalledPluginInfo[]> => {
  const result = await run(['plugin', 'list', '--json'])
  if (!result.success) return []
  try {
    const parsed = JSON.parse(result.stdout) as InstalledPluginInfo[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

export const listMarketplaceNames = memoizeFor(READ_TTL_MS, async (): Promise<string[]> => {
  const result = await run(['plugin', 'marketplace', 'list', '--json'])
  if (!result.success) return []
  try {
    const parsed = JSON.parse(result.stdout) as Array<{ name?: string; id?: string }>
    if (!Array.isArray(parsed)) return []
    return parsed.map((m) => m.name ?? m.id ?? '').filter(Boolean)
  } catch {
    return []
  }
})

export async function addMarketplace(source: string): Promise<CliResult> {
  if (!isValidMarketplaceSource(source)) {
    return { success: false, stdout: '', message: `Refusing to add an unrecognized marketplace source: ${source}` }
  }
  return run(['plugin', 'marketplace', 'add', source])
}

export async function installPlugin(id: string): Promise<CliResult> {
  if (!isValidPluginId(id)) {
    return { success: false, stdout: '', message: `Refusing to install an invalid plugin id: ${id}` }
  }
  return run(['plugin', 'install', id, '--scope', 'user'])
}

export async function uninstallPlugin(id: string): Promise<CliResult> {
  if (!isValidPluginId(id)) {
    return { success: false, stdout: '', message: `Refusing to uninstall an invalid plugin id: ${id}` }
  }
  return run(['plugin', 'uninstall', id])
}

/** The exact commands an install will run, for display in the preview. */
export function plannedCommands(pluginId: string, marketplaceSource: string, needsMarketplace: boolean): string[] {
  const commands: string[] = []
  if (needsMarketplace) commands.push(`claude plugin marketplace add ${marketplaceSource}`)
  commands.push(`claude plugin install ${pluginId} --scope user`)
  return commands
}
