import { normalizePhotoRecord } from './photo-data-contract.js'
import { resolvePlace } from './place-catalog.js'
import { loadFounderValidationDataset } from './founder-validation-provider.js'
import { loadFixtureDataset } from './fixture-provider.js'

const LOADERS=Object.freeze({FOUNDER_VALIDATION:loadFounderValidationDataset,FIXTURE:loadFixtureDataset})

export async function createPhotoDatasetProvider({mode='FIXTURE',fetchImpl=fetch,datasetUrl=null}={}){
  const load=LOADERS[mode]
  if(!load) throw new Error(`Unsupported photo dataset mode: ${mode}`)
  const {dataset,policy}=await load({fetchImpl,datasetUrl})
  if(dataset?.schema!=='world-earth-photo-dataset-v1'||!Array.isArray(dataset.records)) throw new Error('Invalid photo dataset contract')
  const ids=new Set()
  const records=dataset.records.map((record,index)=>{
    if(!record?.id||ids.has(record.id)) throw new Error(`Photo dataset id missing or duplicated at ${index}`)
    ids.add(record.id); policy.assertMediaPath(record.src)
    return Object.freeze(normalizePhotoRecord(record,resolvePlace(record.placeId)))
  })
  return Object.freeze({mode,datasetId:dataset.id,sourcePolicy:policy.name,records:Object.freeze(records)})
}
