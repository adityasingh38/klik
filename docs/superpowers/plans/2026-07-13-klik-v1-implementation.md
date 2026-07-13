# Klik v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Windows Electron app that lets a user check boxes next to MCP servers, click install, and have Klik install missing runtime dependencies and write the servers into Claude Desktop, Cursor, and VS Code's config files.

**Architecture:** Electron main/renderer split. The main process owns registry fetching, curation-overlay merging, client detection, dependency installation via winget, and per-client config-file writing. The renderer (React + the Astryx design system) is a single-page checkbox-list UI — search/filter toolbar, client-target checklist, secret-prompt dialog, install-progress screen — talking to the main process only through a narrow `window.klik` IPC bridge.

**Tech Stack:** TypeScript, Electron 31 + electron-vite, React 18, `@astryxdesign/core` (Astryx design system), Vitest, electron-builder (NSIS).

## Global Constraints

- Windows only for v1.
- Exactly 3 target clients: Claude Desktop, Cursor, VS Code — no others in v1.
- Registry source is the official MCP registry API (`https://registry.modelcontextprotocol.io/v0/servers`) — never a Klik-original database.
- Curation overlay lives at `https://raw.githubusercontent.com/adityasuper38/klikmcp/main/curation/overlay.json`, with a bundled local fallback — no Klik-hosted backend.
- Dependency auto-install covers Node.js and Python/uv only (via winget); Docker is detected but never auto-installed in v1.
- Secrets are written only into the target client's own config file. Klik never persists secret values itself.
- Electron security: `contextIsolation: true`, `nodeIntegration: false`, always.
- Renderer UI uses `@astryxdesign/core` components exclusively for layout/controls — no raw `<div>`, no inline `style={{}}`. Import each component from its own subpath (e.g. `@astryxdesign/core/VStack`), matching the library's documented convention.
- v1 ships unsigned (`.exe`) — a known, documented limitation, not a bug.
- Real, verified facts baked into this plan (do not second-guess without re-checking): Claude Desktop config is `%APPDATA%\Claude\claude_desktop_config.json` under key `mcpServers`; Cursor global config is `%USERPROFILE%\.cursor\mcp.json` under key `mcpServers`; VS Code user config is `%APPDATA%\Code\User\mcp.json` under key `servers`; the official registry list endpoint returns `{servers: [{server: {...}, _meta: {...}}], metadata: {nextCursor, count}}` with a 100-item page limit.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `vitest.config.ts`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/App.tsx`
- Create: `.gitignore`

**Interfaces:**
- Produces: a running `npm run dev` Electron window, and `npm test` wired to Vitest (`passWithNoTests: true` so later tasks' first test run isn't blocked by an empty suite before it exists).

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "klikmcp",
  "version": "0.1.0",
  "description": "Klik — one-click MCP server installer for Windows",
  "private": true,
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "build:win": "electron-vite build && electron-builder --win",
    "test": "vitest run",
    "typecheck": "tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json"
  },
  "dependencies": {
    "@astryxdesign/core": "^0.1.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "electron": "^31.0.0",
    "electron-builder": "^24.13.3",
    "electron-vite": "^2.3.0",
    "typescript": "^5.5.3",
    "vite": "^5.3.1",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Write `electron.vite.config.ts`**

```ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()]
  }
})
```

- [ ] **Step 3: Write `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`**

`tsconfig.json`:

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.node.json" }, { "path": "./tsconfig.web.json" }]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*", "test/**/*"]
}
```

`tsconfig.web.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src/renderer/src/**/*", "src/shared/**/*"]
}
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    passWithNoTests: true
  }
})
```

- [ ] **Step 5: Write `src/main/index.ts`**

```ts
import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 6: Write `src/preload/index.ts` (placeholder, filled in Task 10)**

```ts
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('klik', {})
```

- [ ] **Step 7: Write `src/renderer/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Klik</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Write `src/renderer/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 9: Write `src/renderer/src/App.tsx` (placeholder, replaced in Task 12)**

```tsx
import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'

export default function App(): JSX.Element {
  return (
    <VStack gap={2} width="100%">
      <Heading level={1}>Klik</Heading>
      <Text>One-click MCP server installer.</Text>
    </VStack>
  )
}
```

- [ ] **Step 10: Write `.gitignore`**

```
node_modules/
out/
release/
*.log
```

- [ ] **Step 11: Install dependencies**

Run: `npm install`
Expected: installs without error; `node_modules/` created.

- [ ] **Step 12: Verify the dev window boots**

Run: `npm run dev`
Expected: an Electron window opens showing "Klik" and "One-click MCP server installer." Close the window, then stop the process (Ctrl+C).

- [ ] **Step 13: Verify the empty test suite passes**

Run: `npm test`
Expected: Vitest reports success with 0 tests (via `passWithNoTests`).

- [ ] **Step 14: Commit**

```bash
git add package.json electron.vite.config.ts tsconfig.json tsconfig.node.json tsconfig.web.json vitest.config.ts src .gitignore
git commit -m "chore: scaffold Klik Electron app"
```

---

### Task 2: Shared types

**Files:**
- Create: `src/shared/types.ts`

**Interfaces:**
- Produces: every type consumed by main-process modules (Tasks 3–10) and the renderer (Tasks 11–12): `ClientId`, `ClientInfo`, `RuntimeKind`, `TransportKind`, `RegistryEnvVar`, `RegistryServerEntry`, `CurationEntry`, `MergedServerEntry`, `InstallRequest`, `InstallStepStatus`, `InstallStepResult`, `InstalledServerRecord`.

- [ ] **Step 1: Write `src/shared/types.ts`**

```ts
export type ClientId = 'claude-desktop' | 'cursor' | 'vscode'

export interface ClientInfo {
  id: ClientId
  displayName: string
  installed: boolean
  configPath: string
}

export type RuntimeKind = 'node' | 'python' | 'uv' | 'docker'

export type TransportKind = 'stdio' | 'http'

export interface RegistryEnvVar {
  name: string
  description: string
  isRequired: boolean
  isSecret: boolean
}

export interface RegistryServerEntry {
  /** The registry's stable `name` field, e.g. "ai.agenttrust/mcp-server". */
  id: string
  title: string
  description: string
  version: string
  transport: TransportKind
  command?: string
  args?: string[]
  url?: string
  requiredRuntime: RuntimeKind[]
  requiredEnv: RegistryEnvVar[]
  repositoryUrl?: string
}

export interface CurationEntry {
  registryId: string
  verified: boolean
  tested: boolean
  category: string
  warnings: string[]
}

export interface MergedServerEntry extends RegistryServerEntry {
  curation?: CurationEntry
}

export interface InstallRequest {
  server: MergedServerEntry
  targetClients: ClientId[]
  secrets: Record<string, string>
}

export type InstallStepStatus = 'pending' | 'running' | 'done' | 'error'

export interface InstallStepResult {
  serverId: string
  clientId: ClientId
  status: InstallStepStatus
  message?: string
}

