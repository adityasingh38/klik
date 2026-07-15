export type ClientId = 'claude-desktop' | 'cursor' | 'vscode'

export interface ClientInfo {
  id: ClientId
  displayName: string
  installed: boolean
  configPath: string
}

export type RuntimeKind = 'node' | 'python' | 'uv' | 'docker'

export type TransportKind = 'stdio' | 'http'

export interface RegistryEnvVar {
  name: string
  description: string
  isRequired: boolean
  isSecret: boolean
}

export interface RegistryServerEntry {
  /** The registry's stable `name` field, e.g. "ai.agenttrust/mcp-server". */
  id: string
  title: string
  description: string
  version: string
  transport: TransportKind
  command?: string
  args?: string[]
  url?: string
  requiredRuntime: RuntimeKind[]
  requiredEnv: RegistryEnvVar[]
  repositoryUrl?: string
}

export interface CurationEntry {
  registryId: string
  verified: boolean
  tested: boolean
  category: string
  warnings: string[]
}

export interface MergedServerEntry extends RegistryServerEntry {
  curation?: CurationEntry
}

export interface InstallRequest {
  server: MergedServerEntry
  targetClients: ClientId[]
  secrets: Record<string, string>
}

export type InstallStepStatus = 'pending' | 'running' | 'done' | 'error'

export interface InstallStepResult {
  serverId: string
  clientId: ClientId
  status: InstallStepStatus
  message?: string
}

export interface InstalledServerRecord {
  serverId: string
  clients: ClientId[]
  installedAt: string
}

export interface GetServersResult {
  servers: MergedServerEntry[]
  fromCache: boolean
}
