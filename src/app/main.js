import * as THREE from 'three'
import { createStars } from '../core/stars.js'
import { createCameraNavigation } from '../core/camera-navigation.js'
import { createPhotoDatasetProvider } from '../dataset/photo-dataset-provider.js'
import { PHOTO_GEOGRAPHIC_CONTRACT_V2A } from '../photos/photo-data-contract.js'
import { createAuroraCinematicCurtainV7 } from '../aurora/aurora.js'
import { createAtmospherePhysicalV2 } from '../atmosphere/atmosphere.js'
import { createCloudObservationV2 } from '../clouds/cloud.js'
import { createHomepageRealEarth } from '../earth/earth.js'
import { createHomepageCivilizationBoundaries } from '../earth/civilization-boundaries.js'
import { createHomepageGlobalCityLights } from '../earth/civilization-lights.js'
import { HOMEPAGE_WORLD_APPROVED_V2 } from '../earth/world-contract.js'

const query=new URLSearchParams(location.search)
const datasetMode=query.get('photoDataset')==='fixture'?'FIXTURE':'FOUNDER'
const baseUrl=import.meta.env.BASE_URL
const defaultDataset=datasetMode==='FIXTURE'?'datasets/fixture-v1/dataset.json':'datasets/founder-homepage-v1/dataset.json'
const photoDataset=await createPhotoDatasetProvider({mode:datasetMode,datasetUrl:query.get('photoDatasetUrl')||`${baseUrl}${defaultDataset}`,baseUrl})
const FORMAL_PHOTO_RECORDS=[...photoDataset.records].filter(record=>record.geographic?.confirmationStatus==='confirmed'&&record.geographic?.coordinateSystem==='WGS84')
const LIFE_RECORDS=[...FORMAL_PHOTO_RECORDS]
if(!LIFE_RECORDS.length) throw new Error('No authorized real life records; fail closed')
const CORE_ELIGIBLE_RECORDS = FORMAL_PHOTO_RECORDS.filter(record=>record.eligibleCore&&!record.sensitiveText)
if(!CORE_ELIGIBLE_RECORDS.length) throw new Error('No privacy-safe core-capable life records; fail closed')
const SPATIAL_RECORDS = [...FORMAL_PHOTO_RECORDS]

const canvas = document.querySelector('#earth-canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false, powerPreference:'high-performance' })
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.84
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x010307)
const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 100)
const portraitLayout = innerHeight > innerWidth
// Portrait composition: keep the upper limb in place while the enlarged globe continues below the viewport.
const WORLD_Y=portraitLayout?-.27:-.10
const CAMERA_TARGET_Y=portraitLayout?-.19:-.10
const world = new THREE.Group(); world.position.set(0,WORLD_Y,0); scene.add(world)

