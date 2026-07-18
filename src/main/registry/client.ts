import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { RegistryEnvVar, RegistryServerEntry, RuntimeKind } from '../../shared/types'

const REGISTRY_BASE_URL = 'https://registry.modelcontextprotocol.io/v0/servers'
const PAGE_LIMIT = 100
const MAX_PAGES = 500
/**
 * A single page must not be able to stall the catalogue indefinitely. Without this a
 * hung request leaves a brand-new user looking at skeletons forever, because there's
 * no cache to fall back to on a first launch.
 */
const PAGE_TIMEOUT_MS = 8000

interface RawPackage {
  registryType: string
  identifier: string
  version?: string
  transport: { type: string }
  environmentVariables?: Array<{
    name: string
    description?: string
    isRequired?: boolean
    isSecret?: boolean
  }>
}

interface RawRemote {
  type: string
  url: string
}

interface RawIcon {
  src: string
  mimeType?: string
  sizes?: string[]
}

interface RawServer {
  name: string
  title?: string
  description: string
  version: string
  repository?: { url: string }
  packages?: RawPackage[]
  remotes?: RawRemote[]
  icons?: RawIcon[]
  websiteUrl?: string
}

interface RawEntry {
  server: RawServer
  _meta?: {
    'io.modelcontextprotocol.registry/official'?: { isLatest?: boolean }
  }
}

interface RawResponse {
  servers: RawEntry[]
  metadata: { nextCursor?: string; count: number }
}

function commandForPackage(pkg: RawPackage): { command: string; args: string[]; runtime: RuntimeKind } {
  const ref = pkg.version ? `${pkg.identifier}@${pkg.version}` : pkg.identifier
  switch (pkg.registryType) {
    case 'npm':
      return { command: 'npx', args: ['-y', ref], runtime: 'node' }
    case 'pypi':
      return { command: 'uvx', args: [ref], runtime: 'uv' }
    case 'oci':
      return { command: 'docker', args: ['run', '-i', '--rm', pkg.identifier], runtime: 'docker' }
    default:
      return { command: 'npx', args: ['-y', ref], runtime: 'node' }
  }
}

function normalizeEnvVars(pkg: RawPackage): RegistryEnvVar[] {
  return (pkg.environmentVariables ?? []).map((env) => ({
    name: env.name,
    description: env.description ?? '',
    isRequired: env.isRequired ?? false,
    isSecret: env.isSecret ?? false
  }))
}

/**
 * The registry allows several icons per server; take the first https one. Non-https
 * sources are dropped rather than rendered — a logo is never worth a mixed-content load.
 */
function pickIconUrl(raw: RawServer): string | undefined {
  return raw.icons?.find((icon) => icon.src.startsWith('https://'))?.src
}

export function normalizeRawServer(raw: RawServer): RegistryServerEntry | null {
  const pkg = raw.packages?.[0]
  const remote = raw.remotes?.[0]
  const iconUrl = pickIconUrl(raw)
  const websiteUrl = raw.websiteUrl

  if (pkg) {
    const { command, args, runtime } = commandForPackage(pkg)
    return {
      id: raw.name,
      title: raw.title ?? raw.name,
      description: raw.description,
      version: raw.version,
      transport: 'stdio',
      command,
      args,
      requiredRuntime: [runtime],
      requiredEnv: normalizeEnvVars(pkg),
      repositoryUrl: raw.repository?.url,
      iconUrl,
      websiteUrl
    }
  }

  if (remote) {
    return {
      id: raw.name,
      title: raw.title ?? raw.name,
      description: raw.description,
      version: raw.version,
      transport: 'http',
      url: remote.url,
      requiredRuntime: [],
      requiredEnv: [],
      repositoryUrl: raw.repository?.url,
      iconUrl,
      websiteUrl
    }
  }

  return null
}

async function fetchPage(cursor?: string): Promise<RawResponse> {
  const url = new URL(REGISTRY_BASE_URL)
  url.searchParams.set('limit', String(PAGE_LIMIT))
  if (cursor) url.searchParams.set('cursor', cursor)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS)
  try {
    const response = await fetch(url.toString(), { signal: controller.signal })
    if (!response.ok) throw new Error(`registry fetch failed: ${response.status}`)
    return (await response.json()) as RawResponse
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchAllPages(): Promise<RawEntry[]> {
  const all: RawEntry[] = []
  let cursor: string | undefined
  let pageCount = 0

  do {
    if (pageCount >= MAX_PAGES) {
      throw new Error(`registry pagination exceeded MAX_PAGES (${MAX_PAGES}) — possible non-terminating cursor`)
    }
    const data = await fetchPage(cursor)
    all.push(...data.servers)
    cursor = data.metadata.nextCursor
    pageCount++
  } while (cursor)

  return all
}

/** Latest-version entries only, normalized into what the UI consumes. */
function toEntries(rawEntries: RawEntry[]): RegistryServerEntry[] {
  return rawEntries
    .filter((e) => e._meta?.['io.modelcontextprotocol.registry/official']?.isLatest === true)
    .map((e) => normalizeRawServer(e.server))
    .filter((e): e is RegistryServerEntry => e !== null)
}

/**
 * Walks the remaining pages after the first has already been handed to the UI, then
 * rewrites the cache with the complete set for next launch.
 */
async function completeInBackground(
  userDataDir: string,
  firstPage: RawEntry[],
  cursor: string
): Promise<void> {
  const all = [...firstPage]
  let next: string | undefined = cursor
  let pageCount = 1

  while (next && pageCount < MAX_PAGES) {
    const data: RawResponse = await fetchPage(next)
    all.push(...data.servers)
    next = data.metadata.nextCursor
    pageCount += 1
  }

  const entries = toEntries(all)
  if (entries.length > 0) writeCache(userDataDir, entries)
}

export function cachePath(userDataDir: string): string {
  return join(userDataDir, 'registry-cache.json')
}

export function readCache(userDataDir: string): RegistryServerEntry[] | null {
  const path = cachePath(userDataDir)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as RegistryServerEntry[]
  } catch {
    return null
  }
}

function writeCache(userDataDir: string, entries: RegistryServerEntry[]): void {
  const path = cachePath(userDataDir)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(entries, null, 2))
}

export interface RegistryLoadResult {
  entries: RegistryServerEntry[]
  fromCache: boolean
}

/**
 * The first page is returned as soon as it lands and the rest is walked in the
 * background. A cold start previously awaited every page sequentially before a single
 * server could render, so the very first launch — the one with no cache to fall back
 * on — was the slowest the app ever gets.
 */
export async function loadRegistry(userDataDir: string): Promise<RegistryLoadResult> {
  try {
    const first = await fetchPage()
    const entries = toEntries(first.servers)
    if (entries.length > 0) writeCache(userDataDir, entries)

    if (first.metadata.nextCursor) {
      void completeInBackground(userDataDir, first.servers, first.metadata.nextCursor).catch(() => {})
    }

    return { entries, fromCache: false }
  } catch {
    const cached = readCache(userDataDir)
    if (cached) return { entries: cached, fromCache: true }
    return { entries: [], fromCache: false }
  }
}

/** Every page, awaited. Used where completeness matters more than time to first paint. */
export async function loadRegistryComplete(userDataDir: string): Promise<RegistryLoadResult> {
  try {
    const entries = toEntries(await fetchAllPages())
    if (entries.length > 0) writeCache(userDataDir, entries)
    return { entries, fromCache: false }
  } catch {
    const cached = readCache(userDataDir)
    if (cached) return { entries: cached, fromCache: true }
    return { entries: [], fromCache: false }
  }
}
