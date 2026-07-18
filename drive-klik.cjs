// Drives the real Electron app: screenshots each theme and each section so the shell
// can be looked at, not just measured. The browser preview harness reported impossible
// values for this app, so this is the source of truth.
//
// Runs against a throwaway --user-data-dir, so it never touches the real Klik profile
// (preferences, install records, caches). Build first (`npm run build`), then:
//   node drive-klik.cjs
const { _electron } = require('playwright-core')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const electronPath = require('electron')
const OUT = path.join(process.cwd(), '.shots')

/** A clean profile per run, seeded so we land in the app rather than in first run. */
function scratchProfile(seed) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klik-drive-'))
  if (seed) {
    fs.writeFileSync(path.join(dir, 'preferences.json'), JSON.stringify(seed, null, 2))
  }
  return dir
}

async function shoot(win, name) {
  fs.mkdirSync(OUT, { recursive: true })
  await win.screenshot({ path: path.join(OUT, `${name}.png`) })
  console.log('SHOT', name)
}

async function setTheme(win, theme) {
  await win.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
  await win.waitForTimeout(400)
}

async function goto(win, label) {
  const ok = await win.evaluate((l) => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      (x.textContent || '').trim().toLowerCase().startsWith(l.toLowerCase())
    )
    if (!b) return false
    b.click()
    return true
  }, label)
  await win.waitForTimeout(650)
  return ok
}

;(async () => {
  const userDataDir = scratchProfile({ theme: 'system', sound: true, onboarded: true })
  console.log('profile:', userDataDir)

  const app = await _electron.launch({
    executablePath: electronPath,
    args: ['.', `--user-data-dir=${userDataDir}`]
  })
  const win = await app.firstWindow()
  await win.waitForSelector('header', { timeout: 20000 })
  // A cold profile has no catalogue cache, so give the live fetch a moment.
  await win.waitForTimeout(4000)

  // The theme is re-stamped immediately before each capture. ThemeProvider clears
  // data-theme when the preference is `system`, so setting it once per pass gets
  // silently undone and every shot comes out in the OS theme.
  const sections = ['MCP Servers', 'Skills', 'Plugins', 'Tools', 'Settings']
  const slug = { 'MCP Servers': 'mcp', Skills: 'skills', Plugins: 'plugins', Tools: 'tools', Settings: 'settings' }

  for (const theme of ['light', 'dark']) {
    for (const section of sections) {
      if (!(await goto(win, section))) continue
      await setTheme(win, theme)
      await shoot(win, `${theme}-${slug[section]}`)
    }
  }

  await app.close()
  fs.rmSync(userDataDir, { recursive: true, force: true })
  console.log('profile cleaned up')
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
