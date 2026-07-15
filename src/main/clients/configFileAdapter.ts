import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ClientAdapter, McpServerConfigEntry } from './types'
import type { ClientId } from '../../shared/types'

export interface ConfigFileAdapterOptions {
  id: ClientId
  displayName: string
  serversKey: 'mcpServers' | 'servers'
  supportsHttpTransport: boolean
  resolveExePath: () => string
  resolveConfigPath: () => string
}

export function createConfigFileAdapter(options: ConfigFileAdapterOptions): ClientAdapter {
  const { id, displayName, serversKey, supportsHttpTransport, resolveExePath, resolveConfigPath } = options

  function readRawConfig(): Record<string, unknown> {
    const path = resolveConfigPath()
    if (!existsSync(path)) return { [serversKey]: {} }
    const raw = readFileSync(path, 'utf-8')
    if (raw.trim() === '') return { [serversKey]: {} }
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>
    } catch {
      throw new Error(`Config file at ${path} is not valid JSON. Back it up and fix it manually, or delete it to let Klik recreate it.`)
    }
    if (!parsed[serversKey]) parsed[serversKey] = {}
    return parsed
  }

  function writeRawConfig(config: Record<string, unknown>): void {
    const path = resolveConfigPath()
    mkdirSync(dirname(path), { recursive: true })
    if (existsSync(path)) {
      writeFileSync(`${path}.bak`, readFileSync(path))
    }
    const tmpPath = `${path}.tmp`
    writeFileSync(tmpPath, JSON.stringify(config, null, 2))
    renameSync(tmpPath, path)
  }

  return {
    id,
    displayName,
    supportsHttpTransport,
    isInstalled(): boolean {
      return existsSync(resolveExePath())
    },
    getConfigPath(): string {
      return resolveConfigPath()
    },
    readConfig(): Record<string, McpServerConfigEntry> {
      return (readRawConfig()[serversKey] as Record<string, McpServerConfigEntry>) ?? {}
    },
    writeServer(name: string, entry: McpServerConfigEntry): void {
      const config = readRawConfig()
      const servers = (config[serversKey] as Record<string, McpServerConfigEntry>) ?? {}
      config[serversKey] = { ...servers, [name]: entry }
      writeRawConfig(config)
    },
    removeServer(name: string): void {
      const config = readRawConfig()
      const servers = (config[serversKey] as Record<string, McpServerConfigEntry>) ?? {}
      delete servers[name]
      config[serversKey] = servers
      writeRawConfig(config)
    }
  }
}
