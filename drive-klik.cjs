// Drives the real Electron app and reports on the shell.
// The browser preview harness returned impossible values (an inline `width !important`
// had no effect), so nothing measured there can be trusted. This talks to the real
// renderer. Build first (`npm run build`), then: node drive-klik.cjs
const { _electron } = require('playwright-core')

const electronPath = require('electron')

async function snapshot(win) {
  return win.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    const body = getComputedStyle(document.body)
    const sb = document.querySelector('[data-slot="sidebar"]')
    const gap = document.querySelector('[data-slot="sidebar-gap"]')
    return {
      theme: document.documentElement.dataset.theme || '(system)',
      background: body.backgroundColor,
      primary: cs.getPropertyValue('--primary').trim(),
      fontHeading: cs.getPropertyValue('--font-heading').trim().split(',')[0],
      shadowRaised: cs.getPropertyValue('--shadow-raised').trim().slice(0, 28),
      markPaths: document.querySelectorAll('svg path[fill="currentColor"]').length,
      sidebarState: sb && sb.getAttribute('data-state'),
      sidebarWidth: gap ? Math.round(gap.getBoundingClientRect().width) : null
    }
  })
}

;(async () => {
  const app = await _electron.launch({ executablePath: electronPath, args: ['.'] })
  const win = await app.firstWindow()
  await win.waitForSelector('header', { timeout: 20000 })
  await win.waitForTimeout(1800)

  console.log('INITIAL   :', JSON.stringify(await snapshot(win)))

  // Theme toggle — the circular reveal commits an explicit choice.
  const toggled = await win.evaluate(() => {
    const b = document.querySelector('button[aria-label*="theme"]')
    if (!b) return false
    b.click()
    return true
  })
  console.log('TOGGLED   :', toggled)
  await win.waitForTimeout(900)
  console.log('AFTER     :', JSON.stringify(await snapshot(win)))

  // Toggle back, to confirm both directions resolve.
  await win.evaluate(() => {
    const b = document.querySelector('button[aria-label*="theme"]')
    if (b) b.click()
  })
  await win.waitForTimeout(900)
  console.log('BACK      :', JSON.stringify(await snapshot(win)))

  const errors = await win.evaluate(() => window.__errors || [])
  console.log('ERRORS    :', JSON.stringify(errors))

  await app.close()
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