export interface InstalledServerRecord {
  serverId: string
  clients: ClientId[]
  installedAt: string
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes (nothing references these types yet, so there's nothing to break).

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add shared types for registry, clients, and install flow"
```

---

### Task 3: ClientAdapter interface + generic config-file adapter factory

**Files:**
- Create: `src/main/clients/types.ts`
- Create: `src/main/clients/configFileAdapter.ts`
- Test: `test/main/clients/configFileAdapter.test.ts`

**Interfaces:**
- Consumes: nothing new (uses Node's `node:fs`/`node:path` only).
- Produces: `ClientAdapter` interface (`id`, `displayName`, `isInstalled()`, `getConfigPath()`, `readConfig()`, `writeServer(name, entry)`, `removeServer(name)`) and `McpServerConfigEntry` (`{command?, args?, env?, url?}`), plus `createConfigFileAdapter(options)` — the factory Task 4's three real adapters are built from.

- [ ] **Step 1: Write `src/main/clients/types.ts`**

```ts
import type { ClientId } from '../../shared/types'

export interface McpServerConfigEntry {
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
}

export interface ClientAdapter {
  id: ClientId
  displayName: string
  isInstalled(): boolean
  getConfigPath(): string
  readConfig(): Record<string, McpServerConfigEntry>
  writeServer(name: string, entry: McpServerConfigEntry): void
  removeServer(name: string): void
}
```

- [ ] **Step 2: Write the failing test `test/main/clients/configFileAdapter.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createConfigFileAdapter } from '../../../src/main/clients/configFileAdapter'

describe('createConfigFileAdapter', () => {
  let tmpDir: string
  let exePath: string
  let configPath: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-configfile-'))
    exePath = join(tmpDir, 'fake-app', 'app.exe')
    configPath = join(tmpDir, 'fake-app-config', 'config.json')
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  function makeAdapter() {
    return createConfigFileAdapter({
      id: 'claude-desktop',
      displayName: 'Fake App',
      serversKey: 'mcpServers',
      resolveExePath: () => exePath,
      resolveConfigPath: () => configPath
    })
  }

  it('reports not installed when the exe is absent, installed once present', () => {
    const adapter = makeAdapter()
    expect(adapter.isInstalled()).toBe(false)
    mkdirSync(dirname(exePath), { recursive: true })
    writeFileSync(exePath, '')
    expect(adapter.isInstalled()).toBe(true)
  })

  it('returns an empty server map when no config file exists', () => {
    expect(makeAdapter().readConfig()).toEqual({})
  })

  it('writes a new server without touching existing unrelated keys', () => {
    const adapter = makeAdapter()
    mkdirSync(dirname(configPath), { recursive: true })
    const existing = {
      mcpServers: { existing: { command: 'npx', args: ['existing'] } },
      unrelatedKey: 'preserve-me'
    }
    writeFileSync(configPath, JSON.stringify(existing, null, 2))

    adapter.writeServer('new-server', { command: 'npx', args: ['new-server'] })

    const written = JSON.parse(readFileSync(configPath, 'utf-8'))
    expect(written.mcpServers.existing).toEqual(existing.mcpServers.existing)
    expect(written.mcpServers['new-server']).toEqual({ command: 'npx', args: ['new-server'] })
    expect(written.unrelatedKey).toBe('preserve-me')
  })

  it('backs up the original config before writing', () => {
    const adapter = makeAdapter()
    mkdirSync(dirname(configPath), { recursive: true })
    writeFileSync(configPath, JSON.stringify({ mcpServers: {} }))

    adapter.writeServer('new-server', { command: 'npx', args: [] })

    expect(existsSync(`${configPath}.bak`)).toBe(true)
  })

  it('removes a server by name', () => {
    const adapter = makeAdapter()
    mkdirSync(dirname(configPath), { recursive: true })
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: { toRemove: { command: 'npx', args: [] }, keep: { command: 'npx', args: [] } }
      })
    )

    adapter.removeServer('toRemove')

    const written = JSON.parse(readFileSync(configPath, 'utf-8'))
    expect(written.mcpServers.toRemove).toBeUndefined()
    expect(written.mcpServers.keep).toBeDefined()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run test/main/clients/configFileAdapter.test.ts`
Expected: FAIL — `Cannot find module '../../../src/main/clients/configFileAdapter'`.

- [ ] **Step 4: Write `src/main/clients/configFileAdapter.ts`**

```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ClientAdapter, McpServerConfigEntry } from './types'
import type { ClientId } from '../../shared/types'

export interface ConfigFileAdapterOptions {
  id: ClientId
  displayName: string
  serversKey: 'mcpServers' | 'servers'
  resolveExePath: () => string
  resolveConfigPath: () => string
}

export function createConfigFileAdapter(options: ConfigFileAdapterOptions): ClientAdapter {
  const { id, displayName, serversKey, resolveExePath, resolveConfigPath } = options

  function readRawConfig(): Record<string, unknown> {
    const path = resolveConfigPath()
    if (!existsSync(path)) return { [serversKey]: {} }
    const raw = readFileSync(path, 'utf-8')
    if (raw.trim() === '') return { [serversKey]: {} }
    const parsed = JSON.parse(raw) as Record<string, unknown>
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run test/main/clients/configFileAdapter.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/main/clients/types.ts src/main/clients/configFileAdapter.ts test/main/clients/configFileAdapter.test.ts
git commit -m "feat: add ClientAdapter interface and generic config-file adapter factory"
```

---

### Task 4: Claude Desktop / Cursor / VS Code adapters + client detector

**Files:**
- Create: `src/main/clients/claudeDesktop.ts`
- Create: `src/main/clients/cursor.ts`
- Create: `src/main/clients/vscode.ts`
- Create: `src/main/clients/detect.ts`
- Test: `test/main/clients/adapters.test.ts`
- Test: `test/main/clients/detect.test.ts`

**Interfaces:**
- Consumes: `createConfigFileAdapter` and `ClientAdapter` from Task 3.
- Produces: `claudeDesktopAdapter`, `cursorAdapter`, `vscodeAdapter` (each a `ClientAdapter`), and `detectInstalledClients(): ClientInfo[]` for the IPC layer (Task 10).

- [ ] **Step 1: Write `src/main/clients/claudeDesktop.ts`**

```ts
import { join } from 'node:path'
import { createConfigFileAdapter } from './configFileAdapter'

function appDataDir(): string {
  return process.env.APPDATA ?? join(process.env.USERPROFILE ?? '', 'AppData', 'Roaming')
}

function localAppDataDir(): string {
  return process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? '', 'AppData', 'Local')
}

export const claudeDesktopAdapter = createConfigFileAdapter({
  id: 'claude-desktop',
  displayName: 'Claude Desktop',
  serversKey: 'mcpServers',
  resolveExePath: () => join(localAppDataDir(), 'AnthropicClaude', 'claude.exe'),
  resolveConfigPath: () => join(appDataDir(), 'Claude', 'claude_desktop_config.json')
})
```

- [ ] **Step 2: Write `src/main/clients/cursor.ts`**

```ts
import { join } from 'node:path'
import { createConfigFileAdapter } from './configFileAdapter'

function userProfileDir(): string {
  return process.env.USERPROFILE ?? ''
}

function localAppDataDir(): string {
  return process.env.LOCALAPPDATA ?? join(userProfileDir(), 'AppData', 'Local')
}

export const cursorAdapter = createConfigFileAdapter({
  id: 'cursor',
  displayName: 'Cursor',
  serversKey: 'mcpServers',
  resolveExePath: () => join(localAppDataDir(), 'Programs', 'cursor', 'Cursor.exe'),
  resolveConfigPath: () => join(userProfileDir(), '.cursor', 'mcp.json')
})
```

- [ ] **Step 3: Write `src/main/clients/vscode.ts`**

```ts
import { join } from 'node:path'
import { createConfigFileAdapter } from './configFileAdapter'

function appDataDir(): string {
  return process.env.APPDATA ?? join(process.env.USERPROFILE ?? '', 'AppData', 'Roaming')
}

function localAppDataDir(): string {
  return process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? '', 'AppData', 'Local')
}

export const vscodeAdapter = createConfigFileAdapter({
  id: 'vscode',
  displayName: 'VS Code',
  serversKey: 'servers',
  resolveExePath: () => join(localAppDataDir(), 'Programs', 'Microsoft VS Code', 'Code.exe'),
  resolveConfigPath: () => join(appDataDir(), 'Code', 'User', 'mcp.json')
})
```

- [ ] **Step 4: Write the failing test `test/main/clients/adapters.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { claudeDesktopAdapter } from '../../../src/main/clients/claudeDesktop'
import { cursorAdapter } from '../../../src/main/clients/cursor'
import { vscodeAdapter } from '../../../src/main/clients/vscode'

describe('client adapter path + key configuration', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-adapters-'))
    process.env.APPDATA = tmpDir
    process.env.LOCALAPPDATA = tmpDir
    process.env.USERPROFILE = tmpDir
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    delete process.env.APPDATA
    delete process.env.LOCALAPPDATA
    delete process.env.USERPROFILE
  })

  it('Claude Desktop reads/writes claude_desktop_config.json under mcpServers', () => {
    expect(claudeDesktopAdapter.getConfigPath()).toBe(join(tmpDir, 'Claude', 'claude_desktop_config.json'))
    claudeDesktopAdapter.writeServer('demo', { command: 'npx', args: ['-y', 'demo'] })
    const written = JSON.parse(readFileSync(claudeDesktopAdapter.getConfigPath(), 'utf-8'))
    expect(written.mcpServers.demo).toEqual({ command: 'npx', args: ['-y', 'demo'] })
  })

  it('Cursor reads/writes .cursor/mcp.json under mcpServers', () => {
    expect(cursorAdapter.getConfigPath()).toBe(join(tmpDir, '.cursor', 'mcp.json'))
    cursorAdapter.writeServer('demo', { command: 'npx', args: ['-y', 'demo'] })
    const written = JSON.parse(readFileSync(cursorAdapter.getConfigPath(), 'utf-8'))
    expect(written.mcpServers.demo).toEqual({ command: 'npx', args: ['-y', 'demo'] })
  })

  it('VS Code reads/writes Code/User/mcp.json under servers, not mcpServers', () => {
    expect(vscodeAdapter.getConfigPath()).toBe(join(tmpDir, 'Code', 'User', 'mcp.json'))
    vscodeAdapter.writeServer('demo', { command: 'npx', args: ['-y', 'demo'] })
    const written = JSON.parse(readFileSync(vscodeAdapter.getConfigPath(), 'utf-8'))
    expect(written.servers.demo).toEqual({ command: 'npx', args: ['-y', 'demo'] })
  })
})
```

- [ ] **Step 5: Run to verify it fails, then confirm it passes**

Run: `npx vitest run test/main/clients/adapters.test.ts`
Expected: passes immediately once Steps 1–3's files exist (this test only exercises the factory already proven in Task 3) — if it fails, the failure means a path/key typo in one of the three adapter files above; fix and rerun.

- [ ] **Step 6: Write `src/main/clients/detect.ts`**

```ts
import { claudeDesktopAdapter } from './claudeDesktop'
import { cursorAdapter } from './cursor'
import { vscodeAdapter } from './vscode'
import type { ClientInfo } from '../../shared/types'
import type { ClientAdapter } from './types'

