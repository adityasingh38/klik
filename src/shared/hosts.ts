import type { ClientId, TransportKind } from './types'
import { TOOL_BRANDS } from './tools'

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
 * Brand identity (name/short/accent) comes from the shared {@link TOOL_BRANDS}
 * registry so a host looks identical everywhere it appears. `clientId` is set only
 * for hosts Klik can currently detect and write config into; the rest are
 * compatibility information the user can act on themselves.
 */
export interface McpHost {
  id: string
  name: string
  short: string
  accent: string
  /** App-level MCP transports this host can consume. */
  transports: TransportKind[]
  /** Set when Klik can detect/install into this host directly. */
  clientId?: ClientId
}

interface HostSpec {
  brandId: string
  transports: TransportKind[]
  clientId?: ClientId
}

/** Ordered by prominence — this is the order chips render in. */
const HOST_SPECS: HostSpec[] = [
  { brandId: 'claude-desktop', transports: ['stdio', 'http'], clientId: 'claude-desktop' },
  { brandId: 'claude-code', transports: ['stdio', 'http'] },
  { brandId: 'cursor', transports: ['stdio', 'http'], clientId: 'cursor' },
  { brandId: 'vscode', transports: ['stdio', 'http'], clientId: 'vscode' },
  { brandId: 'windsurf', transports: ['stdio', 'http'] },
  { brandId: 'zed', transports: ['stdio', 'http'] },
  { brandId: 'cline', transports: ['stdio', 'http'] },
  { brandId: 'chatgpt', transports: ['http'] }
]

export const MCP_HOSTS: McpHost[] = HOST_SPECS.map((spec) => {
  const brand = TOOL_BRANDS[spec.brandId]
  return {
    id: brand.id,
    name: brand.name,
    short: brand.short,
    accent: brand.accent,
    transports: spec.transports,
    clientId: spec.clientId
  }
})

/** The hosts that can run a server speaking the given transport. */
export function hostsForTransport(transport: TransportKind): McpHost[] {
  return MCP_HOSTS.filter((host) => host.transports.includes(transport))
}
