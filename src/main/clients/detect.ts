import { claudeDesktopAdapter } from './claudeDesktop'
import { cursorAdapter } from './cursor'
import { vscodeAdapter } from './vscode'
import type { ClientInfo } from '../../shared/types'
import type { ClientAdapter } from './types'

const ALL_ADAPTERS: ClientAdapter[] = [claudeDesktopAdapter, cursorAdapter, vscodeAdapter]

export function detectInstalledClients(): ClientInfo[] {
  return ALL_ADAPTERS.map((adapter) => ({
    id: adapter.id,
    displayName: adapter.displayName,
    installed: adapter.isInstalled(),
    configPath: adapter.getConfigPath()
  }))
}