const ALL_ADAPTERS: ClientAdapter[] = [claudeDesktopAdapter, cursorAdapter, vscodeAdapter]

export function detectInstalledClients(): ClientInfo[] {
  return ALL_ADAPTERS.map((adapter) => ({
    id: adapter.id,
    displayName: adapter.displayName,
    installed: adapter.isInstalled(),
    configPath: adapter.getConfigPath()
  }))
}
```

- [ ] **Step 7: Write the failing test `test/main/clients/detect.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectInstalledClients } from '../../../src/main/clients/detect'

describe('detectInstalledClients', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-detect-'))
    process.env.APPDATA = tmpDir
    process.env.LOCALAPPDATA = tmpDir
    process.env.USERPROFILE = tmpDir
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    delete process.env.APPDATA
    delete process.env.LOCALAPPDATA
    delete process.env.USERPROFILE
  })

  it('reports all three clients as not installed when none are present', () => {
    const clients = detectInstalledClients()
    expect(clients.map((c) => c.installed)).toEqual([false, false, false])
    expect(clients.map((c) => c.id)).toEqual(['claude-desktop', 'cursor', 'vscode'])
  })

  it('reports a client as installed once its exe is present', () => {
    mkdirSync(join(tmpDir, 'AnthropicClaude'), { recursive: true })
    writeFileSync(join(tmpDir, 'AnthropicClaude', 'claude.exe'), '')

    const clients = detectInstalledClients()

    expect(clients.find((c) => c.id === 'claude-desktop')?.installed).toBe(true)
    expect(clients.find((c) => c.id === 'cursor')?.installed).toBe(false)
  })
})
```

- [ ] **Step 8: Run all client tests to verify they pass**

Run: `npx vitest run test/main/clients`
Expected: PASS (8 tests across both files).

- [ ] **Step 9: Commit**

```bash
git add src/main/clients/claudeDesktop.ts src/main/clients/cursor.ts src/main/clients/vscode.ts src/main/clients/detect.ts test/main/clients/adapters.test.ts test/main/clients/detect.test.ts
git commit -m "feat: add Claude Desktop, Cursor, and VS Code adapters plus client detector"
```

---

### Task 5: MCP registry client

**Files:**
- Create: `src/main/registry/client.ts`
- Test: `test/main/registry/client.test.ts`

**Interfaces:**
- Consumes: `RegistryServerEntry`, `RuntimeKind`, `TransportKind`, `RegistryEnvVar` from Task 2.
- Produces: `normalizeRawServer(raw): RegistryServerEntry | null`, `cachePath(userDataDir): string`, `loadRegistry(userDataDir): Promise<{entries, fromCache}>` — consumed by the IPC layer (Task 10).

Scoping decision (YAGNI): a registry server can list multiple `packages` and/or `remotes`. v1 picks exactly one transport per server — the first `packages` entry if present (local install, works offline), else the first `remotes` entry (HTTP/SSE) — rather than exposing every package variant in the UI.

- [ ] **Step 1: Write the failing test `test/main/registry/client.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadRegistry, normalizeRawServer, cachePath } from '../../../src/main/registry/client'

function page(servers: unknown[], nextCursor?: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ servers, metadata: { nextCursor, count: servers.length } })
  }
}

describe('normalizeRawServer', () => {
  it('derives an npx command for an npm package', () => {
    const result = normalizeRawServer({
      name: 'ai.example/foo',
      description: 'Example server',
      version: '1.0.0',
      packages: [{ registryType: 'npm', identifier: '@example/foo', version: '1.0.0', transport: { type: 'stdio' } }]
    } as any)
    expect(result).toMatchObject({
      id: 'ai.example/foo',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@example/foo@1.0.0'],
      requiredRuntime: ['node']
    })
  })

  it('derives a uvx command for a pypi package', () => {
    const result = normalizeRawServer({
      name: 'ai.example/bar',
      description: 'Example server',
      version: '2.0.0',
      packages: [{ registryType: 'pypi', identifier: 'example-bar', version: '2.0.0', transport: { type: 'stdio' } }]
    } as any)
    expect(result).toMatchObject({ command: 'uvx', args: ['example-bar@2.0.0'], requiredRuntime: ['uv'] })
  })

  it('normalizes required environment variables from the package', () => {
    const result = normalizeRawServer({
      name: 'ai.example/secret',
      description: 'Example server',
      version: '1.0.0',
      packages: [
        {
          registryType: 'npm',
          identifier: 'secret-server',
          version: '1.0.0',
          transport: { type: 'stdio' },
          environmentVariables: [
            { name: 'API_KEY', description: 'Your API key', isRequired: true, isSecret: true }
          ]
        }
      ]
    } as any)
    expect(result?.requiredEnv).toEqual([
      { name: 'API_KEY', description: 'Your API key', isRequired: true, isSecret: true }
    ])
  })

  it('falls back to a remote http entry when no packages are present', () => {
    const result = normalizeRawServer({
      name: 'ai.example/remote',
      description: 'Remote server',
      version: '1.0.0',
      remotes: [{ type: 'streamable-http', url: 'https://example.com/mcp' }]
    } as any)
    expect(result).toMatchObject({ transport: 'http', url: 'https://example.com/mcp' })
  })

  it('returns null when a server has neither packages nor remotes', () => {
    const result = normalizeRawServer({ name: 'ai.example/empty', description: '', version: '1.0.0' } as any)
    expect(result).toBeNull()
  })
})

