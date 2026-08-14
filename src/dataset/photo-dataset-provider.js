import { normalizePhotoRecord } from '../photos/photo-data-contract.js'
import { resolvePlace } from '../photos/place-catalog.js'

function runtimeUrl(value,baseUrl){
  if(typeof value!=='string'||!value||value.includes('..')||/^data:|^javascript:/i.test(value)) throw new Error('Unsafe dataset path')
  return new URL(value,new URL(baseUrl,location.href)).href
}

export async function createPhotoDatasetProvider({mode='FOUNDER',datasetUrl,baseUrl=import.meta.env.BASE_URL,fetchImpl=fetch}={}){
  if(!datasetUrl) throw new Error('Photo dataset URL is required; fail closed')
  const response=await fetchImpl(runtimeUrl(datasetUrl,baseUrl),{cache:'no-store'})
  if(!response.ok) throw new Error(`Photo dataset unavailable: ${response.status}`)
  const dataset=await response.json()
  if(dataset?.schema!=='world-earth-photo-dataset-v1'||!Array.isArray(dataset.records)) throw new Error('Invalid photo dataset contract')
  const ids=new Set()
  const records=dataset.records.map((record,index)=>{
    if(!record?.id||ids.has(record.id)) throw new Error(`Photo dataset id missing or duplicated at ${index}`)
    ids.add(record.id)
    return Object.freeze(normalizePhotoRecord({...record,src:runtimeUrl(record.src,baseUrl)},resolvePlace(record.placeId)))
  })
  return Object.freeze({mode,datasetId:dataset.id,records:Object.freeze(records)})
}
