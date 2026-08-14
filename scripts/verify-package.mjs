import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {lstat,readdir,readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const dataset=JSON.parse(await readFile(path.join(root,'public/datasets/founder-homepage-v1/dataset.json'),'utf8'))
const allowlist=JSON.parse(await readFile(path.join(root,'PHOTO-ALLOWLIST.json'),'utf8'))
assert.equal(dataset.records.length,159,'Dataset must contain exactly 159 records')
assert.equal(allowlist.photos.length,159,'Allowlist must contain exactly 159 photos')
const photoDir=path.join(root,'public/datasets/founder-homepage-v1/photos')
const diskPhotos=(await readdir(photoDir)).sort()
assert.equal(diskPhotos.length,159,'Photo directory must contain exactly 159 files')
assert.deepEqual(diskPhotos,[...allowlist.photos.map(photo=>photo.fileName)].sort(),'No unregistered or missing photos')
const ids=new Set()
for(const record of dataset.records){
  assert.ok(!ids.has(record.id),`Duplicate record id: ${record.id}`);ids.add(record.id)
  assert.equal(record.displayLocation.coordinateSystem,'WGS84')
  assert.ok(Number.isFinite(record.displayLocation.latitude)&&Number.isFinite(record.displayLocation.longitude))
  assert.ok(!path.isAbsolute(record.relativePath)&&!record.relativePath.includes('..'),'Photo path must stay package-relative')
  const bytes=await readFile(path.join(root,'public',record.relativePath))
  assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,`Photo hash mismatch: ${record.id}`)
}
async function inspect(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(['node_modules','dist','.git'].includes(entry.name))continue
    const file=path.join(dir,entry.name),info=await lstat(file)
    assert.equal(info.isSymbolicLink(),false,`Symlink prohibited: ${path.relative(root,file)}`)
    if(info.isDirectory())await inspect(file)
    else if(/\.(?:js|mjs|json|html|css|md|yml|yaml|nvmrc)$/i.test(file)){
      const text=await readFile(file,'utf8')
      assert.doesNotMatch(text,/\/Users\//,`Mac absolute path prohibited: ${path.relative(root,file)}`)
    }
  }
}
await inspect(root)
console.log('PACKAGE_INTEGRITY_OK records=159 photos=159 missing=0 extra=0 symlinks=0')