const experiment=Object.freeze({id:'WORLD_EARTH_HOMEPAGE_CROSS_PLATFORM_BASELINE_V1',oceanVariant:'OCEAN_LANDSCAPE_V2',landscapePalette:'orbital-natural-v1',civilizationPalette:'frozen-v1',cityLightQuality:'high',citySampling:'default',atmosphereVariant:'atmosphere-physical-v2',cloudVariant:'cloud-observation-v2',auroraVariant:'aurora-cinematic-curtain-v7'})
const earth = await createHomepageRealEarth({ renderer, lon:102, oceanVariant:experiment?.oceanVariant||HOMEPAGE_WORLD_APPROVED_V2.ocean.id, landscapePalette:experiment?.landscapePalette||'frozen-v1', citySampling:experiment?.citySampling||'default' })
document.documentElement.dataset.experiment=experiment?.id||HOMEPAGE_WORLD_APPROVED_V2.id
document.documentElement.dataset.approvalStatus=HOMEPAGE_WORLD_APPROVED_V2.status
document.documentElement.dataset.nightSource=earth.nightSource.product
document.documentElement.dataset.nightTier=earth.nightSource.tier
document.documentElement.dataset.nightDimensions=earth.nightSource.dimensions.join('x')
world.add(earth.mesh)
const clouds = createCloudObservationV2({renderer,sunDir:earth.LIGHTING.sunDir})
clouds.setView(earth.viewRotY, 0); world.add(clouds.pivot)
const atmosphere = createAtmospherePhysicalV2({sunDir:earth.LIGHTING.sunDir,cameraPosition:camera.position})
atmosphere.setView(earth.viewRotY, 0); world.add(atmosphere.pivot)
const civilizationBoundaries=await createHomepageCivilizationBoundaries({sunDir:earth.LIGHTING.sunDir,viewRotY:earth.viewRotY})
world.add(civilizationBoundaries.mesh)
const aurora = await createAuroraCinematicCurtainV7()
aurora.setView(earth.viewRotY,0);world.add(aurora.pivot)
const stars = createStars(); stars.setGain(.68); scene.add(stars.mesh)
const globalCityLights=createHomepageGlobalCityLights({renderer,radianceTexture:earth.radianceTexture,radianceDimensions:earth.radianceDimensions,radianceDecodeMode:earth.radianceDecodeMode,radianceMax:earth.radianceMax,nasaTexture:earth.nasaTexture,nasaDimensions:earth.nasaDimensions,gripTexture:earth.gripTexture,factNetworkTexture:earth.factNetworkTexture,cloudTexture:clouds.texture,width:innerWidth,height:innerHeight,quality:experiment?.cityLightQuality||(innerWidth<600?'mid':'high'),palette:experiment?.civilizationPalette||'frozen-v1'})
globalCityLights.setView(earth.viewRotY,WORLD_Y)
const cityLightStats=globalCityLights.stats()
document.documentElement.dataset.cityLightPoints=String(cityLightStats.pointSources)
document.documentElement.dataset.cityLightVboBytes=String(cityLightStats.pointVboBytes)
document.documentElement.dataset.cityLightRenderSize=cityLightStats.renderSize.join('x')
document.documentElement.dataset.cityLightCalibration=cityLightStats.calibrationStatus

let width=0, height=0
const navigation = createCameraNavigation(camera, { target:new THREE.Vector3(0,CAMERA_TARGET_Y,0), distance:portraitLayout?5.16:4.05, minDistance:portraitLayout?4.90:3.25, maxDistance:portraitLayout?8.4:6.2, az:0, el:0, damping:.10 })
navigation.setInteractive(true); navigation.setFeel('f1'); navigation.attach(canvas)
let userPaused = false
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
let autoMotion = !reducedMotion
let spin = 0
const LIFE_VIEW_PRESETS = Object.freeze({
  asia: { lon: 104, lat: 31, label: 'Asia' },
  europe: { lon: 14, lat: 48, label: 'Europe' },
  northAmerica: { lon: -98, lat: 38, label: 'North America' },
})
const lifeViewParam = new URLSearchParams(location.search).get('lifeView')
const lifeViewPreset = LIFE_VIEW_PRESETS[lifeViewParam] || null
if(lifeViewPreset){
  spin = THREE.MathUtils.degToRad(102 - lifeViewPreset.lon)
  userPaused = true
  autoMotion = false
}
let last = performance.now()
let lastRendered=0
let perfWindowStart=last,perfFrames=0
let destroyed=false,frameHandle=0
let currentCoreId = null
let previousCoreId = null
let pendingCoreId = null
let pendingCoreSince = 0
let manualReadingUntil = 0
let coreTransitionStart = 0
const CORE_TRANSITION_MS = 1050
const CORE_SWITCH_DELAY_MS = 900

function resize(){
  width=innerWidth; height=innerHeight
  renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix()
  stars.resize(width,height)
  globalCityLights.resize(width,height)
}
addEventListener('resize',resize); resize()

const thumbLayer=document.querySelector('#thumbnail-layer')
const thumbEls=SPATIAL_RECORDS.map((record)=>{
  const button=document.createElement('button'); button.className='life-thumb'; button.type='button'; button.dataset.id=record.id; button.setAttribute('aria-label',`${record.title}，${record.life.meaning}，${record.spatial.displayName}`)
  button.dataset.behind='true'; button.dataset.coreState='thumbnail'
  const img=document.createElement('img'); img.src=record.src; img.alt=''; button.append(img)
  button.addEventListener('click',()=>{ if(record.eligibleCore&&!record.sensitiveText) setCoreState(record.id,true); else { userPaused=true; manualReadingUntil=performance.now()+12000; syncMotionButton() } }); thumbLayer.append(button); return button
})
function setCoreState(recordId,pauseForReading=false){
  if(!recordId||recordId===currentCoreId) return
  previousCoreId=currentCoreId
  currentCoreId=recordId
  coreTransitionStart=performance.now()
  if(pauseForReading){ userPaused=true; manualReadingUntil=performance.now()+12000; syncMotionButton() }
}

