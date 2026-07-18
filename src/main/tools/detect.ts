import { claudeDesktopAdapter } from '../clients/claudeDesktop'
import { cursorAdapter } from '../clients/cursor'
import { vscodeAdapter } from '../clients/vscode'
import {
  isClaudeCodeInstalled,
  skillsDir,
  settingsPath,
  pluginsDir
} from './claudeCode'
import type { ClientAdapter } from '../clients/types'
import type { DetectedTool } from '../../shared/catalog'

const MCP_ONLY_ADAPTERS: ClientAdapter[] = [claudeDesktopAdapter, cursorAdapter, vscodeAdapter]

/**
 * Every AI tool Klik knows how to reach, and what each one can actually consume on
 * this machine. This generalizes the MCP-only client detection: a tool may offer
 * MCP config, a skills directory, plugins, or any combination. Only capabilities
 * Klik can genuinely write to are reported — the compatibility badges elsewhere are
 * about the ecosystem, this is about this machine.
 */
export function detectTools(): DetectedTool[] {
  const tools: DetectedTool[] = MCP_ONLY_ADAPTERS.map((adapter) => ({
    id: adapter.id,
    displayName: adapter.displayName,
    installed: adapter.isInstalled(),
    capabilities: { mcp: { configPath: adapter.getConfigPath() } }
  }))

  // Claude Code is not an MCP config-file client in the same way; it's the only tool
  // that currently exposes both a skills directory and a plugin system.
  tools.push({
    id: 'claude-code',
    displayName: 'Claude Code',
    installed: isClaudeCodeInstalled(),
    capabilities: {
      skills: { dir: skillsDir() },
      plugins: { settingsPath: settingsPath(), pluginsDir: pluginsDir() }
    }
  })

  return tools
}

/** Tools that can accept a skill install right now. */
export function skillCapableTools(): DetectedTool[] {
  return detectTools().filter((t) => t.installed && t.capabilities.skills)
}
