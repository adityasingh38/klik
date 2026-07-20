// Captures the surfaces that still wear the old styling: Installed, the server detail
// drawer, and the install preview dialog. Throwaway profile seeded with the real
// catalogue so the content is realistic.
const { _electron } = require('playwright-core')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const electronPath = require('electron')
const OUT = path.join(process.cwd(), '.shots')
const REAL = path.join(os.homedir(), 'AppData', 'Roaming', 'klikmcp')

;(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klik-surf-'))
  fs.writeFileSync(
    path.join(dir, 'preferences.json'),
    JSON.stringify({ theme: 'dark', sound: false, onboarded: true })
  )
  for (const f of ['registry-cache.json', 'skills-catalog.json', 'installed-servers.json']) {
    const src = path.join(REAL, f)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, f))
  }
  fs.mkdirSync(OUT, { recursive: true })

  const app = await _electron.launch({
    executablePath: electronPath,
    args: ['.', `--user-data-dir=${dir}`]
  })
  const win = await app.firstWindow()
  await win.waitForSelector('header', { timeout: 20000 })
  await win.waitForTimeout(3000)

  const goto = async (label) => {
    await win.evaluate((l) => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        (x.textContent || '').trim().toLowerCase().startsWith(l.toLowerCase())
      )
      if (b) b.click()
    }, label)
    await win.waitForTimeout(700)
  }

  await goto('Installed')
  await win.screenshot({ path: path.join(OUT, 'surface-installed.png') })
  console.log('SHOT installed')

  // Open a server's detail drawer from the wall.
  await goto('MCP Servers')
  await win.evaluate(() => {
    const card = document.querySelector('button[aria-label*="—"]')
    if (card) card.click()
  })
  await win.waitForTimeout(900)
  await win.screenshot({ path: path.join(OUT, 'surface-drawer.png') })
  console.log('SHOT drawer')

  // From the drawer, trigger the install preview.
  // Scope to the drawer — the sidebar's "Installed" nav also starts with "Install".
  const opened = await win.evaluate(() => {
    // Exact match: the sidebar item is "Installed", the drawer action is "Install".
    const buttons = [...document.querySelectorAll('button')]
    const b = buttons.find((x) => (x.textContent || '').trim() === 'Install')
    if (!b) return buttons.map((x) => (x.textContent || '').trim()).filter(Boolean).slice(-8)
    b.click()
    return true
  })
  await win.waitForTimeout(1600)
  await win.screenshot({ path: path.join(OUT, 'surface-preview.png') })
  console.log('SHOT preview (opened:', opened, ')')

  await app.close()
  fs.rmSync(dir, { recursive: true, force: true })
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
