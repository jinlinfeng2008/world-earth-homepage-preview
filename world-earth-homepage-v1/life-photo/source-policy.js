const POLICIES=Object.freeze({
  LOCAL_PRIVATE:Object.freeze({datasetPrefixes:['/_private/homepage/'],mediaPrefixes:['/_private/homepage/global-thumbs/']}),
  FIXTURE:Object.freeze({datasetPrefixes:['./fixtures/','/world-earth-homepage-v1/fixtures/'],mediaPrefixes:['./fixtures/media/','/world-earth-homepage-v1/fixtures/media/']}),
})

function allowed(value,prefixes){
  return typeof value==='string'&&!value.includes('..')&&!/^[a-z][a-z\d+.-]*:/i.test(value)&&prefixes.some(prefix=>value.startsWith(prefix))
}

export function createSourcePolicy(name){
  const policy=POLICIES[name]
  if(!policy) throw new Error(`Unsupported photo source policy: ${name}`)
  return Object.freeze({
    name,
    assertDatasetPath(path){if(!allowed(path,policy.datasetPrefixes))throw new Error(`Dataset source rejected by ${name}`);return path},
    assertMediaPath(path){if(!allowed(path,policy.mediaPrefixes))throw new Error(`Photo source rejected by ${name}`);return path},
  })
}
