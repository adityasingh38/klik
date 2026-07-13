import { join } from 'node:path'
import { createConfigFileAdapter } from './configFileAdapter'

function appDataDir(): string {
  return process.env.APPDATA ?? join(process.env.USERPROFILE ?? '', 'AppData', 'Roaming')
}

function localAppDataDir(): string {
  return process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? '', 'AppData', 'Local')
}

export const claudeDesktopAdapter = createConfigFileAdapter({
  id: 'claude-desktop',
  displayName: 'Claude Desktop',
  serversKey: 'mcpServers',
  resolveExePath: () => join(localAppDataDir(), 'AnthropicClaude', 'claude.exe'),
  resolveConfigPath: () => join(appDataDir(), 'Claude', 'claude_desktop_config.json')
})
