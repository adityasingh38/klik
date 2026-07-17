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
  /** Publisher-declared logo (registry `icons[0].src`). Only ~10% of servers set one. */
  iconUrl?: string
  /** Publisher homepage. Used to derive a favicon when `iconUrl` is absent. */
  websiteUrl?: string
}

export interface CurationEntry {
  registryId: string
  verified: boolean
  tested: boolean
  category: string
  warnings: string[]
}

/**
 * A server Klik ships itself. The public MCP registry doesn't carry the canonical
 * servers (searching it for "github"/"postgres" returns forks and mirrors), and many
 * widely-blogged packages are deprecated — so the well-known ones are curated here
 * with hand-verified install metadata instead of being discovered.
 */
export interface CuratedServerEntry extends RegistryServerEntry {
  verified: boolean
  tested: boolean
  category: string
  warnings: string[]
}

export interface MergedServerEntry extends RegistryServerEntry {
  curation?: CurationEntry
  /** Derived by Klik (curation overlay may override). Never absent on merged entries. */
  category: string
}

export interface InstallRequest {
  server: MergedServerEntry
  targetClients: ClientId[]
  secrets: Record<string, string>
  /**
   * Consent to install a missing runtime (Node/uv/…) system-wide via winget.
   * Defaults to false: Klik never installs system packages unless the user
   * explicitly approved it in the install preview.
   */
  allowRuntimeInstall?: boolean
}

export interface RuntimeStatus {
  runtime: RuntimeKind
  available: boolean
  /** Whether Klik could install it via winget, if the user consents. */
  canAutoInstall: boolean
}

export interface InstallTargetPreview {
  clientId: ClientId
  displayName: string
  configPath: string
  /** False when the client is missing or can't take this server's transport. */
  supported: boolean
  reason?: string
}

/**
 * Everything Klik is about to do, computed before anything is written, so the
 * install preview can state it plainly instead of asking for blind trust.
 */
export interface InstallPreview {
  serverId: string
  title: string
  transport: TransportKind
  /** Exact command the client will execute, e.g. `npx -y foo@1.0.0`. */
  commandLine?: string
  url?: string
  runtimes: RuntimeStatus[]
  targets: InstallTargetPreview[]
  secretNames: string[]
  warnings: string[]
  verified: boolean
  tested: boolean
}

export interface PreflightRequest {
  server: MergedServerEntry
  targetClients: ClientId[]
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