describe('loadRegistry', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-registry-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    vi.unstubAllGlobals()
  })

  it('fetches, paginates, filters to latest versions, and caches the result', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        page(
          [
            {
              server: {
                name: 'ai.example/foo',
                description: 'd',
                version: '1.0.0',
                packages: [{ registryType: 'npm', identifier: 'foo', version: '1.0.0', transport: { type: 'stdio' } }]
              },
              _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: false } }
            }
          ],
          'cursor-1'
        )
      )
      .mockResolvedValueOnce(
        page([
          {
            server: {
              name: 'ai.example/foo',
              description: 'd',
              version: '1.1.0',
              packages: [{ registryType: 'npm', identifier: 'foo', version: '1.1.0', transport: { type: 'stdio' } }]
            },
            _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: true } }
          }
        ])
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadRegistry(tmpDir)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.fromCache).toBe(false)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].version).toBe('1.1.0')
    expect(existsSync(cachePath(tmpDir))).toBe(true)
  })

  it('falls back to the cache when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) }))
    const cached = [
      {
        id: 'cached-entry',
        title: 'x',
        description: 'x',
        version: '1.0.0',
        transport: 'stdio',
        requiredRuntime: [],
        requiredEnv: []
      }
    ]
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(cachePath(tmpDir), JSON.stringify(cached))

    const result = await loadRegistry(tmpDir)

    expect(result.fromCache).toBe(true)
    expect(result.entries).toEqual(cached)
  })

  it('returns an empty result when both the fetch and the cache are unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await loadRegistry(tmpDir)

    expect(result.entries).toEqual([])
    expect(result.fromCache).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/main/registry/client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/main/registry/client.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/main/registry/client.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/registry/client.ts test/main/registry/client.test.ts
git commit -m "feat: add official MCP registry client with pagination, normalization, and cache fallback"
```

---

### Task 6: Curation overlay

**Files:**
- Create: `curation/overlay.json`
- Create: `src/main/curation/overlay.ts`
- Test: `test/main/curation/overlay.test.ts`

**Interfaces:**
- Consumes: `CurationEntry`, `MergedServerEntry`, `RegistryServerEntry` from Task 2.
- Produces: `loadCuration(resourcesDir): Promise<CurationEntry[]>`, `mergeCuration(entries, curation): MergedServerEntry[]`, `bundledOverlayPath(resourcesDir): string` — consumed by the IPC layer (Task 10).

- [ ] **Step 1: Write `curation/overlay.json`** (the real starting state — empty; grows via community PRs per the spec)

```json
[]
```

- [ ] **Step 2: Write the failing test `test/main/curation/overlay.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadCuration, mergeCuration, bundledOverlayPath } from '../../../src/main/curation/overlay'

describe('loadCuration', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-curation-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    vi.unstubAllGlobals()
  })

  it('returns the fetched overlay when the network call succeeds', async () => {
    const remoteOverlay = [{ registryId: 'ai.example/foo', verified: true, tested: true, category: 'dev-tools', warnings: [] }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => remoteOverlay }))

    const result = await loadCuration(tmpDir)

    expect(result).toEqual(remoteOverlay)
  })

  it('falls back to the bundled overlay file when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const bundled = [{ registryId: 'ai.example/bar', verified: false, tested: false, category: 'misc', warnings: [] }]
    mkdirSync(join(tmpDir, 'curation'), { recursive: true })
    writeFileSync(bundledOverlayPath(tmpDir), JSON.stringify(bundled))

    const result = await loadCuration(tmpDir)

    expect(result).toEqual(bundled)
  })

  it('returns an empty array when both the fetch and the bundled file are unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await loadCuration(tmpDir)

    expect(result).toEqual([])
  })
})

describe('mergeCuration', () => {
  it('attaches curation data to matching registry entries by id', () => {
    const entries = [
      { id: 'ai.example/foo', title: 'Foo', description: '', version: '1.0.0', transport: 'stdio' as const, requiredRuntime: [], requiredEnv: [] },
      { id: 'ai.example/bar', title: 'Bar', description: '', version: '1.0.0', transport: 'stdio' as const, requiredRuntime: [], requiredEnv: [] }
    ]
    const curation = [{ registryId: 'ai.example/foo', verified: true, tested: true, category: 'dev-tools', warnings: [] }]

    const merged = mergeCuration(entries, curation)

    expect(merged[0].curation).toEqual(curation[0])
    expect(merged[1].curation).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run test/main/curation/overlay.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `src/main/curation/overlay.ts`**

```ts
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CurationEntry, MergedServerEntry, RegistryServerEntry } from '../../shared/types'

const OVERLAY_URL = 'https://raw.githubusercontent.com/adityasuper38/klikmcp/main/curation/overlay.json'
const FETCH_TIMEOUT_MS = 5000

export function bundledOverlayPath(resourcesDir: string): string {
  return join(resourcesDir, 'curation', 'overlay.json')
}

function readBundledOverlay(resourcesDir: string): CurationEntry[] {
  const path = bundledOverlayPath(resourcesDir)
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as CurationEntry[]
  } catch {
    return []
  }
}

export async function loadCuration(resourcesDir: string): Promise<CurationEntry[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const response = await fetch(OVERLAY_URL, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) throw new Error(`overlay fetch failed: ${response.status}`)
    return (await response.json()) as CurationEntry[]
  } catch {
    return readBundledOverlay(resourcesDir)
  }
}

export function mergeCuration(entries: RegistryServerEntry[], curation: CurationEntry[]): MergedServerEntry[] {
  const byId = new Map(curation.map((c) => [c.registryId, c]))
  return entries.map((entry) => ({ ...entry, curation: byId.get(entry.id) }))
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run test/main/curation/overlay.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add curation/overlay.json src/main/curation/overlay.ts test/main/curation/overlay.test.ts
git commit -m "feat: add curation overlay loader with GitHub raw fetch and bundled fallback"
```

---

### Task 7: Dependency checker + winget installer

**Files:**
- Create: `src/main/deps/depCheck.ts`
- Create: `src/main/deps/winget.ts`
- Test: `test/main/deps/depCheck.test.ts`
- Test: `test/main/deps/winget.test.ts`

**Interfaces:**
- Consumes: `RuntimeKind` from Task 2.
- Produces: `isRuntimeAvailable(runtime): boolean`, `wingetPackageId(runtime): string | null`, `wingetInstall(packageId): {success, message}` — consumed by the install orchestrator (Task 9).

- [ ] **Step 1: Write the failing test `test/main/deps/depCheck.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { isRuntimeAvailable, wingetPackageId } from '../../../src/main/deps/depCheck'

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }))

describe('depCheck', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockReset()
  })

  it('reports a runtime available when `where` exits 0', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as any)
    expect(isRuntimeAvailable('node')).toBe(true)
    expect(spawnSync).toHaveBeenCalledWith('where', ['node'], { encoding: 'utf-8' })
  })

  it('reports a runtime unavailable when `where` exits non-zero', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1 } as any)
    expect(isRuntimeAvailable('python')).toBe(false)
  })

  it('returns the correct winget package id for node, python, and uv', () => {
    expect(wingetPackageId('node')).toBe('OpenJS.NodeJS.LTS')
    expect(wingetPackageId('python')).toBe('Python.Python.3.12')
    expect(wingetPackageId('uv')).toBe('astral-sh.uv')
  })

  it('returns null for docker (not auto-installed in v1)', () => {
    expect(wingetPackageId('docker')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/main/deps/depCheck.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/main/deps/depCheck.ts`**

```ts
import { spawnSync } from 'node:child_process'
import type { RuntimeKind } from '../../shared/types'

const WINGET_PACKAGE_IDS: Record<RuntimeKind, string | null> = {
  node: 'OpenJS.NodeJS.LTS',
  python: 'Python.Python.3.12',
  uv: 'astral-sh.uv',
  docker: null // not auto-installed in v1; detection only
}

const CHECK_COMMANDS: Record<RuntimeKind, string> = {
  node: 'node',
  python: 'python',
  uv: 'uv',
  docker: 'docker'
}

export function isRuntimeAvailable(runtime: RuntimeKind): boolean {
  const result = spawnSync('where', [CHECK_COMMANDS[runtime]], { encoding: 'utf-8' })
  return result.status === 0
}

export function wingetPackageId(runtime: RuntimeKind): string | null {
  return WINGET_PACKAGE_IDS[runtime]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/main/deps/depCheck.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing test `test/main/deps/winget.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { wingetInstall } from '../../../src/main/deps/winget'

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }))

describe('wingetInstall', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockReset()
  })

  it('reports success when winget exits 0', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: 'Installed', stderr: '' } as any)

    const result = wingetInstall('OpenJS.NodeJS.LTS')

    expect(result).toEqual({ success: true, message: 'Installed' })
    expect(spawnSync).toHaveBeenCalledWith(
      'winget',
      ['install', '--id', 'OpenJS.NodeJS.LTS', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements'],
      { encoding: 'utf-8' }
    )
  })

  it('reports failure with stderr when winget exits non-zero', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr: 'network error' } as any)

    const result = wingetInstall('OpenJS.NodeJS.LTS')

    expect(result).toEqual({ success: false, message: 'network error' })
  })

  it('reports failure when spawnSync itself errors (e.g. winget not found)', () => {
    vi.mocked(spawnSync).mockReturnValue({ error: new Error('ENOENT') } as any)

    const result = wingetInstall('OpenJS.NodeJS.LTS')

    expect(result).toEqual({ success: false, message: 'ENOENT' })
  })
})
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run test/main/deps/winget.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Write `src/main/deps/winget.ts`**

