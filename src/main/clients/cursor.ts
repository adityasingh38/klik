import { join } from 'node:path'
import { createConfigFileAdapter } from './configFileAdapter'

function userProfileDir(): string {
  return process.env.USERPROFILE ?? ''
}

function localAppDataDir(): string {
  return process.env.LOCALAPPDATA ?? join(userProfileDir(), 'AppData', 'Local')
}

export const cursorAdapter = createConfigFileAdapter({
  id: 'cursor',
  displayName: 'Cursor',
  serversKey: 'mcpServers',
  resolveExePath: () => join(localAppDataDir(), 'Programs', 'cursor', 'Cursor.exe'),
  resolveConfigPath: () => join(userProfileDir(), '.cursor', 'mcp.json')
})
