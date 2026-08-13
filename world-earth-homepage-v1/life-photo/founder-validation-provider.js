import { createSourcePolicy } from './source-policy.js'

export async function loadFounderValidationDataset({fetchImpl=fetch,datasetUrl}={}){
  const policy=createSourcePolicy('LOCAL_PRIVATE')
  if(!datasetUrl) throw new Error('External Founder photo dataset URL is required; fail closed')
  const path=policy.assertDatasetPath(datasetUrl)
  const response=await fetchImpl(path,{cache:'no-store'})
  if(!response.ok) throw new Error('Founder validation photo dataset unavailable; fail closed')
  const dataset=await response.json()
  for(const record of dataset.records||[]) policy.assertMediaPath(record.src)
  return {dataset,policy}
}
