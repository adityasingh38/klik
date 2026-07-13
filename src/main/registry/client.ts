import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { RegistryEnvVar, RegistryServerEntry, RuntimeKind } from '../../shared/types'

const REGISTRY_BASE_URL = 'https://registry.modelcontextprotocol.io/v0/servers'
const PAGE_LIMIT = 100

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

interface RawServer {
  name: string
  title?: string
  description: string
  version: string
  repository?: { url: string }
  packages?: RawPackage[]
  remotes?: RawRemote[]
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

export function normalizeRawServer(raw: RawServer): RegistryServerEntry | null {
  const pkg = raw.packages?.[0]
  const remote = raw.remotes?.[0]

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
      repositoryUrl: raw.repository?.url
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
      repositoryUrl: raw.repository?.url
    }
  }

  return null
}

async function fetchAllPages(): Promise<RawEntry[]> {
  const all: RawEntry[] = []
  let cursor: string | undefined

  do {
    const url = new URL(REGISTRY_BASE_URL)
    url.searchParams.set('limit', String(PAGE_LIMIT))
    if (cursor) url.searchParams.set('cursor', cursor)

    const response = await fetch(url.toString())
    if (!response.ok) throw new Error(`registry fetch failed: ${response.status}`)
    const data = (await response.json()) as RawResponse
    all.push(...data.servers)
    cursor = data.metadata.nextCursor
  } while (cursor)

  return all
}

export function cachePath(userDataDir: string): string {
  return join(userDataDir, 'registry-cache.json')
}

function readCache(userDataDir: string): RegistryServerEntry[] | null {
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

export async function loadRegistry(userDataDir: string): Promise<RegistryLoadResult> {
  try {
    const rawEntries = await fetchAllPages()
    const latestOnly = rawEntries.filter(
      (e) => e._meta?.['io.modelcontextprotocol.registry/official']?.isLatest === true
    )
    const entries = latestOnly
      .map((e) => normalizeRawServer(e.server))
      .filter((e): e is RegistryServerEntry => e !== null)
    writeCache(userDataDir, entries)
    return { entries, fromCache: false }
  } catch {
    const cached = readCache(userDataDir)
    if (cached) return { entries: cached, fromCache: true }
    return { entries: [], fromCache: false }
  }
}
