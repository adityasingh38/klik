// Where the time goes between launching Klik and being able to use it.
//
// Reports a breakdown rather than one number, and takes several samples, because
// readings on this machine drift far enough that a single run supports whichever
// conclusion you started with.
//
// Build first (`npm run build`), then: node drive-startup.cjs
const { _electron } = require('playwright-core')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const electronPath = require('electron')
const REAL_PROFILE = path.join(os.homedir(), 'AppData', 'Roaming', 'klikmcp')
const SAMPLES = Number(process.env.SAMPLES ?? 3)

async function sample() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klik-start-'))
  fs.writeFileSync(
    path.join(dir, 'preferences.json'),
    JSON.stringify({ theme: 'dark', sound: false, onboarded: true })
  )
  // The real caches, so this measures the launch a returning user actually gets.
  for (const f of ['registry-cache.json', 'skills-catalog.json']) {
    const src = path.join(REAL_PROFILE, f)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, f))
  }

  const marks = {}
  const t0 = Date.now()
  const app = await _electron.launch({
    executablePath: electronPath,
    args: ['.', `--user-data-dir=${dir}`],
    env: { ...process.env, KLIK_PERF: '1' }
  })
  app.process().stdout?.on('data', (b) => {
    for (const line of b.toString().split('\n')) {
      const m = line.match(/\[perf\]\s+(\w+)\s+(\d+)/)
      if (m) marks[m[1]] = Number(m[2])
    }
  })

  const win = await app.firstWindow()
  marks.firstWindow = Date.now() - t0

  await win.waitForSelector('header', { timeout: 60000 })
  marks.shell = Date.now() - t0

  // The moment the app is actually usable: real cards, not skeletons.
  await win.waitForFunction(() => document.querySelectorAll('button[aria-label*="—"]').length > 0, {
    timeout: 60000
  })
  marks.cards = Date.now() - t0

  await app.close()
  fs.rmSync(dir, { recursive: true, force: true })
  return marks
}

;(async () => {
  const runs = []
  for (let i = 0; i < SAMPLES; i++) {
    const m = await sample()
    runs.push(m)
    console.log(
      `run ${i + 1}: ready ${m.whenReady ?? '?'}  window ${m.windowCreated ?? '?'}  ` +
        `firstWindow ${m.firstWindow}  shell ${m.shell}  CARDS ${m.cards}  (ms)`
    )
  }

  const stat = (key) => {
    const xs = runs.map((r) => r[key]).filter((x) => typeof x === 'number')
    if (xs.length === 0) return '—'
    const sorted = [...xs].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    return `${median}  (${Math.min(...xs)}–${Math.max(...xs)})`
  }

  console.log('\nmedian (min–max) across', runs.length, 'runs, ms:')
  for (const key of ['whenReady', 'windowCreated', 'firstWindow', 'shell', 'cards']) {
    console.log(`  ${key.padEnd(14)} ${stat(key)}`)
  }
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
