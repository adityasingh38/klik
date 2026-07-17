import { app, BrowserWindow, Menu } from 'electron'
import { join } from 'node:path'
import { registerIpcHandlers } from './ipc/handlers'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    backgroundColor: '#131518',
    // Custom chrome: drop the native title bar + OS menu (the "unfinished
    // Electron" tell), keep native window controls as an overlay the renderer
    // draws its own titlebar behind.
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#131518',
      symbolColor: '#949aa1',
      height: 40
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  registerIpcHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
