import { app, ipcMain } from 'electron'
import { loadRegistry, readCache } from '../registry/client'
import { loadCuration, mergeCuration } from '../curation/overlay'
import { claudeDesktopAdapter } from '../clients/claudeDesktop'
import { cursorAdapter } from '../clients/cursor'
import { vscodeAdapter } from '../clients/vscode'
import { detectInstalledClients } from '../clients/detect'
import { listInstalled } from '../install/state'
import { installServer, uninstallServer } from '../install/installer'
import { buildInstallPreview } from '../install/preflight'
import type { ClientId, GetServersResult, InstallRequest, PreflightRequest } from '../../shared/types'
import type { ClientAdapter } from '../clients/types'

const adaptersById: Record<ClientId, ClientAdapter> = {
  'claude-desktop': claudeDesktopAdapter,
  cursor: cursorAdapter,
  vscode: vscodeAdapter
}

export function registerIpcHandlers(): void {
  ipcMain.handle('klik:getServers', async (): Promise<GetServersResult> => {
    const userDataDir = app.getPath('userData')
    const resourcesDir = process.resourcesPath
    const cached = readCache(userDataDir)

    if (cached) {
      // Serve the on-disk cache instantly; refresh it in the background for next launch.
      void loadRegistry(userDataDir).catch(() => {})
      const curation = await loadCuration(resourcesDir)
      return { servers: mergeCuration(cached, curation), fromCache: true }
    }

    const [{ entries, fromCache }, curation] = await Promise.all([
      loadRegistry(userDataDir),
      loadCuration(resourcesDir)
    ])
    return { servers: mergeCuration(entries, curation), fromCache }
  })

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
}
