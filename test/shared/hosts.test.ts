import { describe, it, expect } from 'vitest'
import { MCP_HOSTS, hostsForTransport } from '../../src/shared/hosts'

describe('hostsForTransport', () => {
  it('returns every host for stdio except remote-only ones', () => {
    const stdio = hostsForTransport('stdio').map((h) => h.id)
    // ChatGPT only consumes remote connectors — it must not appear for stdio servers.
    expect(stdio).not.toContain('chatgpt')
    expect(stdio).toContain('claude-desktop')
    expect(stdio).toContain('cursor')
  })

  it('includes remote-only hosts for http servers', () => {
    const http = hostsForTransport('http').map((h) => h.id)
    expect(http).toContain('chatgpt')
    expect(http).toContain('claude-desktop')
  })

  it('every host declares at least one transport', () => {
    for (const host of MCP_HOSTS) {
      expect(host.transports.length).toBeGreaterThan(0)
    }
  })

  it('a detectable host maps to a real client id', () => {
    const withClient = MCP_HOSTS.filter((h) => h.clientId)
    expect(withClient.map((h) => h.clientId)).toEqual(
      expect.arrayContaining(['claude-desktop', 'cursor', 'vscode'])
    )
  })
})
