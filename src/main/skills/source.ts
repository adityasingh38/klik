const API_ROOT = 'https://api.github.com'
const USER_AGENT = 'Klik'
const FETCH_TIMEOUT_MS = 15000
/** A skill is a handful of small files; anything past this is not a skill. */
const MAX_FILES = 60
const MAX_TOTAL_BYTES = 5 * 1024 * 1024

export interface SkillSourceRef {
  owner: string
  repo: string
  /** Sub-path inside the repo, '' for the repo root. */
  path: string
}

export interface RemoteFile {
  /** Path relative to the skill root — never absolute, never escaping. */
  relativePath: string
  downloadUrl: string
  bytes: number
}

/**
 * Parses `github.com/<owner>/<repo>/<sub/path>` (with or without scheme) into its
 * parts. Only GitHub is accepted — an unrecognized host returns null rather than
 * being fetched, so a catalog entry can't point Klik at an arbitrary endpoint.
 */
export function parseSkillSource(source: string): SkillSourceRef | null {
  const cleaned = source.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const parts = cleaned.split('/').filter(Boolean)
  if (parts.length < 3) return null
  const [host, owner, repo, ...rest] = parts
  if (host !== 'github.com' && host !== 'www.github.com') return null
  return { owner, repo, path: rest.join('/') }
}

/** Rejects anything that would write outside the skill directory. */
function isSafeRelativePath(relativePath: string): boolean {
  if (relativePath.startsWith('/') || /^[a-z]:/i.test(relativePath)) return false
  return !relativePath.split('/').some((segment) => segment === '..')
}

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github+json' }
    })
    if (response.status === 403) {
      throw new Error('GitHub rate limit reached — try again in a few minutes.')
    }
    if (response.status === 404) {
      throw new Error('Skill source not found on GitHub.')
    }
    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`)
    }
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

interface ContentsEntry {
  name: string
  path: string
  type: string
  size?: number
  download_url?: string | null
}

/**
 * Walks the skill's directory on GitHub and returns every file it would install.
 * Resolved up front so the install preview can list exact paths and sizes before
 * anything is downloaded or written.
 */
export async function listSkillFiles(ref: SkillSourceRef): Promise<RemoteFile[]> {
  const files: RemoteFile[] = []
  const rootPath = ref.path

  async function walk(currentPath: string): Promise<void> {
    const url = `${API_ROOT}/repos/${ref.owner}/${ref.repo}/contents/${currentPath}`
    const payload = await getJson(url)
    const entries: ContentsEntry[] = Array.isArray(payload)
      ? (payload as ContentsEntry[])
      : [payload as ContentsEntry]

    for (const entry of entries) {
      if (files.length >= MAX_FILES) {
        throw new Error(`Skill has more than ${MAX_FILES} files — refusing to install.`)
      }
      if (entry.type === 'dir') {
        await walk(entry.path)
        continue
      }
      if (entry.type !== 'file' || !entry.download_url) continue

      const relativePath = rootPath && entry.path.startsWith(`${rootPath}/`)
        ? entry.path.slice(rootPath.length + 1)
        : entry.name
      if (!isSafeRelativePath(relativePath)) {
        throw new Error(`Unsafe path in skill source: ${relativePath}`)
      }
      files.push({ relativePath, downloadUrl: entry.download_url, bytes: entry.size ?? 0 })
    }
  }

  await walk(rootPath)

  const total = files.reduce((sum, f) => sum + f.bytes, 0)
  if (total > MAX_TOTAL_BYTES) {
    throw new Error('Skill exceeds the 5 MB size limit — refusing to install.')
  }
  if (files.length === 0) {
    throw new Error('No files found at that skill source.')
  }
  return files
}

/** Downloads one file's raw bytes. */
export async function downloadFile(downloadUrl: string): Promise<Buffer> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(downloadUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT }
    })
    if (!response.ok) throw new Error(`Download failed (${response.status})`)
    return Buffer.from(await response.arrayBuffer())
  } finally {
    clearTimeout(timeout)
  }
}
