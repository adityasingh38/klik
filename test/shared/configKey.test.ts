import { describe, it, expect } from 'vitest'
import { configKeyFor } from '../../src/shared/configKey'

describe('configKeyFor', () => {
  it('reduces a registry id to the readable part', () => {
    expect(configKeyFor('io.modelcontextprotocol/server-sequential-thinking')).toBe(
      'sequential-thinking'
    )
  })

  it('strips the mcp-server prefix community packages use', () => {
    expect(configKeyFor('com.example/mcp-server-postgres')).toBe('postgres')
  })

  it('strips a trailing -mcp too', () => {
    expect(configKeyFor('io.firecrawl/firecrawl-mcp')).toBe('firecrawl')
  })

  it('leaves an id that is already a plain name alone', () => {
    expect(configKeyFor('filesystem')).toBe('filesystem')
  })

  it('replaces characters a client would rather not display', () => {
    expect(configKeyFor('com.acme/My Server_v2')).toBe('my-server-v2')
  })

  it('never strips a name down to nothing', () => {
    // Every layer here is "noise"; stripping them all would leave an empty key.
    expect(configKeyFor('com.example/mcp-server')).not.toBe('')
  })

  it('qualifies with the publisher when the short name is taken', () => {
    expect(configKeyFor('io.modelcontextprotocol/server-memory', ['memory'])).toBe(
      'modelcontextprotocol-memory'
    )
  })

  it('falls back to a counter when the publisher is taken as well', () => {
    expect(
      configKeyFor('io.modelcontextprotocol/server-memory', [
        'memory',
        'modelcontextprotocol-memory'
      ])
    ).toBe('memory-2')
  })

  it('is stable — the same id always yields the same key', () => {
    const id = 'io.modelcontextprotocol/server-sequential-thinking'
    expect(configKeyFor(id)).toBe(configKeyFor(id))
  })

  it('keeps two colliding servers apart rather than overwriting one', () => {
    const first = configKeyFor('com.alpha/github-mcp')
    const second = configKeyFor('com.beta/github-mcp', [first])
    expect(first).not.toBe(second)
  })
})