function geoPoint(lat,lon,radius=1.045){
  const phi=THREE.MathUtils.degToRad(90-lat), theta=THREE.MathUtils.degToRad(lon+180)
  return new THREE.Vector3(-radius*Math.sin(phi)*Math.cos(theta), radius*Math.cos(phi), radius*Math.sin(phi)*Math.sin(theta))
}
function realGeographicAnchor(record){
  const anchor=record.geographic?.resolvedAnchor
  if(!anchor||record.geographic?.coordinateSystem!=='WGS84'||record.geographic?.confirmationStatus!=='confirmed') return null
  return anchor
}
const projected=new THREE.Vector3(), worldPoint=new THREE.Vector3(), viewFromCenter=new THREE.Vector3(), localView=new THREE.Vector3()
const yAxis=new THREE.Vector3(0,1,0)
function recordWorldPoint(record,radius=1.045){
  const anchor=realGeographicAnchor(record)
  if(!anchor) throw new Error(`Formal photo missing confirmed WGS84 anchor: ${record.id}`)
  return geoPoint(anchor.latitude,anchor.longitude,radius).applyAxisAngle(yAxis,earth.viewRotY+spin).add(world.position)
}
function cameraFocus(){
  viewFromCenter.copy(camera.position).sub(world.position).normalize()
  localView.copy(viewFromCenter).applyAxisAngle(yAxis,-(earth.viewRotY+spin))
  const latitude=THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(localView.y,-1,1)))
  const theta=THREE.MathUtils.radToDeg(Math.atan2(localView.z,-localView.x))
  const longitude=THREE.MathUtils.euclideanModulo(theta-180+180,360)-180
  return {latitude,longitude}
}
function spatialState(record){
  worldPoint.copy(recordWorldPoint(record))
  viewFromCenter.copy(camera.position).sub(world.position).normalize()
  const surfaceDirection=worldPoint.clone().sub(world.position).normalize()
  const facing=surfaceDirection.dot(viewFromCenter)
  projected.copy(worldPoint).project(camera)
  const inFrame=Math.abs(projected.x)<.93&&Math.abs(projected.y)<.90
  const focusDistance=Math.hypot(projected.x,projected.y)
  return {facing,inFrame,focusDistance,x:projected.x,y:projected.y,score:facing-focusDistance*.18}
}
function cinematicWeightFor(record,state){
  if(state.facing<=0||!state.inFrame) return 0
  const frontWeight=THREE.MathUtils.smoothstep(state.facing,.02,.82)
  const centerWeight=1-THREE.MathUtils.smoothstep(state.focusDistance,.12,.96)
  const holdWeight=record.id===currentCoreId?0.16:0
  return THREE.MathUtils.clamp(frontWeight*.46+centerWeight*.54+holdWeight,0,1)
}
function coreScore(record,state){
  if(!record.eligibleCore||record.sensitiveText||state.facing<=.03||!state.inFrame) return -Infinity
  const frontWeight=THREE.MathUtils.smoothstep(state.facing,.04,.86)
  const centerWeight=1-THREE.MathUtils.smoothstep(state.focusDistance,.10,.92)
  const hold=record.id===currentCoreId?0.16:0
  return frontWeight*.38+centerWeight*.62+hold
}
function chooseCoreFromCandidates(candidates,now){
  if(now<manualReadingUntil) return
  const ranked=candidates
    .filter(item=>item.record.eligibleCore&&!item.record.sensitiveText)
    .map(item=>({...item,coreScore:coreScore(item.record,item.state)}))
    .filter(item=>item.coreScore>-Infinity)
    .sort((a,b)=>b.coreScore-a.coreScore)
  if(!ranked.length){ pendingCoreId=null; return }
  const best=ranked[0]
  if(!currentCoreId){ setCoreState(best.record.id,false); return }
  if(best.record.id===currentCoreId){ pendingCoreId=null; return }
  const currentRecord=SPATIAL_RECORDS.find(record=>record.id===currentCoreId)
  const currentScore=currentRecord?coreScore(currentRecord,spatialState(currentRecord)):-Infinity
  if(best.coreScore<currentScore+.10){ pendingCoreId=null; return }
  if(best.record.id!==pendingCoreId){ pendingCoreId=best.record.id; pendingCoreSince=now; return }
  if(now-pendingCoreSince<CORE_SWITCH_DELAY_MS) return
  pendingCoreId=null
  setCoreState(best.record.id,false)
}
function placeThumbnails(){
  const now=performance.now()
  const candidates=SPATIAL_RECORDS.map((record,i)=>({record,i,state:spatialState(record)}))
    .filter(item=>item.state.facing>.015&&item.state.inFrame)
    .sort((a,b)=>b.state.score-a.state.score||(b.record.priority||40)-(a.record.priority||40))
  chooseCoreFromCandidates(candidates,now)
  const accepted=[], minGap=width<600?8:14, maxVisible=width<600?108:128
  for(const item of candidates){
    const px=(item.state.x*.5+.5)*width,py=(-item.state.y*.5+.5)*height
    const isCore=item.record.id===currentCoreId
    const isReceding=item.record.id===previousCoreId&&now-coreTransitionStart<CORE_TRANSITION_MS
    if(accepted.length>=maxVisible&&!isCore&&!isReceding) continue
    if(!isCore&&!isReceding&&accepted.some(p=>Math.hypot(p.x-px,p.y-py)<minGap)) continue
    accepted.push({x:px,y:py,i:item.i,state:item.state})
  }
  const visible=new Map(accepted.map(item=>[item.i,item]))
  let coreVisible=false
  const transitionProgress=THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((now-coreTransitionStart)/CORE_TRANSITION_MS,0,1),0,1)
  SPATIAL_RECORDS.forEach((record,i)=>{
    const item=visible.get(i), el=thumbEls[i]
    if(!item){el.dataset.behind='true';el.dataset.coreState='thumbnail';return}
    const isCore=record.id===currentCoreId
    const isReceding=record.id===previousCoreId
    const targetWeight=cinematicWeightFor(record,item.state)
    const weight=isCore?targetWeight*transitionProgress:isReceding&&now-coreTransitionStart<CORE_TRANSITION_MS?targetWeight*(1-transitionProgress):0
    const scale=.74+Math.max(0,item.state.facing)*.20+weight*(width<600?3.05:3.65)
    el.style.setProperty('--x',`${item.x}px`);el.style.setProperty('--y',`${item.y}px`)
    el.style.setProperty('--scale',String(scale))
    el.style.setProperty('--tilt',`${((record.priority||30)%9)-4}deg`)
    el.style.setProperty('--core-weight',String(weight))
    el.style.setProperty('--anchor-glow',String(.12+weight*.88))
    el.dataset.behind='false'
    el.dataset.coreState=isCore?'core':weight>.18?'emerging':isReceding?'receding':'thumbnail'
    if(isCore) coreVisible=true
  })
  document.documentElement.dataset.lifeVisibleThumbs=String(accepted.length)
  document.documentElement.dataset.lifeDynamicCore=coreVisible&&currentCoreId?'1':'0'
}

