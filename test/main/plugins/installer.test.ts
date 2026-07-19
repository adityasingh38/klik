import { describe, it, expect, vi } from 'vitest'
import {
  buildPluginInstallPreview,
  installPluginEntry,
  marketplaceSourceOf,
  type PluginCli
} from '../../../src/main/plugins/installer'
import { isValidPluginId, isValidMarketplaceSource } from '../../../src/main/plugins/cli'
import type { PluginEntry } from '../../../src/shared/catalog'

const plugin: PluginEntry = {
  id: 'feature-dev@claude-plugins-official',
  title: 'Feature Dev',
  description: 'Guided feature development.',
  marketplace: 'claude-plugins-official',
  marketplaceUrl: 'https://github.com/anthropics/claude-code',
  category: 'Development',
  compatibleTools: ['claude-code'],
  verified: true,
  warnings: []
}

const ok = { success: true, stdout: '', message: '' }
const asyncOk = async () => ok

function fakeCli(overrides: Partial<PluginCli> = {}): PluginCli {
  return {
    isCliAvailable: async () => true,
    listInstalledPlugins: async () => [],
    listMarketplaceNames: async () => ['claude-plugins-official'],
    addMarketplace: vi.fn(asyncOk),
    installPlugin: vi.fn(asyncOk),
    uninstallPlugin: vi.fn(asyncOk),
    ...overrides
  }
}

describe('marketplaceSourceOf', () => {
  it('reduces a GitHub URL to owner/repo', () => {
    expect(marketplaceSourceOf(plugin)).toBe('anthropics/claude-code')
  })
})

describe('buildPluginInstallPreview', () => {
  it('plans only the install when the marketplace is already trusted', async () => {
    const preview = await buildPluginInstallPreview({ plugin }, fakeCli())
    expect(preview.marketplaceAlreadyKnown).toBe(true)
    expect(preview.commands).toEqual(['claude plugin install feature-dev@claude-plugins-official --scope user'])
  })

  it('plans a marketplace add first and warns about trusting it', async () => {
    const preview = await buildPluginInstallPreview({ plugin }, fakeCli({ listMarketplaceNames: async () => [] }))
    expect(preview.marketplaceAlreadyKnown).toBe(false)
    expect(preview.commands[0]).toBe('claude plugin marketplace add anthropics/claude-code')
    expect(preview.warnings.join(' ')).toMatch(/only add sources you trust/i)
  })

  it('reports an already-installed plugin', async () => {
    const preview = await buildPluginInstallPreview(
      { plugin },
      fakeCli({
        listInstalledPlugins: async () => [
          { id: plugin.id, version: '1.0.0', enabled: true, installPath: 'x' }
        ]
      })
    )
    expect(preview.alreadyInstalled).toBe(true)
  })

  it('reports a missing CLI instead of pretending it can install', async () => {
    const preview = await buildPluginInstallPreview({ plugin }, fakeCli({ isCliAvailable: async () => false }))
    expect(preview.cliAvailable).toBe(false)
    expect(preview.warnings.join(' ')).toMatch(/not found on PATH/)
  })
})

describe('installPluginEntry', () => {
  it('refuses to register an unknown marketplace without consent', async () => {
    const cli = fakeCli({ listMarketplaceNames: async () => [] })
    const results = await installPluginEntry({ plugin }, cli)

    expect(results[0].status).toBe('error')
    expect(results[0].message).toMatch(/not confirmed/)
    expect(cli.addMarketplace).not.toHaveBeenCalled()
    expect(cli.installPlugin).not.toHaveBeenCalled()
  })

  it('adds the marketplace then installs once consent is given', async () => {
    const cli = fakeCli({ listMarketplaceNames: async () => [] })
    const results = await installPluginEntry({ plugin, allowMarketplaceAdd: true }, cli)

    expect(cli.addMarketplace).toHaveBeenCalledWith('anthropics/claude-code')
    expect(cli.installPlugin).toHaveBeenCalledWith(plugin.id)
    expect(results.map((r) => r.status)).toEqual(['done', 'done'])
  })

  it('does not install when adding the marketplace fails', async () => {
    const cli = fakeCli({
      listMarketplaceNames: async () => [],
      addMarketplace: vi.fn(async () => ({ success: false, stdout: '', message: 'network down' }))
    })
    const results = await installPluginEntry({ plugin, allowMarketplaceAdd: true }, cli)

    expect(results).toHaveLength(1)
    expect(results[0].status).toBe('error')
    expect(cli.installPlugin).not.toHaveBeenCalled()
  })

  it('installs directly when the marketplace is already trusted', async () => {
    const cli = fakeCli()
    const results = await installPluginEntry({ plugin }, cli)
    expect(cli.addMarketplace).not.toHaveBeenCalled()
    expect(results[0].status).toBe('done')
  })

  it('errors when the CLI is unavailable', async () => {
    const results = await installPluginEntry({ plugin }, fakeCli({ isCliAvailable: async () => false }))
    expect(results[0].status).toBe('error')
  })
})

describe('argument validation', () => {
  it('accepts real plugin ids and rejects injection-shaped input', () => {
    expect(isValidPluginId('feature-dev@claude-plugins-official')).toBe(true)
    expect(isValidPluginId('gsap-skills')).toBe(true)
    expect(isValidPluginId('a; rm -rf /')).toBe(false)
    expect(isValidPluginId('--scope=global')).toBe(false)
    expect(isValidPluginId('')).toBe(false)
  })

  it('accepts owner/repo and https sources, rejects anything else', () => {
    expect(isValidMarketplaceSource('anthropics/claude-code')).toBe(true)
    expect(isValidMarketplaceSource('https://github.com/greensock/gsap-skills')).toBe(true)
    expect(isValidMarketplaceSource('file:///etc/passwd')).toBe(false)
    expect(isValidMarketplaceSource('a b; whoami')).toBe(false)
  })
})
