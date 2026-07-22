// Script parse+evaluate cost inside the renderer, which is far less exposed to OS
// scheduling and disk cache than wall-clock startup. This is the number minification
// actually moves.
const { _electron } = require('playwright-core')
const path=require('node:path'), fs=require('node:fs'), os=require('node:os')
const electronPath = require('electron')
const REAL = path.join(os.homedir(),'AppData','Roaming','klikmcp')
const SAMPLES = Number(process.env.SAMPLES ?? 5)
async function sample(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'klik-parse-'))
  fs.writeFileSync(path.join(dir,'preferences.json'),JSON.stringify({theme:'dark',sound:false,onboarded:true}))
  for(const f of ['registry-cache.json','skills-catalog.json']){
    const s=path.join(REAL,f); if(fs.existsSync(s)) fs.copyFileSync(s,path.join(dir,f))
  }
  const app=await _electron.launch({executablePath:electronPath,args:['.',`--user-data-dir=${dir}`]})
  const win=await app.firstWindow()
  await win.waitForSelector('header',{timeout:60000})
  const m=await win.evaluate(()=>{
    const res=performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.js'))
    const nav=performance.getEntriesByType('navigation')[0]
    return {
      bytes: res.reduce((s,r)=>s+(r.decodedBodySize||0),0),
      scriptMs: +res.reduce((s,r)=>s+r.duration,0).toFixed(1),
      domContentLoaded: nav? +nav.domContentLoadedEventEnd.toFixed(1):null,
      domInteractive: nav? +nav.domInteractive.toFixed(1):null
    }
  })
  await app.close(); fs.rmSync(dir,{recursive:true,force:true})
  return m
}
;(async()=>{
  const runs=[]
  for(let i=0;i<SAMPLES;i++){ const m=await sample(); runs.push(m)
    console.log(`run ${i+1}: js ${(m.bytes/1024).toFixed(0)} kB | script ${m.scriptMs} ms | domInteractive ${m.domInteractive} ms | DCL ${m.domContentLoaded} ms`) }
  const med=k=>{const x=runs.map(r=>r[k]).filter(v=>typeof v==='number').sort((a,b)=>a-b);return x[Math.floor(x.length/2)]}
  console.log(`\nmedian: js ${(med('bytes')/1024).toFixed(0)} kB | script ${med('scriptMs')} ms | domInteractive ${med('domInteractive')} ms | DCL ${med('domContentLoaded')} ms`)
})().catch(e=>{console.error('FAILED',e.message);process.exit(1)})
