import type { ClientAdapter } from '../clients/types'
import { isRuntimeAvailable, wingetPackageId } from '../deps/depCheck'
import type {
  ClientId,
  InstallPreview,
  InstallTargetPreview,
  PreflightRequest,
  RuntimeStatus
} from '../../shared/types'

export interface PreflightDeps {
  adaptersById: Record<ClientId, ClientAdapter>
}

/** The exact command line the MCP client will execute for a stdio server. */
export function commandLineFor(command?: string, args?: string[]): string | undefined {
  if (!command) return undefined
  return [command, ...(args ?? [])].join(' ')
}

/**
 * Resolves everything an install would touch — the command that will run, the config
 * files that get written, missing runtimes, secrets, and curation warnings — without
 * performing any of it. The install preview renders this so the user approves a
 * concrete action rather than a black box.
 */
export async function buildInstallPreview(
  request: PreflightRequest,
  deps: PreflightDeps
): Promise<InstallPreview> {
  const { server, targetClients } = request

  // Probed in parallel — a server needing three runtimes shouldn't wait for three
  // sequential PATH lookups before its preview can render.
  const runtimes: RuntimeStatus[] = await Promise.all(
    server.requiredRuntime.map(async (runtime) => ({
      runtime,
      available: await isRuntimeAvailable(runtime),
      canAutoInstall: wingetPackageId(runtime) !== null
    }))
  )

  const targets: InstallTargetPreview[] = targetClients.map((clientId) => {
    const adapter = deps.adaptersById[clientId]
    if (!adapter) {
      return { clientId, displayName: clientId, configPath: '', supported: false, reason: 'Unknown client' }
    }
    const base = {
      clientId,
      displayName: adapter.displayName,
      configPath: adapter.getConfigPath()
    }
    if (!adapter.isInstalled()) {
      return { ...base, supported: false, reason: `${adapter.displayName} is not installed` }
    }
    if (server.transport === 'http' && !adapter.supportsHttpTransport) {
      return { ...base, supported: false, reason: `${adapter.displayName} does not support HTTP servers` }
    }
    return { ...base, supported: true }
  })

  const warnings = [...(server.curation?.warnings ?? [])]
  if (server.transport === 'http' && server.requiredEnv.some((env) => env.isRequired)) {
    warnings.push('HTTP servers with required secrets are not supported in v1.')
  }

  return {
    serverId: server.id,
    title: server.title,
    transport: server.transport,
    commandLine: commandLineFor(server.command, server.args),
    url: server.url,
    runtimes,
    targets,
    secretNames: server.requiredEnv.filter((env) => env.isRequired).map((env) => env.name),
    warnings,
    verified: server.curation?.verified ?? false,
    tested: server.curation?.tested ?? false
  }
}
