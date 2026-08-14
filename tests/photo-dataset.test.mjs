import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import test from 'node:test'

globalThis.location=new URL('http://127.0.0.1:4173/')
const {createPhotoDatasetProvider}=await import('../src/dataset/photo-dataset-provider.js')
const root=new URL('../public/',import.meta.url)
const fetchImpl=async url=>{
  const parsed=new URL(url)
  const file=new URL(parsed.pathname.slice(1),root)
  return {ok:true,status:200,json:async()=>JSON.parse(await readFile(file,'utf8'))}
}

test('Founder and Fixture use the same provider and formal WGS84 contract',async()=>{
  const founder=await createPhotoDatasetProvider({mode:'FOUNDER',datasetUrl:'datasets/founder-homepage-v1/dataset.json',baseUrl:'/',fetchImpl})
  const fixture=await createPhotoDatasetProvider({mode:'FIXTURE',datasetUrl:'datasets/fixture-v1/dataset.json',baseUrl:'/',fetchImpl})
  assert.equal(founder.records.length,159)
  assert.equal(fixture.records.length,6)
  for(const record of [...founder.records,...fixture.records]){
    assert.equal(record.geographic.coordinateSystem,'WGS84')
    assert.equal(record.geographic.confirmationStatus,'confirmed')
  }
})
