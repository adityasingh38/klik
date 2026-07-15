import { app, ipcMain } from 'electron'
import { loadRegistry } from '../registry/client'
import { loadCuration, mergeCuration } from '../curation/overlay'
import { claudeDesktopAdapter } from '../clients/claudeDesktop'
import { cursorAdapter } from '../clients/cursor'
import { vscodeAdapter } from '../clients/vscode'
import { detectInstalledClients } from '../clients/detect'
import { listInstalled } from '../install/state'
import { installServer } from '../install/installer'
import type { ClientId, InstallRequest } from '../../shared/types'
import type { ClientAdapter } from '../clients/types'

const adaptersById: Record<ClientId, ClientAdapter> = {
  'claude-desktop': claudeDesktopAdapter,
  cursor: cursorAdapter,
  vscode: vscodeAdapter
}

export function registerIpcHandlers(): void {
  ipcMain.handle('klik:getServers', async () => {
    const userDataDir = app.getPath('userData')
    const resourcesDir = process.resourcesPath
    const [{ entries }, curation] = await Promise.all([loadRegistry(userDataDir), loadCuration(resourcesDir)])
    return mergeCuration(entries, curation)
  })

  ipcMain.handle('klik:getClients', () => detectInstalledClients())

  ipcMain.handle('klik:getInstalled', () => listInstalled(app.getPath('userData')))

  ipcMain.handle('klik:install', (_event, request: InstallRequest) =>
    installServer(request, {
      adaptersById,
      userDataDir: app.getPath('userData'),
      now: () => new Date().toISOString()
    })
  )
}
