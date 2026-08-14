import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import test from 'node:test'

test('Life Photo frozen motion and Core contracts remain present',async()=>{
  const main=await readFile(new URL('../src/app/main.js',import.meta.url),'utf8')
  const css=await readFile(new URL('../src/styles/style.css',import.meta.url),'utf8')
  assert.match(main,/CORE_TRANSITION_MS = 1050/)
  assert.match(main,/CORE_SWITCH_DELAY_MS = 900/)
  assert.match(main,/recordWorldPoint\(record/)
  assert.match(main,/el\.style\.setProperty\('--x'/)
  assert.match(main,/el\.style\.setProperty\('--y'/)
  const thumbRule=css.match(/\.life-thumb\s*\{[^}]+\}/)?.[0]??''
  assert.match(thumbRule,/aspect-ratio:4 \/ 5/)
  assert.doesNotMatch(thumbRule,/transition:[^}]*\bleft\b/)
  assert.doesNotMatch(thumbRule,/transition:[^}]*\btop\b/)
  assert.doesNotMatch(css,/#core-memory/)
})

test('only approved current renderers are present',async()=>{
  const main=await readFile(new URL('../src/app/main.js',import.meta.url),'utf8')
  assert.match(main,/createCloudObservationV2/)
  assert.match(main,/createAtmospherePhysicalV2/)
  assert.match(main,/createAuroraCinematicCurtainV7/)
  assert.doesNotMatch(main,/createAurora.*V[2-6]/)
})
