import {
  isCliAvailable,
  listInstalledPlugins,
  listMarketplaceNames,
  addMarketplace,
  installPlugin,
  uninstallPlugin,
  plannedCommands
} from './cli'
import type {
  PluginEntry,
  PluginInstallPreview,
  PluginInstallRequest,
  PluginInstallStepResult,
  PluginPreflightRequest
} from '../../shared/catalog'

export interface PluginCli {
  isCliAvailable: typeof isCliAvailable
  listInstalledPlugins: typeof listInstalledPlugins
  listMarketplaceNames: typeof listMarketplaceNames
  addMarketplace: typeof addMarketplace
  installPlugin: typeof installPlugin
  uninstallPlugin: typeof uninstallPlugin
}

export const defaultPluginCli: PluginCli = {
  isCliAvailable,
  listInstalledPlugins,
  listMarketplaceNames,
  addMarketplace,
  installPlugin,
  uninstallPlugin
}

/** The marketplace source Klik would register, e.g. `owner/repo` from its URL. */
export function marketplaceSourceOf(plugin: PluginEntry): string {
  try {
    const url = new URL(plugin.marketplaceUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    if (url.hostname.endsWith('github.com') && parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`
    }
  } catch {
    /* fall through to the raw value */
  }
  return plugin.marketplaceUrl
}

/**
 * Resolves what installing a plugin would do — which commands run, whether a new
 * marketplace has to be trusted first, and whether it's already present — without
 * running anything.
 */
export async function buildPluginInstallPreview(
  request: PluginPreflightRequest,
  cli: PluginCli = defaultPluginCli
): Promise<PluginInstallPreview> {
  const { plugin } = request
  const cliAvailable = await cli.isCliAvailable()

  // Both are memoized reads, so mounting the view repeatedly costs nothing.
  const [installed, marketplaces] = cliAvailable
    ? await Promise.all([cli.listInstalledPlugins(), cli.listMarketplaceNames()])
    : [[], []]

  const alreadyInstalled = installed.some((p) => p.id === plugin.id)
  const marketplaceAlreadyKnown = marketplaces.includes(plugin.marketplace)
  const source = marketplaceSourceOf(plugin)

  const warnings = [...plugin.warnings]
  if (!cliAvailable) {
    warnings.push('The Claude Code CLI was not found on PATH — Klik cannot manage plugins without it.')
  }
  if (!marketplaceAlreadyKnown && cliAvailable) {
    warnings.push(
      `Klik will register a new marketplace (${source}). A marketplace can publish code that runs inside Claude Code — only add sources you trust.`
    )
  }
  if (alreadyInstalled) {
    warnings.push('This plugin is already installed.')
  }

  return {
    pluginId: plugin.id,
    title: plugin.title,
    marketplace: plugin.marketplace,
    marketplaceSource: source,
    commands: plannedCommands(plugin.id, source, !marketplaceAlreadyKnown),
    marketplaceAlreadyKnown,
    alreadyInstalled,
    cliAvailable,
    warnings,
    verified: plugin.verified
  }
}

export async function installPluginEntry(
  request: PluginInstallRequest,
  cli: PluginCli = defaultPluginCli
): Promise<PluginInstallStepResult[]> {
  const { plugin, allowMarketplaceAdd } = request
  const results: PluginInstallStepResult[] = []

  if (!(await cli.isCliAvailable())) {
    return [
      {
        pluginId: plugin.id,
        step: 'claude --version',
        status: 'error',
        message: 'The Claude Code CLI was not found on PATH.'
      }
    ]
  }

  const source = marketplaceSourceOf(plugin)
  const known = (await cli.listMarketplaceNames()).includes(plugin.marketplace)

  if (!known) {
    // Trusting a new marketplace is its own decision, never implied by "install".
    if (!allowMarketplaceAdd) {
      return [
        {
          pluginId: plugin.id,
          step: `claude plugin marketplace add ${source}`,
          status: 'error',
          message: 'Adding this marketplace was not confirmed.'
        }
      ]
    }
    const added = await cli.addMarketplace(source)
    results.push({
      pluginId: plugin.id,
      step: `claude plugin marketplace add ${source}`,
      status: added.success ? 'done' : 'error',
      ...(added.success ? {} : { message: added.message })
    })
    if (!added.success) return results
  }

  const installed = await cli.installPlugin(plugin.id)
  results.push({
    pluginId: plugin.id,
    step: `claude plugin install ${plugin.id} --scope user`,
    status: installed.success ? 'done' : 'error',
    ...(installed.success ? {} : { message: installed.message })
  })

  return results
}

export async function uninstallPluginEntry(
  pluginId: string,
  cli: PluginCli = defaultPluginCli
): Promise<PluginInstallStepResult[]> {
  const result = await cli.uninstallPlugin(pluginId)
  return [
    {
      pluginId,
      step: `claude plugin uninstall ${pluginId}`,
      status: result.success ? 'done' : 'error',
      ...(result.success ? {} : { message: result.message })
    }
  ]
}
