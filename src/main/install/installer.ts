import type { ClientAdapter, McpServerConfigEntry } from '../clients/types'
import { isRuntimeAvailable, wingetPackageId } from '../deps/depCheck'
import { wingetInstall } from '../deps/winget'
import { recordInstall } from './state'
import type { ClientId, InstallRequest, InstallStepResult } from '../../shared/types'

export interface InstallerDeps {
  adaptersById: Record<ClientId, ClientAdapter>
  userDataDir: string
  now: () => string
}

function buildConfigEntry(request: InstallRequest): McpServerConfigEntry {
  const { server, secrets } = request
  if (server.transport === 'http') {
    return { url: server.url }
  }
  const env: Record<string, string> = {}
  for (const envVar of server.requiredEnv) {
    if (secrets[envVar.name] !== undefined) env[envVar.name] = secrets[envVar.name]
  }
  return { command: server.command, args: server.args, env: Object.keys(env).length > 0 ? env : undefined }
}

export async function installServer(request: InstallRequest, deps: InstallerDeps): Promise<InstallStepResult[]> {
  const results: InstallStepResult[] = []

  const missingSecrets = request.server.requiredEnv.filter(
    (envVar) => envVar.isRequired && !request.secrets[envVar.name]
  )
  if (missingSecrets.length > 0) {
    for (const clientId of request.targetClients) {
      results.push({
        serverId: request.server.id,
        clientId,
        status: 'error',
        message: `Missing required value(s): ${missingSecrets.map((s) => s.name).join(', ')}`
      })
    }
    return results
  }

  if (request.server.transport === 'http' && request.server.requiredEnv.some((envVar) => envVar.isRequired)) {
    for (const clientId of request.targetClients) {
      results.push({
        serverId: request.server.id,
        clientId,
        status: 'error',
        message:
          'HTTP-transport servers with required secrets are not supported in v1 (no way to deliver the secret to the client config)'
      })
    }
    return results
  }

  for (const runtime of request.server.requiredRuntime) {
    if (isRuntimeAvailable(runtime)) continue
    const packageId = wingetPackageId(runtime)
    if (!packageId) continue
    const install = wingetInstall(packageId)
    if (!install.success) {
      for (const clientId of request.targetClients) {
        results.push({
          serverId: request.server.id,
          clientId,
          status: 'error',
          message: `Failed to install ${runtime}: ${install.message}`
        })
      }
      return results
    }
  }

  const entry = buildConfigEntry(request)
  const succeededClients: ClientId[] = []

  for (const clientId of request.targetClients) {
    const adapter = deps.adaptersById[clientId]
    if (!adapter || !adapter.isInstalled()) {
      results.push({ serverId: request.server.id, clientId, status: 'error', message: `${clientId} is not installed` })
      continue
    }
    try {
      adapter.writeServer(request.server.id, entry)
      results.push({ serverId: request.server.id, clientId, status: 'done' })
      succeededClients.push(clientId)
    } catch (error) {
      results.push({
        serverId: request.server.id,
        clientId,
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  if (succeededClients.length > 0) {
    recordInstall(deps.userDataDir, request.server.id, succeededClients, deps.now())
  }

  return results
}
