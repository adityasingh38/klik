/**
 * Klik installs three kinds of thing. MCP servers already have their own rich
 * types in ./types (registry + curation machinery); skills and plugins are added
 * here alongside them. All three render through one shared catalog UI, so they
 * share a common surface (title, description, category, compatible tools, verified/
 * warnings) even though their install mechanics differ.
 */
export type InstallableKind = 'mcp' | 'skill' | 'plugin'

/** A packaged instruction/capability file installed into a tool's skills directory. */
export interface SkillEntry {
  id: string
  title: string
  description: string
  /** Where the skill is fetched from (git repo, raw file, or marketplace). */
  source: string
  author?: string
  iconUrl?: string
  repositoryUrl?: string
  category: string
  /** Tool ids (see TOOL_BRANDS) this skill can be installed into. */
  compatibleTools: string[]
  verified: boolean
  warnings: string[]
}

/** A marketplace-sourced bundle (commands, agents, hooks, MCP servers, skills). */
export interface PluginEntry {
  id: string
  title: string
  description: string
  /** Marketplace the plugin is installed from (git repo id). */
  marketplace: string
  marketplaceUrl: string
  author?: string
  iconUrl?: string
  repositoryUrl?: string
  category: string
  /** Tool ids (see TOOL_BRANDS) this plugin can be installed into. */
  compatibleTools: string[]
  verified: boolean
  warnings: string[]
}

/**
 * Normalized shape the shared catalog list/card renders, regardless of kind. Views
 * map their own entries (MergedServerEntry / SkillEntry / PluginEntry) into this so
 * one CatalogRow can render all three without knowing their internals.
 */
export interface CatalogItemVM {
  kind: InstallableKind
  id: string
  title: string
  description: string
  category: string
  /** Small technical tags shown under the description (transport, runtime, source…). */
  metaTags: string[]
  /** Tool ids this item is compatible with, for the "works in" chip row. */
  compatibleTools: string[]
  verified: boolean
  warnings: string[]
}
