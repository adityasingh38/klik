import type { ClientId } from '../../shared/types'

export interface McpServerConfigEntry {
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
}

export interface ClientAdapter {
  id: ClientId
  displayName: string
  isInstalled(): boolean
  getConfigPath(): string
  readConfig(): Record<string, McpServerConfigEntry>
  writeServer(name: string, entry: McpServerConfigEntry): void
  removeServer(name: string): void
}
