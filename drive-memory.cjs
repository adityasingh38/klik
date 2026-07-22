// Measures where Klik's memory actually goes, by launching the real app twice: once with
// the full registry cache and once without it. The delta is what the catalogue costs; the
// rest is Chromium's floor.
//
// This exists because the catalogue was assumed to be the reason Klik's total footprint is
// ~470 MB, and a trim was nearly built on that assumption. It isn't: the catalogue is a
// single-digit share, and four Chromium processes are the rest. Measure before optimising.
//
// Build first (`npm run build`), then: node drive-memory.cjs
const { _electron } = require('playwright-core')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const electronPath = require('electron')
const REAL_PROFILE = path.join(os.homedir(), 'AppData', 'Roaming', 'klikmcp')

/**
 * One launch, one reading. `seedCache` copies the real registry cache into a throwaway
 * profile — the profile is always throwaway, so the user's own Klik state is never touched.
 */
async function sample({ seedCache }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klik-mem-'))
  fs.writeFileSync(
    path.join(dir, 'preferences.json'),
    JSON.stringify({ theme: 'dark', sound: false, onboarded: true })
  )

  if (seedCache) {
    for (const file of ['registry-cache.json', 'skills-catalog.json']) {
      const src = path.join(REAL_PROFILE, file)
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, file))
    }
  }

  const app = await _electron.launch({
    executablePath: electronPath,
    args: ['.', `--user-data-dir=${dir}`]
  })
  const win = await app.firstWindow()
  await win.waitForSelector('button[aria-label*="—"]', { timeout: 60000 })
  // Let the catalogue settle before reading, or the number is of a half-built heap.
  await win.waitForTimeout(3000)

  const reading = await app.evaluate(async ({ app: electronApp }) => {
    const metrics = electronApp.getAppMetrics()
    return {
      mainHeapMB: +(process.memoryUsage().heapUsed / 1048576).toFixed(1),
      totalMB: +(
        metrics.reduce((sum, p) => sum + (p.memory?.workingSetSize ?? 0), 0) / 1024
      ).toFixed(1),
      byProcess: metrics.map((p) => ({
        type: p.type,
        mb: +((p.memory?.workingSetSize ?? 0) / 1024).toFixed(1)
      }))
    }
  })

  const servers = await win.evaluate(
    () => document.body.innerText.match(/MCP Servers\s*([\d,]+)/)?.[1] ?? '?'
  )

  await app.close()
  fs.rmSync(dir, { recursive: true, force: true })
  return { ...reading, servers }
}

;(async () => {
  // Two samples each: this machine's readings drift, so a single run proves nothing.
  const runs = []
  for (const seedCache of [true, true, false, false]) {
    const r = await sample({ seedCache })
    runs.push({ seedCache, ...r })
    const label = seedCache ? 'with cache' : 'no cache  '
    console.log(
      `${label} | servers ${String(r.servers).padStart(6)} | main heap ${String(r.mainHeapMB).padStart(5)} MB | all procs ${r.totalMB} MB`
    )
    console.log('           ', r.byProcess.map((p) => `${p.type} ${p.mb}`).join('  '))
  }

  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
  const withCache = runs.filter((r) => r.seedCache)
  const without = runs.filter((r) => !r.seedCache)
  const heapDelta = mean(withCache.map((r) => r.mainHeapMB)) - mean(without.map((r) => r.mainHeapMB))
  const totalMean = mean(withCache.map((r) => r.totalMB))

  console.log(
    `\ncatalogue costs ~${heapDelta.toFixed(1)} MB of main heap — ` +
      `${((heapDelta / totalMean) * 100).toFixed(1)}% of the ~${totalMean.toFixed(0)} MB total.`
  )
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
