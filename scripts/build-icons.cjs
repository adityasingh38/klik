// Rasterises brand/klik-mark.svg into the PNG electron-builder turns into the Windows
// .ico and macOS .icns. Klik shipped with the default Electron icon because no icon was
// ever configured — the mark existed only inside the running app.
//
// Rendering happens in Electron's own Chromium, which is already a dependency, rather
// than pulling in an image toolchain for one file.
const { _electron } = require('playwright-core')
const path = require('node:path')
const fs = require('node:fs')

const electronPath = require('electron')
const ROOT = path.join(__dirname, '..')
const SVG = path.join(ROOT, 'brand', 'klik-mark.svg')
const OUT_DIR = path.join(ROOT, 'build')
const SIZES = [512, 256, 128, 64, 32, 16]

;(async () => {
  const svg = fs.readFileSync(SVG, 'utf-8')
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const app = await _electron.launch({ executablePath: electronPath, args: ['.'] })
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')

  for (const size of SIZES) {
    const dataUrl = await win.evaluate(
      async ({ markup, px }) => {
        const blobUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
        const image = new Image()
        await new Promise((resolve, reject) => {
          image.onload = resolve
          image.onerror = () => reject(new Error('svg failed to decode'))
          image.src = blobUrl
        })
        const canvas = document.createElement('canvas')
        canvas.width = px
        canvas.height = px
        const ctx = canvas.getContext('2d')
        ctx.drawImage(image, 0, 0, px, px)
        return canvas.toDataURL('image/png')
      },
      { markup: svg, px: size }
    )

    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64')
    const name = size === 512 ? 'icon.png' : `icon-${size}.png`
    fs.writeFileSync(path.join(OUT_DIR, name), buffer)
    console.log('wrote build/' + name, `(${buffer.length} bytes)`)
  }

  await app.close()
})().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
