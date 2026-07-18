/**
 * The single source of truth for AI-tool brand identity across Klik. MCP hosts,
 * skill targets, and plugin targets all draw their name/short-label/accent from
 * here so a given tool looks the same everywhere it appears (a compat chip on a
 * server card, a "works in" row on a skill, the Tools view). Capabilities say
 * which kinds of thing each tool can consume — used to decide, honestly, where a
 * skill or plugin can actually be installed.
 */
export interface ToolBrand {
  id: string
  name: string
  /** Compact label for dense chip rows. */
  short: string
  /** Brand accent — the mark's fallback colour when no logo resolves. */
  accent: string
  /**
   * The vendor's own site. Its favicon is the tool's logo mark, fetched from that
   * host directly (never a third-party favicon proxy) — the same approach, and the
   * same privacy stance, as ServerLogo uses for MCP publishers.
   */
  websiteUrl: string
  /** What this tool can consume. Drives honest compatibility, not marketing. */
  capabilities: {
    mcp?: boolean
    skills?: boolean
    plugins?: boolean
  }
}

export const TOOL_BRANDS: Record<string, ToolBrand> = {
  'claude-code': { id: 'claude-code', name: 'Claude Code', short: 'Claude Code', accent: '#d97757', websiteUrl: 'https://claude.com', capabilities: { mcp: true, skills: true, plugins: true } },
  'claude-desktop': { id: 'claude-desktop', name: 'Claude Desktop', short: 'Claude', accent: '#d97757', websiteUrl: 'https://claude.com', capabilities: { mcp: true } },
  cursor: { id: 'cursor', name: 'Cursor', short: 'Cursor', accent: '#cfd2d6', websiteUrl: 'https://cursor.com', capabilities: { mcp: true, skills: true } },
  vscode: { id: 'vscode', name: 'VS Code', short: 'VS Code', accent: '#3d9bd8', websiteUrl: 'https://code.visualstudio.com', capabilities: { mcp: true } },
  windsurf: { id: 'windsurf', name: 'Windsurf', short: 'Windsurf', accent: '#3bb58a', websiteUrl: 'https://windsurf.com', capabilities: { mcp: true, skills: true } },
  zed: { id: 'zed', name: 'Zed', short: 'Zed', accent: '#8b7fff', websiteUrl: 'https://zed.dev', capabilities: { mcp: true } },
  cline: { id: 'cline', name: 'Cline', short: 'Cline', accent: '#6b8afd', websiteUrl: 'https://cline.bot', capabilities: { mcp: true } },
  chatgpt: { id: 'chatgpt', name: 'ChatGPT', short: 'ChatGPT', accent: '#10a37f', websiteUrl: 'https://openai.com', capabilities: { mcp: true } }
}

/** The vendor's own favicon — the tool's logo mark. Null when the URL is unusable. */
export function toolLogoUrl(brand: ToolBrand): string | null {
  try {
    const url = new URL(brand.websiteUrl)
    if (url.protocol !== 'https:') return null
    return `${url.origin}/favicon.ico`
  } catch {
    return null
  }
}

export function toolBrand(id: string): ToolBrand | undefined {
  return TOOL_BRANDS[id]
}

/** Tools that can consume the given kind of installable, in registry order. */
export function toolsWithCapability(cap: 'mcp' | 'skills' | 'plugins'): ToolBrand[] {
  return Object.values(TOOL_BRANDS).filter((t) => t.capabilities[cap])
}
