// Drives the full-catalogue view against the real registry cache, which runs to
// ~15,000 entries. Copies the real cache into a throwaway profile so the ranking and
// windowing are exercised at true scale without touching the real profile.
const { _electron } = require('playwright-core')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const electronPath = require('electron')
const OUT = path.join(process.cwd(), '.shots')
const REAL_CACHE = path.join(os.homedir(), 'AppData', 'Roaming', 'klikmcp', 'registry-cache.json')

;(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klik-browse-'))
  fs.writeFileSync(
    path.join(userDataDir, 'preferences.json'),
    JSON.stringify({ theme: 'dark', sound: true, onboarded: true })
  )
  if (fs.existsSync(REAL_CACHE)) {
    fs.copyFileSync(REAL_CACHE, path.join(userDataDir, 'registry-cache.json'))
    const n = JSON.parse(fs.readFileSync(REAL_CACHE, 'utf-8')).length
    console.log('seeded cache with', n, 'servers')
  }
  fs.mkdirSync(OUT, { recursive: true })

  const app = await _electron.launch({
    executablePath: electronPath,
    args: ['.', `--user-data-dir=${userDataDir}`]
  })
  const win = await app.firstWindow()
  await win.waitForSelector('header', { timeout: 20000 })
  await win.waitForTimeout(3500)

  const total = await win.evaluate(() => document.body.innerText.match(/Browse all ([\d,]+)/)?.[1] ?? '?')
  console.log('catalogue size shown:', total)

  // Into the full catalogue, and time how long it takes to become interactive.
  const t0 = Date.now()
  await win.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /Browse all/.test(x.textContent || ''))
    if (b) b.click()
  })
  await win.waitForTimeout(1200)
  console.log('browse render took ~', Date.now() - t0, 'ms')
  await win.screenshot({ path: path.join(OUT, 'browse-all.png') })
  console.log('SHOT browse-all')

  const state = await win.evaluate(() => {
    const cards = document.querySelectorAll('button[aria-label*="—"]').length
    const showMore = document.body.innerText.match(/Show more\s*([\d]+) of ([\d]+)/)
    const firstTitles = [...document.querySelectorAll('.font-heading')]
      .slice(0, 6)
      .map((e) => e.textContent?.trim())
    return { mountedCards: cards, window: showMore ? `${showMore[1]} of ${showMore[2]}` : 'n/a', firstTitles }
  })
  console.log('STATE:', JSON.stringify(state, null, 2))

  // Typing must stay responsive with 15k entries behind the filter.
  const t1 = Date.now()
  await win.evaluate(() => {
    const input = document.querySelector('input')
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, 'notion')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
  await win.waitForTimeout(700)
  console.log('filter to "notion" took ~', Date.now() - t1, 'ms')
  await win.screenshot({ path: path.join(OUT, 'browse-filtered.png') })

  await app.close()
  fs.rmSync(userDataDir, { recursive: true, force: true })
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
