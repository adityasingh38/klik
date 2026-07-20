// Drives first run in the real app against a throwaway --user-data-dir. A fresh
// profile has never been onboarded, so the flow plays naturally — nothing in the real
// Klik profile is read or written. Build first, then: node drive-firstrun.cjs
const { _electron } = require('playwright-core')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const electronPath = require('electron')
const OUT = path.join(process.cwd(), '.shots')

;(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klik-firstrun-'))
  console.log('profile:', userDataDir)
  fs.mkdirSync(OUT, { recursive: true })

  const app = await _electron.launch({
    executablePath: electronPath,
    args: ['.', `--user-data-dir=${userDataDir}`]
  })
  const win = await app.firstWindow()

  await win.waitForTimeout(1300)
  await win.screenshot({ path: path.join(OUT, 'firstrun-1-detect.png') })
  console.log('SHOT beat 1 — detection')

  // Beat two arrives on its own after the held moment.
  await win.waitForTimeout(2400)
  await win.screenshot({ path: path.join(OUT, 'firstrun-2-intent.png') })
  console.log('SHOT beat 2 — intents')

  const options = await win.evaluate(() => {
    const buttons = [...document.querySelectorAll('button[aria-pressed]')]
    buttons.slice(0, 2).forEach((b) => b.click())
    return buttons.length
  })
  console.log('intent options found:', options)
  await win.waitForTimeout(500)
  await win.screenshot({ path: path.join(OUT, 'firstrun-3-chosen.png') })

  const finished = await win.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /Show me/.test(x.textContent || ''))
    if (!b) return false
    b.click()
    return true
  })
  console.log('finished:', finished)
  await win.waitForTimeout(2500)
  await win.screenshot({ path: path.join(OUT, 'firstrun-4-landed.png') })
  console.log('SHOT beat 4 — landed (2.5s)')

  // A cold profile has no registry cache, so time how long the first catalogue
  // actually takes to arrive — this is what a brand new user sees.
  const start = Date.now()
  let ms = null
  for (let i = 0; i < 40; i += 1) {
    const ready = await win.evaluate(() => document.querySelectorAll('button[aria-label*="—"]').length > 0)
    if (ready) { ms = Date.now() - start; break }
    await win.waitForTimeout(500)
  }
  console.log('COLD CATALOGUE READY AFTER:', ms === null ? 'never (>20s)' : `${ms + 2500}ms`)
  await win.screenshot({ path: path.join(OUT, 'firstrun-5-settled.png') })

  const landed = await win.evaluate(() => ({
    selected: document.body.innerText.match(/(\d+) selected/)?.[1] ?? '0',
    onWall: /Give your AI something new/.test(document.body.innerText)
  }))
  console.log('LANDED:', JSON.stringify(landed))

  await app.close()
  fs.rmSync(userDataDir, { recursive: true, force: true })
  console.log('profile cleaned up')
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
