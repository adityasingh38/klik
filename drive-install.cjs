// Drives a real MCP server install end to end, against a fake home directory.
//
// This is the one flow Klik exists for, and the only one where a regression is
// unrecoverable: someone downloads the app, installs a server, and it silently writes the
// wrong thing into a config file they trust. Tests cover the pieces; this exercises the
// actual button in the actual shipped build.
//
// Every client path in src/main/clients/ derives from APPDATA / LOCALAPPDATA / USERPROFILE,
// so pointing those at a scratch directory isolates the whole thing — the real Claude
// Desktop, Cursor and VS Code configs are never opened, let alone written.
//
// Build first (`npm run build`), then: node drive-install.cjs
const { _electron } = require('playwright-core')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const electronPath = require('electron')
const REAL_PROFILE = path.join(os.homedir(), 'AppData', 'Roaming', 'klikmcp')

/** A home directory with Claude Desktop "installed", so detection finds a target. */
function fakeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'klik-home-'))
  const appData = path.join(home, 'AppData', 'Roaming')
  const localAppData = path.join(home, 'AppData', 'Local')

  // Detection looks for the executable; an empty file is enough to be found.
  const exeDir = path.join(localAppData, 'AnthropicClaude')
  fs.mkdirSync(exeDir, { recursive: true })
  fs.writeFileSync(path.join(exeDir, 'claude.exe'), '')

  const configDir = path.join(appData, 'Claude')
  fs.mkdirSync(configDir, { recursive: true })
  const configPath = path.join(configDir, 'claude_desktop_config.json')
  // A pre-existing server, so we can prove an install merges rather than overwrites.
  fs.writeFileSync(
    configPath,
    JSON.stringify({ mcpServers: { 'pre-existing': { command: 'echo', args: ['keep me'] } } }, null, 2)
  )

  return { home, appData, localAppData, configPath }
}

function readConfig(configPath) {
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
}

const results = []
function check(name, passed, detail) {
  results.push({ name, passed })
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

;(async () => {
  const { home, appData, localAppData, configPath } = fakeHome()
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'klik-ud-'))
  fs.writeFileSync(
    path.join(userData, 'preferences.json'),
    JSON.stringify({ theme: 'dark', sound: false, onboarded: true })
  )
  for (const f of ['registry-cache.json', 'skills-catalog.json']) {
    const src = path.join(REAL_PROFILE, f)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(userData, f))
  }

  const app = await _electron.launch({
    executablePath: electronPath,
    args: ['.', `--user-data-dir=${userData}`],
    env: { ...process.env, USERPROFILE: home, APPDATA: appData, LOCALAPPDATA: localAppData }
  })
  const win = await app.firstWindow()
  await win.waitForSelector('button[aria-label*="—"]', { timeout: 60000 })

  // Pick a server with no required secrets, so the flow doesn't stop on a form.
  const target = 'Sequential Thinking'
  const opened = await win.evaluate((title) => {
    const card = [...document.querySelectorAll('button[aria-label*="—"]')].find((b) =>
      (b.getAttribute('aria-label') || '').includes(title)
    )
    if (!card) return false
    card.click()
    return true
  }, target)
  check(`opens the ${target} card`, opened)
  if (!opened) throw new Error('card not found — catalogue may not have loaded')

  await win.waitForTimeout(900)

  // Single-server flow: the drawer's "Install" opens a preview, and the preview's own
  // "Install" is the commit. (The "Klik it" button belongs to the bulk-select bar on the
  // wall behind — a separate flow, not this one.)
  const openedDialog = await win.evaluate(() => {
    const panel = document.querySelector('[data-slot="drawer-popup"],[role="dialog"]')
    const b = [...(panel?.querySelectorAll('button') ?? [])].find(
      (x) => (x.textContent || '').trim() === 'Install'
    )
    if (!b || b.disabled) return false
    b.click()
    return true
  })
  check('opens the install preview from the drawer', openedDialog)
  if (!openedDialog) throw new Error('no Install action in the drawer')

  await win.waitForTimeout(1600)

  // The preview is the product's promise: it must name the command and the exact file.
  const preview = await win.evaluate(() => {
    const dialogs = [...document.querySelectorAll('[role="dialog"],[data-slot="dialog-popup"]')]
    const d = dialogs[dialogs.length - 1]
    return d ? d.innerText : ''
  })
  check('preview names the command that will run', preview.includes('npx -y @modelcontextprotocol/server-sequential-thinking'))
  check('preview names the config file it will edit', preview.includes('claude_desktop_config.json'))
  check(
    'preview points at the scratch home, not the real one',
    preview.includes(home),
    home
  )

  const committed = await win.evaluate(() => {
    const dialogs = [...document.querySelectorAll('[role="dialog"],[data-slot="dialog-popup"]')]
    const d = dialogs[dialogs.length - 1]
    const b = [...(d?.querySelectorAll('button') ?? [])].find(
      (x) => (x.textContent || '').trim() === 'Install'
    )
    if (!b || b.disabled) return false
    b.click()
    return true
  })
  check('confirms the install', committed)
  if (!committed) throw new Error('no Install button in the preview dialog')

  await win.waitForTimeout(4000)

  const config = readConfig(configPath)
  const servers = config.mcpServers ?? {}
  const added = Object.keys(servers).filter((k) => k !== 'pre-existing')

  check('kept the pre-existing server', Boolean(servers['pre-existing']))
  check('wrote a new server entry', added.length > 0, added.join(', ') || 'nothing added')

  if (added.length > 0) {
    const entry = servers[added[0]]
    check('the entry has a command', typeof entry.command === 'string' && entry.command.length > 0, entry.command)
    check('the entry has args', Array.isArray(entry.args), JSON.stringify(entry.args))
  }

  console.log('\nresulting config:\n' + JSON.stringify(config, null, 2))

  await app.close()
  for (const dir of [home, userData]) fs.rmSync(dir, { recursive: true, force: true })

  const failed = results.filter((r) => !r.passed)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length > 0) process.exit(1)
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