```ts
import { spawnSync } from 'node:child_process'

export interface WingetInstallResult {
  success: boolean
  message: string
}

export function wingetInstall(packageId: string): WingetInstallResult {
  const result = spawnSync(
    'winget',
    ['install', '--id', packageId, '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements'],
    { encoding: 'utf-8' }
  )
  if (result.error) {
    return { success: false, message: result.error.message }
  }
  if (result.status !== 0) {
    return { success: false, message: result.stderr || result.stdout || `winget exited with code ${result.status}` }
  }
  return { success: true, message: result.stdout }
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run test/main/deps/winget.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add src/main/deps/depCheck.ts src/main/deps/winget.ts test/main/deps/depCheck.test.ts test/main/deps/winget.test.ts
git commit -m "feat: add dependency checker and winget install wrapper for node/python/uv"
```

---

### Task 8: State tracker

**Files:**
- Create: `src/main/install/state.ts`
- Test: `test/main/install/state.test.ts`

**Interfaces:**
- Consumes: `ClientId`, `InstalledServerRecord` from Task 2.
- Produces: `statePath(userDataDir): string`, `listInstalled(userDataDir): InstalledServerRecord[]`, `recordInstall(userDataDir, serverId, clients, installedAt): void`, `recordUninstall(userDataDir, serverId): void` — consumed by the install orchestrator (Task 9) and IPC layer (Task 10).

- [ ] **Step 1: Write the failing test `test/main/install/state.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listInstalled, recordInstall, recordUninstall } from '../../../src/main/install/state'

describe('install state tracker', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-state-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns an empty list when no state file exists', () => {
    expect(listInstalled(tmpDir)).toEqual([])
  })

  it('records a new install', () => {
    recordInstall(tmpDir, 'ai.example/foo', ['claude-desktop'], '2026-07-13T00:00:00.000Z')

    expect(listInstalled(tmpDir)).toEqual([
      { serverId: 'ai.example/foo', clients: ['claude-desktop'], installedAt: '2026-07-13T00:00:00.000Z' }
    ])
  })

  it('replaces the record when the same server is installed again', () => {
    recordInstall(tmpDir, 'ai.example/foo', ['claude-desktop'], '2026-07-13T00:00:00.000Z')
    recordInstall(tmpDir, 'ai.example/foo', ['claude-desktop', 'cursor'], '2026-07-14T00:00:00.000Z')

    expect(listInstalled(tmpDir)).toEqual([
      { serverId: 'ai.example/foo', clients: ['claude-desktop', 'cursor'], installedAt: '2026-07-14T00:00:00.000Z' }
    ])
  })

  it('removes a record on uninstall', () => {
    recordInstall(tmpDir, 'ai.example/foo', ['claude-desktop'], '2026-07-13T00:00:00.000Z')
    recordInstall(tmpDir, 'ai.example/bar', ['cursor'], '2026-07-13T00:00:00.000Z')

    recordUninstall(tmpDir, 'ai.example/foo')

    expect(listInstalled(tmpDir)).toEqual([
      { serverId: 'ai.example/bar', clients: ['cursor'], installedAt: '2026-07-13T00:00:00.000Z' }
    ])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/main/install/state.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/main/install/state.ts`**

```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ClientId, InstalledServerRecord } from '../../shared/types'

export function statePath(userDataDir: string): string {
  return join(userDataDir, 'installed-servers.json')
}

function readState(userDataDir: string): InstalledServerRecord[] {
  const path = statePath(userDataDir)
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as InstalledServerRecord[]
  } catch {
    return []
  }
}

function writeState(userDataDir: string, records: InstalledServerRecord[]): void {
  const path = statePath(userDataDir)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(records, null, 2))
}

export function listInstalled(userDataDir: string): InstalledServerRecord[] {
  return readState(userDataDir)
}

export function recordInstall(
  userDataDir: string,
  serverId: string,
  clients: ClientId[],
  installedAt: string
): void {
  const records = readState(userDataDir).filter((r) => r.serverId !== serverId)
  records.push({ serverId, clients, installedAt })
  writeState(userDataDir, records)
}

export function recordUninstall(userDataDir: string, serverId: string): void {
  const records = readState(userDataDir).filter((r) => r.serverId !== serverId)
  writeState(userDataDir, records)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/main/install/state.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/install/state.ts test/main/install/state.test.ts
git commit -m "feat: add local install-state tracker"
```

---

### Task 9: Install orchestrator

**Files:**
- Create: `src/main/install/installer.ts`
- Test: `test/main/install/installer.test.ts`

**Interfaces:**
- Consumes: `ClientAdapter`, `McpServerConfigEntry` (Task 3/4), `isRuntimeAvailable`/`wingetPackageId` (Task 7), `wingetInstall` (Task 7), `recordInstall` (Task 8), `ClientId`/`InstallRequest`/`InstallStepResult` (Task 2).
- Produces: `installServer(request, deps): Promise<InstallStepResult[]>` — the single entry point the IPC layer (Task 10) calls.

- [ ] **Step 1: Write the failing test `test/main/install/installer.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installServer } from '../../../src/main/install/installer'
import { statePath } from '../../../src/main/install/state'
import type { ClientAdapter } from '../../../src/main/clients/types'
import type { InstallRequest, MergedServerEntry } from '../../../src/shared/types'

vi.mock('../../../src/main/deps/depCheck', () => ({
  isRuntimeAvailable: vi.fn(() => true),
  wingetPackageId: vi.fn(() => 'Some.Package')
}))
vi.mock('../../../src/main/deps/winget', () => ({
  wingetInstall: vi.fn(() => ({ success: true, message: '' }))
}))

import { isRuntimeAvailable } from '../../../src/main/deps/depCheck'
import { wingetInstall } from '../../../src/main/deps/winget'

function fakeAdapter(id: 'claude-desktop' | 'cursor', installed = true): ClientAdapter {
  const store: Record<string, unknown> = {}
  return {
    id,
    displayName: id,
    isInstalled: () => installed,
    getConfigPath: () => '/fake/path',
    readConfig: () => store as any,
    writeServer: (name, entry) => {
      store[name] = entry
    },
    removeServer: (name) => {
      delete store[name]
    }
  }
}

const baseServer: MergedServerEntry = {
  id: 'ai.example/foo',
  title: 'Foo',
  description: 'desc',
  version: '1.0.0',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', 'foo@1.0.0'],
  requiredRuntime: ['node'],
  requiredEnv: [{ name: 'FOO_KEY', description: '', isRequired: true, isSecret: true }]
}

describe('installServer', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'klik-install-'))
    vi.mocked(isRuntimeAvailable).mockReturnValue(true)
    vi.mocked(wingetInstall).mockReturnValue({ success: true, message: '' })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('errors per client when a required secret is missing, without calling winget or writing config', async () => {
    const request: InstallRequest = { server: baseServer, targetClients: ['claude-desktop'], secrets: {} }
    const adapter = fakeAdapter('claude-desktop')

    const results = await installServer(request, {
      adaptersById: { 'claude-desktop': adapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    expect(results).toEqual([
      { serverId: 'ai.example/foo', clientId: 'claude-desktop', status: 'error', message: 'Missing required value(s): FOO_KEY' }
    ])
    expect(adapter.readConfig()).toEqual({})
  })

  it('installs a missing runtime via winget before writing config', async () => {
    vi.mocked(isRuntimeAvailable).mockReturnValue(false)
    const request: InstallRequest = {
      server: baseServer,
      targetClients: ['claude-desktop'],
      secrets: { FOO_KEY: 'secret-value' }
    }
    const adapter = fakeAdapter('claude-desktop')

    const results = await installServer(request, {
      adaptersById: { 'claude-desktop': adapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    expect(wingetInstall).toHaveBeenCalledWith('Some.Package')
    expect(results).toEqual([{ serverId: 'ai.example/foo', clientId: 'claude-desktop', status: 'done' }])
    expect(adapter.readConfig()).toMatchObject({
      'ai.example/foo': { command: 'npx', args: ['-y', 'foo@1.0.0'], env: { FOO_KEY: 'secret-value' } }
    })
  })

  it('records a successful install in local state', async () => {
    const request: InstallRequest = {
      server: baseServer,
      targetClients: ['claude-desktop'],
      secrets: { FOO_KEY: 'secret-value' }
    }
    const adapter = fakeAdapter('claude-desktop')

    await installServer(request, {
      adaptersById: { 'claude-desktop': adapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    const state = JSON.parse(readFileSync(statePath(tmpDir), 'utf-8'))
    expect(state).toEqual([{ serverId: 'ai.example/foo', clients: ['claude-desktop'], installedAt: '2026-07-13T00:00:00.000Z' }])
  })

  it('reports an error for a target client that is not installed, without blocking other clients', async () => {
    const request: InstallRequest = {
      server: baseServer,
      targetClients: ['claude-desktop', 'cursor'],
      secrets: { FOO_KEY: 'secret-value' }
    }
    const claudeAdapter = fakeAdapter('claude-desktop')
    const cursorAdapter = fakeAdapter('cursor', false)

    const results = await installServer(request, {
      adaptersById: { 'claude-desktop': claudeAdapter, cursor: cursorAdapter } as any,
      userDataDir: tmpDir,
      now: () => '2026-07-13T00:00:00.000Z'
    })

    expect(results).toContainEqual({ serverId: 'ai.example/foo', clientId: 'claude-desktop', status: 'done' })
    expect(results).toContainEqual({
      serverId: 'ai.example/foo',
      clientId: 'cursor',
      status: 'error',
      message: 'cursor is not installed'
    })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/main/install/installer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/main/install/installer.ts`**

