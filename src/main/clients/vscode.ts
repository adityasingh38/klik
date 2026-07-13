import { join } from 'node:path'
import { createConfigFileAdapter } from './configFileAdapter'

function appDataDir(): string {
  return process.env.APPDATA ?? join(process.env.USERPROFILE ?? '', 'AppData', 'Roaming')
}

function localAppDataDir(): string {
  return process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? '', 'AppData', 'Local')
}

export const vscodeAdapter = createConfigFileAdapter({
  id: 'vscode',
  displayName: 'VS Code',
  serversKey: 'servers',
  resolveExePath: () => join(localAppDataDir(), 'Programs', 'Microsoft VS Code', 'Code.exe'),
  resolveConfigPath: () => join(appDataDir(), 'Code', 'User', 'mcp.json')
})
