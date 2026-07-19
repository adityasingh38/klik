import { app, BrowserWindow, Menu, nativeTheme } from 'electron'
import { join } from 'node:path'
import { registerIpcHandlers } from './ipc/handlers'
import { readPreferences } from './prefs/store'

/**
 * The window paints before the renderer has loaded, so this colour is the very first
 * thing anyone sees. It has to match the theme the renderer is about to draw, or the
 * app opens with a flash of the wrong one — it was still painting the old graphite
 * even in light mode.
 */
function startupChrome(): { background: string; symbol: string } {
  const preference = readPreferences(app.getPath('userData')).theme
  const dark = preference === 'dark' || (preference === 'system' && nativeTheme.shouldUseDarkColors)
  return dark
    ? { background: '#0b1512', symbol: '#9aaca7' }
    : { background: '#f7faf9', symbol: '#556762' }
}

function createWindow(): void {
  const chrome = startupChrome()
  const win = new BrowserWindow({
    // Packaged, the icon is baked in by electron-builder; unpackaged this is what
    // stops the taskbar showing the default Electron icon during development.
    icon: join(__dirname, '../../build/icon.png'),
    width: 1180,
    height: 820,
    minWidth: 880,
    minHeight: 600,
    backgroundColor: chrome.background,
    // Painted only once there's something to show, so the window never appears empty.
    show: false,
    // Custom chrome: drop the native title bar + OS menu (the "unfinished
    // Electron" tell), keep native window controls as an overlay the renderer
    // draws its own titlebar behind.
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: chrome.background,
      symbolColor: chrome.symbol,
      height: 40
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.once('ready-to-show', () => win.show())

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  if (process.env.KLIK_PERF) console.log('[perf] whenReady', Math.round(process.uptime() * 1000))
  Menu.setApplicationMenu(null)
  registerIpcHandlers()
  createWindow()
  if (process.env.KLIK_PERF) console.log('[perf] windowCreated', Math.round(process.uptime() * 1000))
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
