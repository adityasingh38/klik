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
  /**
   * Directory name the skill is written as, e.g. `pdf` → ~/.claude/skills/pdf.
   * Explicit rather than derived from the id so the on-disk name is never a surprise.
   */
  installName: string
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

/** A tool detected on this machine, and what it can consume. */
export interface DetectedTool {
  id: string
  displayName: string
  installed: boolean
  capabilities: {
    mcp?: { configPath: string }
    skills?: { dir: string }
    plugins?: { settingsPath: string; pluginsDir: string }
  }
}

/** One file a skill install would write, resolved before anything is fetched. */
export interface SkillFilePreview {
  relativePath: string
  bytes: number
}

export interface SkillInstallTargetPreview {
  toolId: string
  displayName: string
  /** The exact directory that will be created/replaced. */
  skillDir: string
  supported: boolean
  reason?: string
  /** True when a skill of the same name is already installed there. */
  wouldOverwrite: boolean
}

/**
 * Everything a skill install is about to do, computed before a single byte is
 * written — same contract as the MCP install preview: approve a concrete action,
 * never a black box.
 */
export interface SkillInstallPreview {
  skillId: string
  title: string
  source: string
  files: SkillFilePreview[]
  totalBytes: number
  targets: SkillInstallTargetPreview[]
  warnings: string[]
  verified: boolean
}

export interface SkillPreflightRequest {
  skill: SkillEntry
  targetToolIds: string[]
}

export interface SkillInstallRequest {
  skill: SkillEntry
  targetToolIds: string[]
  /** Explicit consent to replace an existing skill directory of the same name. */
  allowOverwrite?: boolean
}

export interface SkillInstallStepResult {
  skillId: string
  toolId: string
  status: 'pending' | 'running' | 'done' | 'error'
  message?: string
}

export interface InstalledSkillRecord {
  skillId: string
  installName: string
  tools: string[]
  installedAt: string
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