```ts
import type { ClientAdapter, McpServerConfigEntry } from '../clients/types'
import { isRuntimeAvailable, wingetPackageId } from '../deps/depCheck'
import { wingetInstall } from '../deps/winget'
import { recordInstall } from './state'
import type { ClientId, InstallRequest, InstallStepResult } from '../../shared/types'

export interface InstallerDeps {
  adaptersById: Record<ClientId, ClientAdapter>
  userDataDir: string
  now: () => string
}

function buildConfigEntry(request: InstallRequest): McpServerConfigEntry {
  const { server, secrets } = request
  if (server.transport === 'http') {
    return { url: server.url }
  }
  const env: Record<string, string> = {}
  for (const envVar of server.requiredEnv) {
    if (secrets[envVar.name] !== undefined) env[envVar.name] = secrets[envVar.name]
  }
  return { command: server.command, args: server.args, env: Object.keys(env).length > 0 ? env : undefined }
}

export async function installServer(request: InstallRequest, deps: InstallerDeps): Promise<InstallStepResult[]> {
  const results: InstallStepResult[] = []

  const missingSecrets = request.server.requiredEnv.filter(
    (envVar) => envVar.isRequired && !request.secrets[envVar.name]
  )
  if (missingSecrets.length > 0) {
    for (const clientId of request.targetClients) {
      results.push({
        serverId: request.server.id,
        clientId,
        status: 'error',
        message: `Missing required value(s): ${missingSecrets.map((s) => s.name).join(', ')}`
      })
    }
    return results
  }

  for (const runtime of request.server.requiredRuntime) {
    if (isRuntimeAvailable(runtime)) continue
    const packageId = wingetPackageId(runtime)
    if (!packageId) continue
    const install = wingetInstall(packageId)
    if (!install.success) {
      for (const clientId of request.targetClients) {
        results.push({
          serverId: request.server.id,
          clientId,
          status: 'error',
          message: `Failed to install ${runtime}: ${install.message}`
        })
      }
      return results
    }
  }

  const entry = buildConfigEntry(request)
  const succeededClients: ClientId[] = []

  for (const clientId of request.targetClients) {
    const adapter = deps.adaptersById[clientId]
    if (!adapter || !adapter.isInstalled()) {
      results.push({ serverId: request.server.id, clientId, status: 'error', message: `${clientId} is not installed` })
      continue
    }
    try {
      adapter.writeServer(request.server.id, entry)
      results.push({ serverId: request.server.id, clientId, status: 'done' })
      succeededClients.push(clientId)
    } catch (error) {
      results.push({
        serverId: request.server.id,
        clientId,
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  if (succeededClients.length > 0) {
    recordInstall(deps.userDataDir, request.server.id, succeededClients, deps.now())
  }

  return results
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/main/install/installer.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS (all tests from Tasks 3–9, ~36 tests total).

- [ ] **Step 6: Commit**

```bash
git add src/main/install/installer.ts test/main/install/installer.test.ts
git commit -m "feat: add install orchestrator tying dependency install, config writing, and state tracking together"
```

---

### Task 10: IPC layer

**Files:**
- Modify: `src/preload/index.ts` (replace Task 1's placeholder)
- Create: `src/main/ipc/handlers.ts`
- Modify: `src/main/index.ts` (call `registerIpcHandlers()`)

**Interfaces:**
- Consumes: `loadRegistry` (Task 5), `loadCuration`/`mergeCuration` (Task 6), the three client adapters (Task 4), `listInstalled` (Task 8), `installServer` (Task 9).
- Produces: `window.klik` in the renderer with `getServers()`, `getClients()`, `getInstalled()`, `install(request)` — consumed by the renderer (Tasks 11–12).

- [ ] **Step 1: Replace `src/preload/index.ts`**

```ts
import { contextBridge, ipcRenderer } from 'electron'
import type {
  ClientInfo,
  InstallRequest,
  InstallStepResult,
  InstalledServerRecord,
  MergedServerEntry
} from '../shared/types'

const klikApi = {
  getServers: (): Promise<MergedServerEntry[]> => ipcRenderer.invoke('klik:getServers'),
  getClients: (): Promise<ClientInfo[]> => ipcRenderer.invoke('klik:getClients'),
  getInstalled: (): Promise<InstalledServerRecord[]> => ipcRenderer.invoke('klik:getInstalled'),
  install: (request: InstallRequest): Promise<InstallStepResult[]> => ipcRenderer.invoke('klik:install', request)
}

export type KlikApi = typeof klikApi

contextBridge.exposeInMainWorld('klik', klikApi)
```

- [ ] **Step 2: Write `src/main/ipc/handlers.ts`**

```ts
import { app, ipcMain } from 'electron'
import { loadRegistry } from '../registry/client'
import { loadCuration, mergeCuration } from '../curation/overlay'
import { claudeDesktopAdapter } from '../clients/claudeDesktop'
import { cursorAdapter } from '../clients/cursor'
import { vscodeAdapter } from '../clients/vscode'
import { detectInstalledClients } from '../clients/detect'
import { listInstalled } from '../install/state'
import { installServer } from '../install/installer'
import type { ClientId, InstallRequest } from '../../shared/types'
import type { ClientAdapter } from '../clients/types'

const adaptersById: Record<ClientId, ClientAdapter> = {
  'claude-desktop': claudeDesktopAdapter,
  cursor: cursorAdapter,
  vscode: vscodeAdapter
}

export function registerIpcHandlers(): void {
  ipcMain.handle('klik:getServers', async () => {
    const userDataDir = app.getPath('userData')
    const resourcesDir = process.resourcesPath
    const [{ entries }, curation] = await Promise.all([loadRegistry(userDataDir), loadCuration(resourcesDir)])
    return mergeCuration(entries, curation)
  })

  ipcMain.handle('klik:getClients', () => detectInstalledClients())

  ipcMain.handle('klik:getInstalled', () => listInstalled(app.getPath('userData')))

  ipcMain.handle('klik:install', (_event, request: InstallRequest) =>
    installServer(request, {
      adaptersById,
      userDataDir: app.getPath('userData'),
      now: () => new Date().toISOString()
    })
  )
}
```

- [ ] **Step 3: Modify `src/main/index.ts`** to register the handlers on startup

```ts
import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { registerIpcHandlers } from './ipc/handlers'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`
Expected: window opens with no console errors about `klik:getServers`/`klik:getClients` handlers missing (renderer still shows Task 1's placeholder UI — Task 12 wires it up to actually call these).

- [ ] **Step 6: Commit**

```bash
git add src/preload/index.ts src/main/ipc/handlers.ts src/main/index.ts
git commit -m "feat: wire IPC bridge between renderer and registry/client/install modules"
```

---

### Task 11: Renderer — server list view

**Files:**
- Create: `src/renderer/src/api/klikApi.ts`
- Create: `src/renderer/src/components/ServerListView.tsx`

**Interfaces:**
- Consumes: `window.klik` (Task 10), `ClientId`/`ClientInfo`/`MergedServerEntry` (Task 2).
- Produces: `ServerListView` component — search/filter toolbar, client-target checklist, checkbox server list, install button. Consumed by `App.tsx` in Task 12.

- [ ] **Step 1: Write `src/renderer/src/api/klikApi.ts`**

```ts
import type {
  ClientInfo,
  InstallRequest,
  InstallStepResult,
  InstalledServerRecord,
  MergedServerEntry
} from '../../../shared/types'

