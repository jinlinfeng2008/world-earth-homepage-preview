import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createPhotoDatasetProvider } from '../life-photo/photo-dataset-provider.js'

const fixtureUrl=new URL('../fixtures/fixture-dataset.json',import.meta.url)
const fixtureFetch=async path=>{
  assert.equal(path,'/world-earth-homepage-v1/fixtures/fixture-dataset.json')
  return {ok:true,json:async()=>JSON.parse(await readFile(fixtureUrl,'utf8'))}
}

test('fixture supplies confirmed WGS84 formal records without private sources',async()=>{
  const provider=await createPhotoDatasetProvider({mode:'FIXTURE',fetchImpl:fixtureFetch})
  assert.equal(provider.sourcePolicy,'FIXTURE')
  assert.equal(provider.records.length,6)
  assert.equal(provider.records.filter(record=>record.geographic.confirmationStatus==='confirmed').length,6)
  assert.equal(provider.records.filter(record=>record.geographic.coordinateSystem==='WGS84').length,6)
  assert.equal(provider.records.filter(record=>record.eligibleCore&&!record.sensitiveText).length,6)
  assert.equal(provider.records.some(record=>record.src.startsWith('/_private/')),false)
})

test('Founder mode fails closed without an explicit external dataset URL',async()=>{
  await assert.rejects(createPhotoDatasetProvider({mode:'FOUNDER_VALIDATION',fetchImpl:fixtureFetch}),/External Founder photo dataset URL is required/)
})
