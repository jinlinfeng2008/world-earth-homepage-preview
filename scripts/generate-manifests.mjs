import {createHash} from 'node:crypto'
import {lstat,readdir,readFile,stat,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const sourceCommit='a7aff758370cbfef09c7c65cca3cf2658883e7f8'
const generatedAt=new Date().toISOString()
const ignored=new Set(['node_modules','dist','.git','world-earth-homepage-complete-v1.zip'])
const manifestNames=new Set(['FREEZE-MANIFEST.json','PHOTO-ALLOWLIST.json','ASSET-MANIFEST.json'])

async function walk(dir){
  const entries=await readdir(dir,{withFileTypes:true}),files=[]
  for(const entry of entries){
    if(ignored.has(entry.name))continue
    const absolute=path.join(dir,entry.name)
    if(entry.isDirectory())files.push(...await walk(absolute))
    else if(entry.isFile())files.push(absolute)
  }
  return files
}
async function fingerprint(file){
  const bytes=await readFile(file)
  return {path:path.relative(root,file).split(path.sep).join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}
}

const datasetPath=path.join(root,'public/datasets/founder-homepage-v1/dataset.json')
const dataset=JSON.parse(await readFile(datasetPath,'utf8'))
const photos=[]
for(const record of dataset.records){
  const file=path.join(root,'public',record.relativePath)
  const fp=await fingerprint(file)
  photos.push({id:record.id,fileName:record.fileName,originalFileName:record.originalFileName,relativePath:record.relativePath,width:record.width,height:record.height,sha256:fp.sha256,bytes:fp.bytes,sortOrder:record.sortOrder})
}
await writeFile(path.join(root,'PHOTO-ALLOWLIST.json'),JSON.stringify({schema:'world-earth-photo-allowlist-v1',generatedAt,datasetId:dataset.id,recordCount:dataset.records.length,photoFileCount:photos.length,photos},null,2)+'\n')

const publicFiles=(await walk(path.join(root,'public'))).filter(file=>!file.includes(`${path.sep}datasets${path.sep}founder-homepage-v1${path.sep}photos${path.sep}`))
const assets=await Promise.all(publicFiles.map(fingerprint))
await writeFile(path.join(root,'ASSET-MANIFEST.json'),JSON.stringify({schema:'world-earth-asset-manifest-v1',generatedAt,count:assets.length,assets},null,2)+'\n')

const all=(await walk(root)).filter(file=>!manifestNames.has(path.basename(file)))
const files=await Promise.all(all.map(fingerprint))
const totalBytes=files.reduce((sum,file)=>sum+file.bytes,0)
await writeFile(path.join(root,'FREEZE-MANIFEST.json'),JSON.stringify({schema:'world-earth-freeze-manifest-v1',version:'WORLD_EARTH_HOMEPAGE_CROSS_PLATFORM_BASELINE_V1',generatedAt,sourceCommit,node:'20.x',packageManager:'npm',fingerprintRule:'SHA-256 over raw file bytes; generated manifests excluded from their own file list; node_modules, dist, .git and ZIP excluded',fileCount:files.length,totalBytes,photoCount:photos.length,datasetRecordCount:dataset.records.length,datasetSha256:(await fingerprint(datasetPath)).sha256,files},null,2)+'\n')