declare global {
  interface Window {
    klik: {
      getServers: () => Promise<MergedServerEntry[]>
      getClients: () => Promise<ClientInfo[]>
      getInstalled: () => Promise<InstalledServerRecord[]>
      install: (request: InstallRequest) => Promise<InstallStepResult[]>
    }
  }
}

export const klikApi = window.klik
```

- [ ] **Step 2: Write `src/renderer/src/components/ServerListView.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Toolbar } from '@astryxdesign/core/Toolbar'
import { TextInput } from '@astryxdesign/core/TextInput'
import { List, ListItem } from '@astryxdesign/core/List'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import type { ClientId, ClientInfo, MergedServerEntry } from '../../../shared/types'

interface ServerListViewProps {
  servers: MergedServerEntry[]
  clients: ClientInfo[]
  selectedServerIds: string[]
  onChangeSelectedServerIds: (ids: string[]) => void
  selectedClientIds: ClientId[]
  onChangeSelectedClientIds: (ids: ClientId[]) => void
  onInstall: () => void
  isInstalling: boolean
}

export function ServerListView(props: ServerListViewProps): JSX.Element {
  const {
    servers,
    clients,
    selectedServerIds,
    onChangeSelectedServerIds,
    selectedClientIds,
    onChangeSelectedClientIds,
    onInstall,
    isInstalling
  } = props
  const [search, setSearch] = useState('')

  const filteredServers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return servers
    return servers.filter(
      (server) => server.title.toLowerCase().includes(query) || server.description.toLowerCase().includes(query)
    )
  }, [servers, search])

  function toggleServer(serverId: string, checked: boolean): void {
    if (checked) {
      onChangeSelectedServerIds([...selectedServerIds, serverId])
    } else {
      onChangeSelectedServerIds(selectedServerIds.filter((id) => id !== serverId))
    }
  }

  return (
    <VStack gap={4} width="100%">
      <Toolbar
        label="Server filters"
        size="sm"
        startContent={
          <TextInput
            label="Search"
            isLabelHidden
            placeholder="Search MCP servers..."
            value={search}
            onChange={setSearch}
          />
        }
      />

      <CheckboxList
        label="Install into"
        value={selectedClientIds}
        onChange={(values) => onChangeSelectedClientIds(values as ClientId[])}
      >
        {clients.map((client) => (
          <CheckboxListItem
            key={client.id}
            value={client.id}
            label={client.displayName}
            isDisabled={!client.installed}
            description={client.installed ? undefined : 'Not detected on this machine'}
          />
        ))}
      </CheckboxList>

      <List header="MCP servers" hasDividers density="compact">
        {filteredServers.map((server) => (
          <ListItem
            key={server.id}
            label={server.title}
            description={server.description}
            startContent={
              <CheckboxInput
                label={`Select ${server.title}`}
                isLabelHidden
                value={selectedServerIds.includes(server.id)}
                onChange={(checked) => toggleServer(server.id, checked)}
              />
            }
            endContent={server.curation?.verified ? <Badge variant="info" label="Verified" /> : undefined}
          />
        ))}
      </List>

      <HStack justify="end" gap={2}>
        <Text type="supporting">{selectedServerIds.length} selected</Text>
        <Button
          label="Get Your Klik"
          variant="primary"
          isDisabled={selectedServerIds.length === 0 || selectedClientIds.length === 0}
          isLoading={isInstalling}
          onClick={onInstall}
        />
      </HStack>
    </VStack>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: passes (this component isn't wired into `App.tsx` until Task 12, so it's dead code for now but must still typecheck cleanly).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/api/klikApi.ts src/renderer/src/components/ServerListView.tsx
git commit -m "feat: add renderer server list view with search, client toggle, and checkbox selection"
```

---

### Task 12: Renderer — secret prompt, install progress, and App wiring

**Files:**
- Create: `src/renderer/src/components/SecretPromptDialog.tsx`
- Create: `src/renderer/src/components/InstallProgressView.tsx`
- Modify: `src/renderer/src/App.tsx` (replace Task 1's placeholder)

**Interfaces:**
- Consumes: `ServerListView` (Task 11), `klikApi` (Task 11), `MergedServerEntry`/`InstallStepResult`/`ClientId` (Task 2).
- Produces: the complete v1 renderer flow: list → (secret prompt, only if needed) → install progress → back to list.

- [ ] **Step 1: Write `src/renderer/src/components/SecretPromptDialog.tsx`**

```tsx
import { useState } from 'react'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Button } from '@astryxdesign/core/Button'
import type { MergedServerEntry } from '../../../shared/types'

interface SecretPromptDialogProps {
  server: MergedServerEntry
  onSubmit: (secrets: Record<string, string>) => void
  onCancel: () => void
}

