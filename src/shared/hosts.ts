import type { ClientId, TransportKind } from './types'

/**
 * The well-known apps that speak MCP, and the transports each one can actually
 * consume. This is honest, protocol-level compatibility data about the ecosystem —
 * NOT a claim that Klik installs into every one of these. A server's "compatible
 * with" set is derived purely from its transport (see {@link hostsForTransport}):
 * an MCP server is a standard protocol endpoint, so what determines whether a host
 * can run it is the transport it speaks, not the model behind the host.
 *
 * `stdio` servers run in hosts that launch local processes; `http` (remote) servers
 * run in hosts that support remote MCP. ChatGPT, for instance, only consumes remote
 * connectors, so it appears for `http` servers but not `stdio` ones — that gap is
 * real signal, not an omission.
 *
 * `clientId` is set only for hosts Klik can currently detect and write config into;
 * the rest are compatibility information the user can act on themselves.
 */
export interface McpHost {
  id: string
  /** Full display name. */
  name: string
  /** Compact label for dense chip rows. */
  short: string
  /** Brand accent, used as a small colored mark — never as a fill. */
  accent: string
  /** App-level MCP transports this host can consume. */
  transports: TransportKind[]
  /** Set when Klik can detect/install into this host directly. */
  clientId?: ClientId
}

/** Ordered by prominence — this is the order chips render in. */
export const MCP_HOSTS: McpHost[] = [
  { id: 'claude-desktop', name: 'Claude Desktop', short: 'Claude', accent: '#d97757', transports: ['stdio', 'http'], clientId: 'claude-desktop' },
  { id: 'claude-code', name: 'Claude Code', short: 'Claude Code', accent: '#d97757', transports: ['stdio', 'http'] },
  { id: 'cursor', name: 'Cursor', short: 'Cursor', accent: '#cfd2d6', transports: ['stdio', 'http'], clientId: 'cursor' },
  { id: 'vscode', name: 'VS Code', short: 'VS Code', accent: '#3d9bd8', transports: ['stdio', 'http'], clientId: 'vscode' },
  { id: 'windsurf', name: 'Windsurf', short: 'Windsurf', accent: '#3bb58a', transports: ['stdio', 'http'] },
  { id: 'zed', name: 'Zed', short: 'Zed', accent: '#8b7fff', transports: ['stdio', 'http'] },
  { id: 'cline', name: 'Cline', short: 'Cline', accent: '#6b8afd', transports: ['stdio', 'http'] },
  { id: 'chatgpt', name: 'ChatGPT', short: 'ChatGPT', accent: '#10a37f', transports: ['http'] }
]

/** The hosts that can run a server speaking the given transport. */
export function hostsForTransport(transport: TransportKind): McpHost[] {
  return MCP_HOSTS.filter((host) => host.transports.includes(transport))
}
