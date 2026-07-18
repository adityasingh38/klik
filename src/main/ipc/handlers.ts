import { app, ipcMain } from 'electron'
import {
  getFeatured,
  queryServers,
  serverCategories,
  findServer
} from '../registry/catalogue'
import { claudeDesktopAdapter } from '../clients/claudeDesktop'
import { cursorAdapter } from '../clients/cursor'
import { vscodeAdapter } from '../clients/vscode'
import { detectInstalledClients } from '../clients/detect'
import { detectTools } from '../tools/detect'
import { listInstalled } from '../install/state'
import { installServer, uninstallServer } from '../install/installer'
import { buildInstallPreview } from '../install/preflight'
import { buildSkillInstallPreview } from '../skills/preflight'
import { installSkill, uninstallSkill } from '../skills/installer'
import { listInstalledSkills } from '../skills/state'
import { loadSkillCatalog } from '../skills/catalog'
import {
  buildPluginInstallPreview,
  installPluginEntry,
  uninstallPluginEntry
} from '../plugins/installer'
import { listInstalledPlugins } from '../plugins/cli'
import { readPreferences, writePreferences } from '../prefs/store'
import type {
  ClientId,
  InstallRequest,
  PreflightRequest,
  ServerQuery
} from '../../shared/types'
import type { Preferences } from '../../shared/prefs'
import type { SkillEntry } from '../../shared/catalog'
import type {
  PluginInstallRequest,
  PluginPreflightRequest,
  SkillInstallRequest,
  SkillPreflightRequest
} from '../../shared/catalog'
import type { ClientAdapter } from '../clients/types'

const adaptersById: Record<ClientId, ClientAdapter> = {
  'claude-desktop': claudeDesktopAdapter,
  cursor: cursorAdapter,
  vscode: vscodeAdapter
}

/**
 * Where the bundled `curation/` folder lives. Packaged, electron-builder copies it
 * into resources/; unpackaged, `process.resourcesPath` points at Electron's own
 * install, so fall back to the project root or the bundled files never resolve.
 */
function bundledResourcesDir(): string {
  return app.isPackaged ? process.resourcesPath : app.getAppPath()
}

export function registerIpcHandlers(): void {
  ipcMain.handle('klik:getFeatured', (_event, ids: string[]) =>
    getFeatured(app.getPath('userData'), bundledResourcesDir(), ids)
  )

  ipcMain.handle('klik:queryServers', (_event, query: ServerQuery) =>
    queryServers(app.getPath('userData'), bundledResourcesDir(), query)
  )

  ipcMain.handle('klik:serverCategories', () =>
    serverCategories(app.getPath('userData'), bundledResourcesDir())
  )

  ipcMain.handle('klik:findServer', (_event, id: string) =>
    findServer(app.getPath('userData'), bundledResourcesDir(), id)
  )

  ipcMain.handle('klik:getClients', () => detectInstalledClients())

  ipcMain.handle('klik:getInstalled', () => listInstalled(app.getPath('userData')))

  ipcMain.handle('klik:preflight', (_event, request: PreflightRequest) =>
    buildInstallPreview(request, { adaptersById })
  )

  ipcMain.handle('klik:install', (_event, request: InstallRequest) =>
    installServer(request, {
      adaptersById,
      userDataDir: app.getPath('userData'),
      now: () => new Date().toISOString()
    })
  )

  ipcMain.handle('klik:uninstall', (_event, serverId: string) =>
    uninstallServer(serverId, { adaptersById, userDataDir: app.getPath('userData') })
  )

  // --- Skills -------------------------------------------------------------

  ipcMain.handle('klik:getTools', () => detectTools())

  ipcMain.handle('klik:getSkills', (_event, bundled: SkillEntry[]) =>
    loadSkillCatalog(app.getPath('userData'), bundled)
  )

  ipcMain.handle('klik:getInstalledSkills', () => listInstalledSkills(app.getPath('userData')))

  ipcMain.handle('klik:skillPreflight', (_event, request: SkillPreflightRequest) =>
    buildSkillInstallPreview(request, { tools: detectTools() })
  )

  ipcMain.handle('klik:installSkill', (_event, request: SkillInstallRequest) =>
    installSkill(request, {
      tools: detectTools(),
      userDataDir: app.getPath('userData'),
      now: () => new Date().toISOString()
    })
  )

  ipcMain.handle('klik:uninstallSkill', (_event, skillId: string) =>
    uninstallSkill(skillId, { tools: detectTools(), userDataDir: app.getPath('userData') })
  )

  // --- Plugins ------------------------------------------------------------
  // Delegated to Claude Code's own CLI, so it stays the source of truth.

  ipcMain.handle('klik:getInstalledPlugins', () => listInstalledPlugins())

  ipcMain.handle('klik:pluginPreflight', (_event, request: PluginPreflightRequest) =>
    buildPluginInstallPreview(request)
  )

  ipcMain.handle('klik:installPlugin', (_event, request: PluginInstallRequest) =>
    installPluginEntry(request)
  )

  ipcMain.handle('klik:uninstallPlugin', (_event, pluginId: string) => uninstallPluginEntry(pluginId))

  // --- Preferences ----------------------------------------------------------

  ipcMain.handle('klik:getPrefs', () => readPreferences(app.getPath('userData')))

  ipcMain.handle('klik:setPrefs', (_event, next: Partial<Preferences>) =>
    writePreferences(app.getPath('userData'), next)
  )
}
