import assert from 'node:assert/strict'
import { readdir,readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root=fileURLToPath(new URL('../',import.meta.url))
async function sourceFiles(dir){
  const entries=await readdir(dir,{withFileTypes:true})
  const nested=await Promise.all(entries.map(entry=>entry.isDirectory()?sourceFiles(path.join(dir,entry.name)):[path.join(dir,entry.name)]))
  return nested.flat().filter(file=>/\.(?:html|css|js|mjs|json|md)$/.test(file))
}

test('clean extraction has no copied private assets, density experiment, or legacy renderers',async()=>{
  const files=await sourceFiles(root)
  const relative=files.map(file=>path.relative(root,file))
  assert.equal(relative.some(file=>file.startsWith('_private/')),false)
  assert.equal(relative.some(file=>/density-experiment/.test(file)),false)
  assert.equal(relative.some(file=>/aurora.*v[2-6]|cloud.*v1|atmosphere.*v1/i.test(file)),false)

  const runtimeFiles=files.filter(file=>!file.includes(`${path.sep}tests${path.sep}`)&&!file.endsWith('README.md'))
  const source=(await Promise.all(runtimeFiles.map(file=>readFile(file,'utf8')))).join('\n')
  assert.equal(source.includes('id="core-memory"'),false)
  assert.equal(source.includes("querySelector('#core-memory')"),false)
  assert.equal(source.includes('leader-line'),false)

  const css=await readFile(path.join(root,'style.css'),'utf8')
  const thumbRule=css.match(/\.life-thumb\s*\{[^}]+\}/)?.[0]??''
  assert.notEqual(thumbRule,'')
  assert.doesNotMatch(thumbRule,/border-radius:\s*50%/)
})

test('runtime imports only the approved current world variants',async()=>{
  const main=await readFile(path.join(root,'main.js'),'utf8')
  assert.match(main,/createCloudObservationV2/)
  assert.match(main,/createAtmospherePhysicalV2/)
  assert.match(main,/createAuroraCinematicCurtainV7/)
  assert.doesNotMatch(main,/createAurora.*V[2-6]/)
})
