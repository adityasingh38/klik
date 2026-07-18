import { spawnSync } from 'node:child_process'

/**
 * Klik drives plugin management through Claude Code's own CLI rather than editing
 * ~/.claude by hand. Replicating that internal state (marketplace registry, plugin
 * cache, enable flags across two files) would drift the moment the format changes,
 * and a bad write breaks the user's Claude Code install. Delegating keeps Claude
 * Code the single source of truth — Klik just asks for things and reports back.
 *
 * Every call is spawned without a shell, so arguments can never be interpreted as
 * shell syntax; ids are additionally validated before they are passed.
 */
const CLI = 'claude'
const TIMEOUT_MS = 120000

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

function run(args: string[]): CliResult {
  const result = spawnSync(CLI, args, { encoding: 'utf-8', timeout: TIMEOUT_MS, shell: false })
  if (result.error) {
    const code = (result.error as NodeJS.ErrnoException).code
    return {
      success: false,
      stdout: '',
      message:
        code === 'ENOENT'
          ? 'The Claude Code CLI was not found on PATH — install Claude Code to manage plugins.'
          : result.error.message
    }
  }
  if (result.status !== 0) {
    return {
      success: false,
      stdout: result.stdout ?? '',
      message: (result.stderr || result.stdout || `claude exited with code ${result.status}`).trim()
    }
  }
  return { success: true, stdout: result.stdout ?? '', message: (result.stdout ?? '').trim() }
}

export function isCliAvailable(): boolean {
  return run(['--version']).success
}

export interface InstalledPluginInfo {
  id: string
  version: string
  enabled: boolean
  installPath: string
}

/** The real installed set, straight from Claude Code — not a Klik-side guess. */
export function listInstalledPlugins(): InstalledPluginInfo[] {
  const result = run(['plugin', 'list', '--json'])
  if (!result.success) return []
  try {
    const parsed = JSON.parse(result.stdout) as InstalledPluginInfo[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function listMarketplaceNames(): string[] {
  const result = run(['plugin', 'marketplace', 'list', '--json'])
  if (!result.success) return []
  try {
    const parsed = JSON.parse(result.stdout) as Array<{ name?: string; id?: string }>
    if (!Array.isArray(parsed)) return []
    return parsed.map((m) => m.name ?? m.id ?? '').filter(Boolean)
  } catch {
    return []
  }
}

export function addMarketplace(source: string): CliResult {
  if (!isValidMarketplaceSource(source)) {
    return { success: false, stdout: '', message: `Refusing to add an unrecognized marketplace source: ${source}` }
  }
  return run(['plugin', 'marketplace', 'add', source])
}

export function installPlugin(id: string): CliResult {
  if (!isValidPluginId(id)) {
    return { success: false, stdout: '', message: `Refusing to install an invalid plugin id: ${id}` }
  }
  return run(['plugin', 'install', id, '--scope', 'user'])
}

export function uninstallPlugin(id: string): CliResult {
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
