export const PHOTO_GEOGRAPHIC_CONTRACT_V2A=Object.freeze({
  id:'WORLD_EARTH_LIFE_PHOTO_GEOGRAPHIC_CONTRACT_V2A',
  coordinateSystem:'WGS84',
  acceptedAccuracy:['GPS','景区','城市','人工确认'],
  acceptedProvenance:['EXIF','用户输入','地标数据库'],
  formalRule:'Every formal photo must resolve to one real captureLocation or confirmed displayLocation before Earth display.',
  noFalseOffsets:true,
  densityExperimentSeparated:true,
})

export function geographicContract({latitude,longitude,placeId,displayName,accuracy='景区',provenance='地标数据库',captureLocation=null}){
  return {
    coordinateSystem:'WGS84',
    captureLocation,
    displayLocation:{latitude,longitude,placeId,displayName},
    resolvedAnchor:captureLocation?{...captureLocation,source:'captureLocation'}:{latitude,longitude,source:'displayLocation'},
    accuracy,
    provenance,
    confirmationStatus:'confirmed',
  }
}

export function normalizePhotoRecord(record,place){
  if(!place) throw new Error(`Unknown placeId: ${record?.placeId||'missing'}`)
  const geographic=geographicContract({
    latitude:place.latitude,longitude:place.longitude,placeId:place.placeId,displayName:place.displayName,
    accuracy:record.geographicPolicy?.accuracy,provenance:record.geographicPolicy?.provenance,
    captureLocation:record.geographicPolicy?.captureLocation??null,
  })
  return {
    id:record.id,src:record.src,title:record.title??place.displayName,place:record.place??place.displayName,
    eligibleCore:record.eligibleCore===true,sensitiveText:record.sensitiveText===true,
    authorization:record.authorization,verification:record.verification,fact:record.fact===true,
    priority:record.priority,media:record.media,life:record.life,geographic,
    spatial:{status:'formal-geographic-contract-v2a',anchorType:'display-location',placeId:place.placeId,displayName:place.displayName,
      latitude:geographic.resolvedAnchor.latitude,longitude:geographic.resolvedAnchor.longitude,coordinateSystem:'WGS84',
      accuracy:geographic.accuracy,coordinateFact:true,source:geographic.provenance},
  }
}
