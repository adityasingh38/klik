import { describe, it, expect } from 'vitest'
import { TOOL_BRANDS, toolBrand, toolsWithCapability } from '../../src/shared/tools'
import { MCP_HOSTS } from '../../src/shared/hosts'

describe('tool brand registry', () => {
  it('every brand has a non-empty accent and short label', () => {
    for (const brand of Object.values(TOOL_BRANDS)) {
      expect(brand.accent).toMatch(/^#/)
      expect(brand.short.length).toBeGreaterThan(0)
    }
  })

  it('toolBrand resolves known ids and returns undefined otherwise', () => {
    expect(toolBrand('claude-code')?.name).toBe('Claude Code')
    expect(toolBrand('nope')).toBeUndefined()
  })

  it('only skill-capable tools are returned for the skills capability', () => {
    const ids = toolsWithCapability('skills').map((t) => t.id)
    expect(ids).toContain('claude-code')
    // Claude Desktop consumes MCP but not skills — it must be excluded.
    expect(ids).not.toContain('claude-desktop')
  })

  it('MCP hosts draw their brand identity from the shared registry', () => {
    for (const host of MCP_HOSTS) {
      expect(host.accent).toBe(TOOL_BRANDS[host.id].accent)
      expect(host.short).toBe(TOOL_BRANDS[host.id].short)
    }
  })
})
