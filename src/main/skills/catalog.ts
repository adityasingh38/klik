import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { SkillEntry, SkillTier } from '../../shared/catalog'

const USER_AGENT = 'Klik'
const TIMEOUT_MS = 12000
/** A day is long enough that Klik isn't hammering GitHub, short enough to stay current. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
/**
 * Bumped whenever the parsing changes. Without it a fix to how titles or descriptions
 * are derived can't reach anyone for a day — the cache would keep serving entries
 * built by the old logic.
 */
const CATALOG_VERSION = 2

export interface SkillSource {
  id: string
  owner: string
  repo: string
  branch: string
  author: string
  tier: SkillTier
  repositoryUrl: string
}

/**
 * Where skills come from. Anthropic's own repository is the only source Klik ships
 * with — community sources are added through the curation feed rather than hard-coded,
 * so the list can grow without a release and every entry stays something a person
 * actually vetted.
 */
export const DEFAULT_SKILL_SOURCES: SkillSource[] = [
  {
    id: 'anthropics/skills',
    owner: 'anthropics',
    repo: 'skills',
    branch: 'main',
    author: 'Anthropic',
    tier: 'official',
    repositoryUrl: 'https://github.com/anthropics/skills'
  }
]

interface Marketplace {
  plugins?: Array<{ name?: string; skills?: string[] }>
}

/** Only genuine acronyms get shouted; everything else is title case. */
const ACRONYMS = new Set(['pdf', 'docx', 'xlsx', 'pptx', 'mcp', 'api', 'css', 'html', 'gif', 'ui', 'ux'])

/** The manifest groups skills; those groups are the closest thing to real categories. */
const GROUP_LABELS: Record<string, string> = {
  'document-skills': 'Documents',
  'example-skills': 'Creative & Dev'
}

