// Measures what "snappy" actually means here: time to first paint, how long a section
// switch takes, and whether scrolling drops frames. Runs against a throwaway profile
// seeded with the real registry cache so the numbers are at true catalogue scale.
const { _electron } = require('playwright-core')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const electronPath = require('electron')
const REAL = path.join(os.homedir(), 'AppData', 'Roaming', 'klikmcp')

;(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klik-perf-'))
  fs.writeFileSync(
    path.join(dir, 'preferences.json'),
    JSON.stringify({ theme: 'dark', sound: false, onboarded: true })
  )
  for (const f of ['registry-cache.json', 'skills-catalog.json']) {
    const src = path.join(REAL, f)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, f))
  }

  const launched = Date.now()
  const app = await _electron.launch({
    executablePath: electronPath,
    args: ['.', `--user-data-dir=${dir}`]
  })
  const win = await app.firstWindow()
  await win.waitForSelector('header', { timeout: 20000 })
  const toHeader = Date.now() - launched

  const paint = await win.evaluate(() => {
    const fp = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint')
    const nav = performance.getEntriesByType('navigation')[0]
    return {
      firstContentfulPaint: fp ? Math.round(fp.startTime) : null,
      domInteractive: nav ? Math.round(nav.domInteractive) : null,
      loadComplete: nav ? Math.round(nav.loadEventEnd) : null
    }
  })
  console.log('launch → header selector :', toHeader, 'ms')
  console.log('renderer paint           :', JSON.stringify(paint))

  await win.waitForTimeout(2500)

  // Section switching — this is the interaction people repeat most.
  async function switchTo(label) {
    const t = Date.now()
    await win.evaluate((l) => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        (x.textContent || '').trim().toLowerCase().startsWith(l.toLowerCase())
      )
      if (b) b.click()
    }, label)
    // Wait for a frame to actually commit.
    await win.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    return Date.now() - t
  }

  console.log('switch → Skills          :', await switchTo('Skills'), 'ms')
  console.log('switch → Plugins         :', await switchTo('Plugins'), 'ms')
  console.log('switch → MCP Servers     :', await switchTo('MCP Servers'), 'ms')

  // Into the full catalogue, then measure dropped frames while scrolling it.
  await win.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /Browse all/.test(x.textContent || ''))
    if (b) b.click()
  })
  await win.waitForTimeout(1500)

  const scroll = await win.evaluate(async () => {
    const scroller = [...document.querySelectorAll('*')].find((d) => {
      const style = getComputedStyle(d)
      return (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        d.scrollHeight > d.clientHeight + 200
      )
    })
    if (!scroller) {
      const all = [...document.querySelectorAll('*')]
        .filter((d) => d.scrollHeight > d.clientHeight + 100)
        .map((d) => `${d.tagName}.${(d.className || '').toString().slice(0, 40)}`)
      return { error: 'no scroller found', candidates: all.slice(0, 5) }
    }

    const frames = []
    let last = performance.now()
    let running = true
    const tick = (now) => {
      frames.push(now - last)
      last = now
      if (running) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    for (let i = 0; i < 40; i += 1) {
      scroller.scrollTop += 120
      await new Promise((r) => setTimeout(r, 16))
    }
    running = false
    await new Promise((r) => setTimeout(r, 100))

    const sorted = [...frames].sort((a, b) => a - b)
    const long = frames.filter((f) => f > 33).length
    return {
      frames: frames.length,
      medianMs: Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10,
      p95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
      worstMs: Math.round(sorted[sorted.length - 1]),
      framesOver33ms: long,
      percentDropped: Math.round((long / frames.length) * 100)
    }
  })
  console.log('scroll (full catalogue)  :', JSON.stringify(scroll))

  await app.close()
  fs.rmSync(dir, { recursive: true, force: true })
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
