import { createSourcePolicy } from './source-policy.js'

export async function loadFixtureDataset({fetchImpl=fetch}={}){
  const policy=createSourcePolicy('FIXTURE')
  const path=policy.assertDatasetPath('/world-earth-homepage-v1/fixtures/fixture-dataset.json')
  const response=await fetchImpl(path,{cache:'no-store'})
  if(!response.ok) throw new Error('Fixture photo dataset unavailable; fail closed')
  const dataset=await response.json()
  for(const record of dataset.records||[]) policy.assertMediaPath(record.src)
  return {dataset,policy}
}