const motionButton=document.querySelector('#motion-toggle')
function syncMotionButton(){ const stopped=userPaused||reducedMotion; motionButton.textContent=stopped?'▶':'Ⅱ'; motionButton.setAttribute('aria-pressed',String(stopped)); motionButton.title=stopped?'继续世界':'暂停世界' }
motionButton.addEventListener('click',()=>{ userPaused=!userPaused; autoMotion=!userPaused&&!reducedMotion; syncMotionButton() })
function stepMemory(direction){
  const currentRecord=SPATIAL_RECORDS.find(record=>record.id===currentCoreId)
  const samePlace=SPATIAL_RECORDS.filter(record=>record.spatial.placeId===currentRecord?.spatial?.placeId)
  const pool=samePlace.length>1?samePlace:SPATIAL_RECORDS
  const current=Math.max(0,pool.findIndex(record=>record.id===currentCoreId))
  setCoreState(pool[(current+direction+pool.length)%pool.length].id,true)
}
document.querySelector('#previous-memory').addEventListener('click',()=>stepMemory(-1))
document.querySelector('#next-memory').addEventListener('click',()=>stepMemory(1))
const provenanceButton=document.querySelector('#provenance-toggle'), provenance=document.querySelector('#provenance')
provenanceButton.addEventListener('click',()=>{ const open=provenance.hidden; provenance.hidden=!open; provenanceButton.setAttribute('aria-expanded',String(open)); if(open){userPaused=true;syncMotionButton()} })
syncMotionButton()

