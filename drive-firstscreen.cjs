// Measures time to a usable first screen — cards on glass, not just the shell —
// against the real 9.5 MB / 15,669-server cache.
const { _electron } = require('playwright-core')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const electronPath = require('electron')
const REAL = path.join(os.homedir(), 'AppData', 'Roaming', 'klikmcp')

;(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klik-first-'))
  fs.writeFileSync(
    path.join(dir, 'preferences.json'),
    JSON.stringify({ theme: 'dark', sound: false, onboarded: true })
  )
  for (const f of ['registry-cache.json', 'skills-catalog.json']) {
    const src = path.join(REAL, f)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, f))
  }
  const bytes = fs.statSync(path.join(dir, 'registry-cache.json')).size
  console.log('cache size:', Math.round(bytes / 1024 / 1024), 'MB')

  const t0 = Date.now()
  const app = await _electron.launch({
    executablePath: electronPath,
    args: ['.', `--user-data-dir=${dir}`],
    env: { ...process.env, KLIK_PERF: '1' }
  })
  app.process().stdout?.on('data', (b) => {
    const line = b.toString().trim()
    if (line.includes('[perf]')) console.log('  main:', line.replace('[perf] ', ''), 'ms into process')
  })
  const win = await app.firstWindow()
  console.log('window object          :', Date.now() - t0, 'ms')

  await win.waitForSelector('header', { timeout: 30000 })
  console.log('shell (header) painted :', Date.now() - t0, 'ms')

  // The real thing being waited on: an actual server card.
  await win.waitForFunction(
    () => document.querySelectorAll('button[aria-label*="—"]').length > 0,
    { timeout: 60000 }
  )
  console.log('FIRST CARDS ON SCREEN  :', Date.now() - t0, 'ms')

  const detail = await win.evaluate(() => ({
    cards: document.querySelectorAll('button[aria-label*="—"]').length,
    sidebarCount: document.body.innerText.match(/MCP Servers\s*([\d,]+)/)?.[1] ?? '?'
  }))
  console.log('state                  :', JSON.stringify(detail))

  await app.close()
  fs.rmSync(dir, { recursive: true, force: true })
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
