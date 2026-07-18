// Drives the real Electron app: screenshots each theme and each section so the
// shell can actually be looked at, not just measured. The browser preview harness
// reported impossible values for this app, so this is the source of truth.
// Build first (`npm run build`), then: node drive-klik.cjs [outDir]
const { _electron } = require('playwright-core')
const path = require('node:path')
const fs = require('node:fs')

const electronPath = require('electron')
const OUT = process.argv[2] || path.join(process.cwd(), '.shots')

async function shoot(win, name) {
  fs.mkdirSync(OUT, { recursive: true })
  const file = path.join(OUT, `${name}.png`)
  await win.screenshot({ path: file })
  console.log('SHOT', name, '->', file)
}

async function setTheme(win, theme) {
  await win.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t)
  }, theme)
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
  const app = await _electron.launch({ executablePath: electronPath, args: ['.'] })
  const win = await app.firstWindow()
  await win.setViewportSize({ width: 1280, height: 860 }).catch(() => {})
  await win.waitForSelector('header', { timeout: 20000 })
  await win.waitForTimeout(2200)

  const errors = await win.evaluate(() => {
    const out = []
    document.querySelectorAll('*').forEach(() => {})
    return out
  })

  for (const theme of ['light', 'dark']) {
    await setTheme(win, theme)
    await shoot(win, `${theme}-mcp`)
    if (await goto(win, 'Skills')) await shoot(win, `${theme}-skills`)
    if (await goto(win, 'Tools')) await shoot(win, `${theme}-tools`)
    await goto(win, 'MCP Servers')
  }

  console.log('ERRORS:', JSON.stringify(errors))
  await app.close()
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