async function getText(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': USER_AGENT } })
    if (!response.ok) throw new Error(`${url} returned ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

function rawUrl(source: SkillSource, path: string): string {
  return `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${source.branch}/${path}`
}

/** Pulls `name` and `description` out of a SKILL.md YAML front-matter block. */
export function parseFrontmatter(markdown: string): { name?: string; description?: string } {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const block = match[1]
  const read = (key: string): string | undefined => {
    const line = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
    if (!line) return undefined
    return line[1].trim().replace(/^["']|["']$/g, '')
  }
  return { name: read('name'), description: read('description') }
}

/**
 * A skill's own description is written to trigger the model, not to be read by a
 * person: "Use this skill whenever the user wants to do anything with PDF files."
 * Stripping that framing is what turns it into a catalogue line — otherwise the UI
 * ends up talking about "the user" in the third person to the user.
 */
export function summarise(description: string, fallback: string): string {
  if (!description) return fallback

  let cleaned = description.trim()
  // Peel the trigger framing off, outermost first.
  const prefixes = [
    /^use this skill\s+(whenever|when|any time|anytime|for)\s+/i,
    /^use\s+(this\s+skill|when|whenever)\s+/i,
    /^this skill (should be used|is for)\s+(when\s+)?/i,
    /^(the )?users?\s+(wants?|needs?|asks?)\s+(to\s+)?/i,
    /^you should use this skill\s+(when\s+)?/i
  ]
  let changed = true
  while (changed) {
    changed = false
    for (const prefix of prefixes) {
      const next = cleaned.replace(prefix, '')
      if (next !== cleaned) {
        cleaned = next.trim()
        changed = true
      }
    }
  }

  const sentence = cleaned.split(/(?<=[.!?])\s/)[0] ?? cleaned
  const trimmed = sentence.length > 155 ? `${sentence.slice(0, 152).trimEnd()}…` : sentence
  if (!trimmed) return fallback
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export function titleFrom(name: string): string {
  return name
    .split(/[-_]/)
    .map((part) =>
      ACRONYMS.has(part.toLowerCase())
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(' ')
}

/** Skill paths declared by a source's manifest, each tagged with its group. */
async function listSkillPaths(source: SkillSource): Promise<Array<{ path: string; category: string }>> {
  const raw = await getText(rawUrl(source, '.claude-plugin/marketplace.json'))
  const parsed = JSON.parse(raw) as Marketplace
  const seen = new Set<string>()
  const out: Array<{ path: string; category: string }> = []
  for (const plugin of parsed.plugins ?? []) {
    const group = plugin.name ?? ''
    const category = GROUP_LABELS[group] ?? (group ? titleFrom(group.replace(/-skills$/, '')) : 'Skills')
    for (const entry of plugin.skills ?? []) {
      const path = entry.replace(/^\.\//, '').replace(/\/$/, '')
      if (seen.has(path)) continue
      seen.add(path)
      out.push({ path, category })
    }
  }
  return out
}

async function toEntry(source: SkillSource, path: string, category: string): Promise<SkillEntry | null> {
  const installName = path.split('/').pop()
  if (!installName) return null
  try {
    const markdown = await getText(rawUrl(source, `${path}/SKILL.md`))
    const { name, description } = parseFrontmatter(markdown)
    const resolved = name ?? installName
    return {
      id: `${source.id}:${resolved}`,
      installName: resolved,
      title: titleFrom(resolved),
      description: summarise(description ?? '', 'A packaged capability for your AI tools.'),
      source: `github.com/${source.owner}/${source.repo}/${path}`,
      author: source.author,
      repositoryUrl: source.repositoryUrl,
      category,
      compatibleTools: ['claude-code'],
      tier: source.tier,
      verified: source.tier !== 'community',
      warnings:
        source.tier === 'community'
          ? ['Community source — review the skill before installing.']
          : []
    }
  } catch {
    return null
  }
}

export function skillCatalogCachePath(userDataDir: string): string {
  return join(userDataDir, 'skills-catalog.json')
}

interface CachedCatalog {
  version?: number
  fetchedAt: number
  skills: SkillEntry[]
}

export function readSkillCatalogCache(userDataDir: string): SkillEntry[] | null {
  const path = skillCatalogCachePath(userDataDir)
  if (!existsSync(path)) return null
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as CachedCatalog
    if (parsed.version !== CATALOG_VERSION) return null
    if (!Array.isArray(parsed.skills) || parsed.skills.length === 0) return null
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null
    return parsed.skills
  } catch {
    return null
  }
}

function writeCache(userDataDir: string, skills: SkillEntry[]): void {
  const path = skillCatalogCachePath(userDataDir)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(
    path,
    JSON.stringify({ version: CATALOG_VERSION, fetchedAt: Date.now(), skills } satisfies CachedCatalog, null, 2)
  )
}

/**
 * Every skill each source publishes, fetched live. Discovery is one request per source
 * (its manifest); the per-skill reads that follow are what give each entry a real title
 * and description rather than a directory name.
 *
 * Failure is never fatal — a source that won't resolve is skipped, and if nothing
 * resolves at all the caller keeps whatever it already had.
 */
export async function fetchSkillCatalog(
  sources: SkillSource[] = DEFAULT_SKILL_SOURCES
): Promise<SkillEntry[]> {
  const perSource = await Promise.all(
    sources.map(async (source) => {
      try {
        const paths = await listSkillPaths(source)
        const entries = await Promise.all(paths.map(({ path, category }) => toEntry(source, path, category)))
        return entries.filter((e): e is SkillEntry => e !== null)
      } catch {
        return []
      }
    })
  )

  const seen = new Set<string>()
  return perSource.flat().filter((entry) => {
    if (seen.has(entry.id)) return false
    seen.add(entry.id)
    return true
  })
}

/**
 * The catalogue the UI gets: cache first so the list is instant, refreshed in the
 * background for next launch. `bundled` is the copy shipped in the app, used until a
 * fetch has ever succeeded.
 */
export async function loadSkillCatalog(
  userDataDir: string,
  bundled: SkillEntry[]
): Promise<SkillEntry[]> {
  const cached = readSkillCatalogCache(userDataDir)
  if (cached) {
    void fetchSkillCatalog()
      .then((fresh) => {
        if (fresh.length > 0) writeCache(userDataDir, fresh)
      })
      .catch(() => {})
    return cached
  }

  const fetched = await fetchSkillCatalog().catch(() => [])
  if (fetched.length > 0) {
    writeCache(userDataDir, fetched)
    return fetched
  }
  return bundled
}