function render(now){
  if(destroyed) return
  // A paused or reduced-motion homepage must also release GPU time. The world
  // remains interactive at 15 fps, while normal motion retains full cadence.
  if((userPaused||reducedMotion)&&now-lastRendered<1000/15){frameHandle=requestAnimationFrame(render);return}
  lastRendered=now
  perfFrames++
  if(now-perfWindowStart>=1000){document.documentElement.dataset.runtimeFps=String(Math.round(perfFrames*1000/(now-perfWindowStart)));perfFrames=0;perfWindowStart=now}
  const dt=Math.min((now-last)/1000,.05); last=now
  navigation.tickFeel(dt)
  if(autoMotion&&!userPaused){ spin+=dt*.018 }
  earth.mesh.rotation.y=earth.viewRotY+spin; clouds.setView(earth.viewRotY+spin,0); clouds.spin(now*.001); civilizationBoundaries.setView(earth.viewRotY+spin); atmosphere.pivot.rotation.y=spin; aurora.setView(earth.viewRotY+spin,0);aurora.update(now*.001)
  atmosphere.setCam(camera.position); placeThumbnails(); renderer.render(scene,camera); globalCityLights.setView(earth.viewRotY+spin,WORLD_Y); globalCityLights.setCameraDistance(camera.position.distanceTo(world.position)); globalCityLights.setCloudOffset(now*.001*clouds.driftRate/(Math.PI*2)); globalCityLights.render(camera); frameHandle=requestAnimationFrame(render)
}

Promise.all(LIFE_RECORDS.map(r=>new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src=r.src}))).then(()=>document.querySelector('#world').classList.add('ready'))
frameHandle=requestAnimationFrame(render)

window.__homepageV1={
  ready:true, contract:PHOTO_GEOGRAPHIC_CONTRACT_V2A.id, canonical:false, photoDatasetMode:datasetMode, photoDatasetId:photoDataset.datasetId,
  facts:{photos:'formal-records-require-confirmed-wgs84-anchor; density-records-experiment-only',locations:'real-wgs84-displayLocation-or-captureLocation-no-screen-offsets',civilization:'nasa-black-marble-and-eog-artist-visual-proxy-formal-linear-radiance-and-builtup-contract-pending',boundaries:'natural-earth-admin0-cartographic-context',cityFabric:'global-observed-support-plus-grip-structure-no-point-cloud-no-regional-gain',landscapeOcean:earth.landscapeOcean},
  geographicContract:PHOTO_GEOGRAPHIC_CONTRACT_V2A,
  state:()=>({paused:userPaused,reducedMotion,currentCoreId,previousCoreId,pendingCoreId,records:LIFE_RECORDS.length,spatialRecords:SPATIAL_RECORDS.length,coreEligibleRecords:CORE_ELIGIBLE_RECORDS.length,visibleThumbs:Number(document.documentElement.dataset.lifeVisibleThumbs||0),dynamicCore:Number(document.documentElement.dataset.lifeDynamicCore||0),spin,lifeView:lifeViewPreset?.label||'auto',selectionMode:'single-identity-photo-cinematic-state-real-wgs84',cameraFocus:cameraFocus(),activeAnchor:currentCoreId?realGeographicAnchor(SPATIAL_RECORDS.find(record=>record.id===currentCoreId)):null,clouds:clouds.state(),atmosphere:atmosphere.state(),aurora:aurora.state(),nightSource:earth.nightSource}),
  selectMemory:(id)=>setCoreState(SPATIAL_RECORDS.find(record=>record.id===id)?.id,true), pause(){userPaused=true;syncMotionButton()}, resume(){if(!reducedMotion){userPaused=false;autoMotion=true;syncMotionButton()}},
  setSpinForLon(lon){spin=THREE.MathUtils.degToRad(102-lon);userPaused=false;autoMotion=false;syncMotionButton()},
  destroy(){destroyed=true;cancelAnimationFrame(frameHandle);removeEventListener('resize',resize);renderer.dispose();thumbLayer.replaceChildren()},
  perf:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,programs:renderer.info.programs?.length??null,globalCityLights:globalCityLights.stats(),boundaries:civilizationBoundaries.stats})
}
console.info('[world-earth-homepage-complete-v1] runtime ready')