export function SecretPromptDialog(props: SecretPromptDialogProps): JSX.Element {
  const { server, onSubmit, onCancel } = props
  const [values, setValues] = useState<Record<string, string>>({})

  const requiredEnv = server.requiredEnv.filter((envVar) => envVar.isRequired)

  return (
    <Dialog isOpen onOpenChange={(open) => { if (!open) onCancel() }} purpose="form" width={440}>
      <Layout
        header={
          <DialogHeader
            title={`Configure ${server.title}`}
            subtitle="Required values for this server"
            onOpenChange={() => onCancel()}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              {requiredEnv.map((envVar) => (
                <TextInput
                  key={envVar.name}
                  label={envVar.name}
                  description={envVar.description}
                  type={envVar.isSecret ? 'password' : 'text'}
                  value={values[envVar.name] ?? ''}
                  onChange={(value) => setValues((prev) => ({ ...prev, [envVar.name]: value }))}
                />
              ))}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="secondary" onClick={onCancel} />
              <Button
                label="Continue"
                variant="primary"
                isDisabled={requiredEnv.some((envVar) => !values[envVar.name])}
                onClick={() => onSubmit(values)}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
```

- [ ] **Step 2: Write `src/renderer/src/components/InstallProgressView.tsx`**

```tsx
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Badge } from '@astryxdesign/core/Badge'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import type { InstallStepResult } from '../../../shared/types'

interface InstallProgressViewProps {
  results: InstallStepResult[]
  isInstalling: boolean
  onDone: () => void
}

export function InstallProgressView(props: InstallProgressViewProps): JSX.Element {
  const { results, isInstalling, onDone } = props
  const doneCount = results.filter((r) => r.status === 'done').length
  const total = results.length

  return (
    <VStack gap={4} width="100%">
      <ProgressBar
        label="Install progress"
        value={doneCount}
        max={total || 1}
        hasValueLabel
        isIndeterminate={isInstalling && total === 0}
        variant={results.some((r) => r.status === 'error') ? 'warning' : 'accent'}
      />

      <VStack gap={2}>
        {results.map((result, index) => (
          <HStack key={`${result.serverId}-${result.clientId}-${index}`} justify="between" align="center">
            <Text type="body">
              {result.serverId} → {result.clientId}
            </Text>
            {result.status === 'running' && <Spinner size="sm" label="Installing" />}
            {result.status === 'done' && <Badge variant="success" label="Installed" />}
            {result.status === 'error' && <Badge variant="error" label={result.message ?? 'Failed'} />}
            {result.status === 'pending' && <Text type="supporting">Waiting…</Text>}
          </HStack>
        ))}
      </VStack>

      <HStack justify="end">
        <Button label="Done" variant="primary" isDisabled={isInstalling} onClick={onDone} />
      </HStack>
    </VStack>
  )
}
```

- [ ] **Step 3: Replace `src/renderer/src/App.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { klikApi } from './api/klikApi'
import { ServerListView } from './components/ServerListView'
import { InstallProgressView } from './components/InstallProgressView'
import { SecretPromptDialog } from './components/SecretPromptDialog'
import type { ClientId, ClientInfo, InstallStepResult, MergedServerEntry } from '../../shared/types'

type ViewMode = 'list' | 'secrets' | 'progress'

export default function App(): JSX.Element {
  const [servers, setServers] = useState<MergedServerEntry[]>([])
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<ClientId[]>([])
  const [results, setResults] = useState<InstallStepResult[]>([])
  const [isInstalling, setIsInstalling] = useState(false)
  const [view, setView] = useState<ViewMode>('list')
  const [secretsByServer, setSecretsByServer] = useState<Record<string, Record<string, string>>>({})
  const [pendingSecretServerIds, setPendingSecretServerIds] = useState<string[]>([])

  useEffect(() => {
    klikApi.getServers().then(setServers)
    klikApi.getClients().then((fetchedClients) => {
      setClients(fetchedClients)
      setSelectedClientIds(fetchedClients.filter((c) => c.installed).map((c) => c.id))
    })
  }, [])

  const selectedServers = useMemo(
    () =>
      selectedServerIds
        .map((id) => servers.find((s) => s.id === id))
        .filter((s): s is MergedServerEntry => Boolean(s)),
    [selectedServerIds, servers]
  )

  function startInstall(): void {
    const needsSecrets = selectedServers.filter((server) => server.requiredEnv.some((e) => e.isRequired))
    if (needsSecrets.length > 0) {
      setPendingSecretServerIds(needsSecrets.map((s) => s.id))
      setView('secrets')
      return
    }
    void runInstall(selectedServers, {})
  }

  function handleSecretsSubmit(secrets: Record<string, string>): void {
    const [currentId, ...rest] = pendingSecretServerIds
    const nextSecretsByServer = { ...secretsByServer, [currentId]: secrets }
    setSecretsByServer(nextSecretsByServer)
    if (rest.length > 0) {
      setPendingSecretServerIds(rest)
      return
    }
    setPendingSecretServerIds([])
    void runInstall(selectedServers, nextSecretsByServer)
  }

  async function runInstall(
    targets: MergedServerEntry[],
    secretsMap: Record<string, Record<string, string>>
  ): Promise<void> {
    setView('progress')
    setIsInstalling(true)
    setResults([])
    const allResults: InstallStepResult[] = []
    for (const server of targets) {
      const stepResults = await klikApi.install({
        server,
        targetClients: selectedClientIds,
        secrets: secretsMap[server.id] ?? {}
      })
      allResults.push(...stepResults)
      setResults([...allResults])
    }
    setIsInstalling(false)
  }

  return (
    <VStack gap={6} width="100%" hAlign="stretch">
      <Heading level={1}>Klik</Heading>
      {view === 'list' && (
        <ServerListView
          servers={servers}
          clients={clients}
          selectedServerIds={selectedServerIds}
          onChangeSelectedServerIds={setSelectedServerIds}
          selectedClientIds={selectedClientIds}
          onChangeSelectedClientIds={setSelectedClientIds}
          onInstall={startInstall}
          isInstalling={isInstalling}
        />
      )}
      {view === 'secrets' && pendingSecretServerIds.length > 0 && (
        <SecretPromptDialog
          server={servers.find((s) => s.id === pendingSecretServerIds[0])!}
          onSubmit={handleSecretsSubmit}
          onCancel={() => setView('list')}
        />
      )}
      {view === 'progress' && (
        <InstallProgressView results={results} isInstalling={isInstalling} onDone={() => setView('list')} />
      )}
    </VStack>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`
Expected: the window loads the server list (live from the official registry — requires network), the client checklist reflects whichever of Claude Desktop/Cursor/VS Code are actually installed on this machine, search filters the list, checking a server and clicking "Get Your Klik" moves to either the secret-prompt dialog (if the server needs one) or straight to the progress view, and "Done" returns to the list.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/components/SecretPromptDialog.tsx src/renderer/src/components/InstallProgressView.tsx src/renderer/src/App.tsx
git commit -m "feat: wire full renderer flow — list, secret prompt, install progress"
```

---

### Task 13: Packaging + manual smoke test checklist

**Files:**
- Create: `electron-builder.yml`
- Modify: `package.json` (add `build` config reference if needed — electron-builder reads `electron-builder.yml` automatically, no `package.json` change required)
- Create: `docs/superpowers/plans/2026-07-13-klik-v1-smoke-test-checklist.md`

**Interfaces:**
- Consumes: the built `out/` directory from `electron-vite build` (Task 1's `build` script) and `curation/overlay.json` (Task 6) as a bundled resource.
- Produces: a signed-later, unsigned-for-now Windows NSIS installer `.exe`, and a checklist for the real-client manual pass the spec's Testing section calls for.

- [ ] **Step 1: Write `electron-builder.yml`**

```yaml
appId: dev.klikmcp.app
productName: Klik
directories:
  output: release
files:
  - out/**/*
extraResources:
  - from: curation
    to: curation
win:
  target: nsis
  artifactName: ${productName}-Setup-${version}.exe
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

- [ ] **Step 2: Build and package**

Run: `npm run build:win`
Expected: `release/Klik-Setup-0.1.0.exe` is produced. Windows SmartScreen will warn on first run since the build is unsigned — expected per the spec's documented v1 limitation, not a bug.

- [ ] **Step 3: Write the smoke test checklist `docs/superpowers/plans/2026-07-13-klik-v1-smoke-test-checklist.md`**

```markdown
# Klik v1 — manual smoke test checklist

Run against real installs of Claude Desktop, Cursor, and VS Code on a dev machine before calling v1 done. This is the manual pass the design spec's Testing section calls for — it isn't automated.

## Detection
- [ ] With all 3 clients installed, Klik's client checklist shows all 3 as enabled/checked by default.
- [ ] With one client (e.g. Cursor) not installed, its checklist item is disabled with "Not detected on this machine."

## Install — stdio server, no secrets required
- [ ] Pick a registry server with no required env vars, target all 3 clients, click "Get Your Klik."
- [ ] Progress view shows "done" for each client.
- [ ] Restart each client; the server appears in its MCP server list and is actually callable.
- [ ] Confirm each client's config file was correctly written under its client-specific key (`mcpServers` for Claude Desktop/Cursor, `servers` for VS Code) and existing unrelated entries in each file were preserved.

## Install — server requiring a secret
- [ ] Pick a registry server with a required env var, select it, click install.
- [ ] Secret-prompt dialog appears before any config is written; "Continue" is disabled until the value is filled in.
- [ ] After submitting, the value appears in the written client config's `env` block — not anywhere else on disk (grep the app's userData directory to confirm no copy was persisted by Klik itself).

## Dependency install
- [ ] On a machine without Node.js installed, install an npm-backed server; confirm Klik runs `winget install --id OpenJS.NodeJS.LTS ...` and the install proceeds once it completes.
- [ ] On a machine without uv installed, install a pypi-backed server; confirm the same for `astral-sh.uv`.

## Uninstall / re-detection
- [ ] Relaunch Klik after installing a server; it should show as already-installed (state tracker persisted correctly).

## Error handling
- [ ] Disconnect the network and relaunch Klik; the server list still loads from the local registry cache with a "data may be stale" indication, rather than an empty list or a crash.
- [ ] Target a client that isn't installed; confirm the per-client error surfaces without blocking the other selected clients.
```

- [ ] **Step 4: Commit**

```bash
git add electron-builder.yml docs/superpowers/plans/2026-07-13-klik-v1-smoke-test-checklist.md
git commit -m "chore: add Windows packaging config and v1 manual smoke test checklist"
```

---

## Self-review notes

- **Spec coverage:** every spec section maps to a task — Architecture → Tasks 1/10; Components (registry client, curation layer, client detector, dependency installer, config writer, state tracker) → Tasks 5, 6, 4, 7, 3/4, 8 respectively; Data flow → Tasks 9/10/12; Error handling → covered in Task 9's tests (missing secret, client not installed) and Task 5/6's cache-fallback tests; Testing section's fixture/unit-test expectations → Tasks 3–9's test files; Code signing → intentionally out of this plan's scope (a business/procurement step, not code — tracked separately, not a code task).
- **Type consistency check:** `ClientAdapter`, `McpServerConfigEntry`, `MergedServerEntry`, `InstallRequest`, `InstallStepResult`, `ClientId` are defined once each (Tasks 2/3) and referenced with the same names and shapes across every later task — no renamed duplicates.
- **Scope check:** this is one implementation plan for one v1 deliverable (not multiple independent subsystems) — consistent with how the spec scoped v1.
