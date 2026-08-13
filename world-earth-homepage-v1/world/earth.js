import * as THREE from 'three'
import { HOMEPAGE_LANDSCAPE_FROZEN_V1, selectHomepageLandscapeTier } from './landscape.js'
import { OCEAN_LANDSCAPE_V2 } from './ocean.js'

// Homepage-only Earth base. It does not modify the Run-08/CANONICAL factory.
// Cloud-free satellite surface and observed night-light source remain distinct inputs.
// All moving weather is rendered by homepage-real-clouds.js, never baked into this pass.
export async function createHomepageRealEarth({renderer,lon=102,oceanVariant='frozen-v1',landscapePalette='frozen-v1',citySampling='default'}){
  const loader=new THREE.TextureLoader()
  const landscapeTier=selectHomepageLandscapeTier(innerWidth)
  const albedo=loader.load(landscapeTier.albedo)
  albedo.colorSpace=THREE.SRGBColorSpace
  albedo.anisotropy=renderer.capabilities.getMaxAnisotropy()
  const landMask=loader.load(landscapeTier.landMask)
  landMask.colorSpace=THREE.NoColorSpace
  landMask.minFilter=THREE.LinearMipmapLinearFilter
  landMask.magFilter=THREE.LinearFilter
  landMask.anisotropy=renderer.capabilities.getMaxAnisotropy()
  const relief=loader.load(landscapeTier.relief)
  relief.colorSpace=THREE.SRGBColorSpace
  relief.anisotropy=renderer.capabilities.getMaxAnisotropy()
  const worldCover=loader.load(landscapeTier.worldCover)
  worldCover.colorSpace=THREE.NoColorSpace
  worldCover.minFilter=THREE.NearestFilter
  worldCover.magFilter=THREE.NearestFilter
  worldCover.generateMipmaps=false
  const terrainMetrics=loader.load(landscapeTier.terrain)
  terrainMetrics.colorSpace=THREE.NoColorSpace
  terrainMetrics.minFilter=THREE.NearestFilter
  terrainMetrics.magFilter=THREE.NearestFilter
  terrainMetrics.generateMipmaps=false
  const oceanV2=oceanVariant===OCEAN_LANDSCAPE_V2.id||oceanVariant==='ocean-landscape-v2'
  const orbitalNatural=landscapePalette==='orbital-natural-v1'
  const [sourceManifest,gebcoTidManifest]=await Promise.all([
    fetch('/data/homepage-complete-expression-v1/eog-vnl-2020/source-manifest.json',{cache:'no-store'}).then(response=>{
      if(!response.ok)throw new Error('Night-light source manifest unavailable')
      return response.json()
    }),
    fetch('/data/homepage-complete-expression-v1/landscape-ocean/gebco-2026-tid-runtime-manifest.json',{cache:'no-store'}).then(response=>{
      if(!response.ok)throw new Error('GEBCO TID manifest unavailable')
      return response.json()
    }),
  ])
  // A single 10K texture exceeds the 8192px limit of many phone GPUs. Both
  // tiers are derived from the same global EOG field; choosing the safe tier
  // changes sampling resolution, never geography or regional exposure.
  const maxTextureSize=renderer.capabilities.maxTextureSize
  const viewportTextureLimit=innerWidth<600?Math.min(maxTextureSize,8192):maxTextureSize
  const compatibleTiers=sourceManifest.active.tiers.filter(tier=>tier.dimensions[0]<=viewportTextureLimit)
  const tier=compatibleTiers.sort((a,b)=>b.dimensions[0]-a.dimensions[0])[0]
  if(!tier)throw new Error(`No night-light texture tier fits limit=${viewportTextureLimit}`)
  const radianceDimensions=[...tier.dimensions]
  let radiance
  if(sourceManifest.active.encoding==='linear-u16-normalized'){
    const bytes=await fetch(tier.url).then(response=>{
      if(!response.ok)throw new Error(`Formal radiance texture unavailable: ${tier.url}`)
      return response.arrayBuffer()
    })
    const expected=radianceDimensions[0]*radianceDimensions[1]*2
    if(bytes.byteLength!==expected)throw new Error(`Formal radiance byte length mismatch: expected ${expected}, got ${bytes.byteLength}`)
    radiance=new THREE.DataTexture(new Uint16Array(bytes),radianceDimensions[0],radianceDimensions[1],THREE.RedFormat,THREE.UnsignedShortType)
    radiance.flipY=true;radiance.minFilter=THREE.LinearFilter;radiance.magFilter=THREE.LinearFilter;radiance.generateMipmaps=false;radiance.needsUpdate=true
  }else{
    radiance=loader.load(tier.url)
    radiance.anisotropy=renderer.capabilities.getMaxAnisotropy()
  }
  radiance.colorSpace=THREE.NoColorSpace
  if(citySampling==='orbital-detail-v1'){
    radiance.minFilter=THREE.LinearFilter
    radiance.magFilter=THREE.LinearFilter
    radiance.generateMipmaps=false
  }
  const loadDataTexture=(url)=>{
    const texture=loader.load(url)
    texture.colorSpace=THREE.NoColorSpace
    texture.anisotropy=renderer.capabilities.getMaxAnisotropy()
    return texture
  }
  const nasaTier=maxTextureSize>=16384
    ?{id:'nasa-black-marble-2016-16k',url:'/data/homepage-complete-expression-v1/black-marble/black-marble-2016-16384x8192-gray.jpg',dimensions:[16384,8192]}
    :{id:'nasa-black-marble-2016-8k',url:'/data/homepage-complete-expression-v1/black-marble/black-marble-2016-8192x4096-gray.jpg',dimensions:[8192,4096]}
  const nasaTexture=loadDataTexture(nasaTier.url)
  const gripTexture=loadDataTexture('/data/homepage-complete-expression-v1/grip4-global-road-density.png')
  const factNetworkTexture=loadDataTexture('/data/homepage-complete-expression-v1/black-marble/black-marble-2016-fact-derived-network-5400.png')
  if(citySampling==='orbital-detail-v1'){
    factNetworkTexture.minFilter=THREE.LinearFilter
    factNetworkTexture.magFilter=THREE.LinearFilter
    factNetworkTexture.generateMipmaps=false
  }
  const LIGHTING={sunDir:new THREE.Vector3(0,0,-1)}
  const material=new THREE.ShaderMaterial({
    uniforms:{
      albedoTex:{value:albedo},landMaskTex:{value:landMask},reliefTex:{value:relief},worldCoverTex:{value:worldCover},terrainMetricsTex:{value:terrainMetrics},uReliefTexel:{value:new THREE.Vector2(1/landscapeTier.reliefDimensions[0],1/landscapeTier.reliefDimensions[1])},uTerrainTexel:{value:new THREE.Vector2(1/landscapeTier.terrainDimensions[0],1/landscapeTier.terrainDimensions[1])},sunDir:{value:LIGHTING.sunDir.clone()},
      uNightLand:{value:HOMEPAGE_LANDSCAPE_FROZEN_V1.uniforms.nightLand},uNightOcean:{value:HOMEPAGE_LANDSCAPE_FROZEN_V1.uniforms.nightOcean},uNightLift:{value:new THREE.Vector3(...HOMEPAGE_LANDSCAPE_FROZEN_V1.uniforms.nightLift)},
      uNightLandSaturation:{value:HOMEPAGE_LANDSCAPE_FROZEN_V1.uniforms.nightLandSaturation},uNightLandTint:{value:new THREE.Vector3(...HOMEPAGE_LANDSCAPE_FROZEN_V1.uniforms.nightLandTint)},
      uNightOceanDeep:{value:new THREE.Vector3(...HOMEPAGE_LANDSCAPE_FROZEN_V1.uniforms.nightOceanDeep)},uNightOceanRim:{value:new THREE.Vector3(...HOMEPAGE_LANDSCAPE_FROZEN_V1.uniforms.nightOceanRim)},
      uOceanV2:{value:oceanV2?1:0},uOceanV2Coast:{value:new THREE.Vector3(...OCEAN_LANDSCAPE_V2.colors.coast)},uOceanV2Shelf:{value:new THREE.Vector3(...OCEAN_LANDSCAPE_V2.colors.shelf)},uOceanV2Slope:{value:new THREE.Vector3(...OCEAN_LANDSCAPE_V2.colors.slope)},uOceanV2Abyss:{value:new THREE.Vector3(...OCEAN_LANDSCAPE_V2.colors.abyss)},uOceanV2Trench:{value:new THREE.Vector3(...OCEAN_LANDSCAPE_V2.colors.trench)},uOceanV2Rim:{value:new THREE.Vector3(...OCEAN_LANDSCAPE_V2.colors.rim)},
      uOrbitalNatural:{value:orbitalNatural?1:0},
    },
    vertexShader:`varying vec2 vUv;varying vec3 vN;varying vec3 vWorld;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`precision highp float;uniform sampler2D albedoTex,landMaskTex,reliefTex,worldCoverTex,terrainMetricsTex;uniform vec2 uReliefTexel,uTerrainTexel;uniform vec3 sunDir,uNightLift,uNightLandTint,uNightOceanDeep,uNightOceanRim,uOceanV2Coast,uOceanV2Shelf,uOceanV2Slope,uOceanV2Abyss,uOceanV2Trench,uOceanV2Rim;uniform float uNightLand,uNightOcean,uNightLandSaturation,uOceanV2,uOrbitalNatural;varying vec2 vUv;varying vec3 vN,vWorld;
      float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
      float worldCoverClass(float value,float code){return 1.-step(.5,abs(value-code));}
      float decodeTerrainElevation(vec4 packed){
        float encoded=packed.r*255.*256.+packed.g*255.;
        return encoded/65535.*20000.-11000.;
      }
      void main(){
        vec3 raw=texture2D(albedoTex,vUv).rgb;float l=lum(raw);
        float land=smoothstep(.42,.58,texture2D(landMaskTex,vUv).r);float ocean=1.-land;
        vec3 reliefRaw=texture2D(reliefTex,vUv).rgb;float reliefL=lum(reliefRaw);
        float reliefX0=lum(texture2D(reliefTex,vUv-vec2(uReliefTexel.x*2.,0.)).rgb);
        float reliefX1=lum(texture2D(reliefTex,vUv+vec2(uReliefTexel.x*2.,0.)).rgb);
        float reliefY0=lum(texture2D(reliefTex,vUv-vec2(0.,uReliefTexel.y*2.)).rgb);
        float reliefY1=lum(texture2D(reliefTex,vUv+vec2(0.,uReliefTexel.y*2.)).rgb);
        float reliefSlope=clamp((abs(reliefX1-reliefX0)+abs(reliefY1-reliefY0))*3.2,0.,1.);
        float localRelief=clamp((reliefL-(reliefX0+reliefX1+reliefY0+reliefY1)*.25)*3.0,-.18,.18);
        float coastNear=0.;
        coastNear=max(coastNear,abs(land-texture2D(landMaskTex,vUv+vec2(uReliefTexel.x*3.,0.)).r));
        coastNear=max(coastNear,abs(land-texture2D(landMaskTex,vUv-vec2(uReliefTexel.x*3.,0.)).r));
        coastNear=max(coastNear,abs(land-texture2D(landMaskTex,vUv+vec2(0.,uReliefTexel.y*3.)).r));
        coastNear=max(coastNear,abs(land-texture2D(landMaskTex,vUv-vec2(0.,uReliefTexel.y*3.)).r));
        coastNear=smoothstep(.06,.68,coastNear)*ocean;
        vec3 N=normalize(vN),V=normalize(cameraPosition-vWorld);float ndl=dot(N,sunDir);float day=0.,nightMask=1.;
        vec3 landDay=pow(max(raw,vec3(0.)),vec3(.92))*vec3(1.01,.99,.96)*(0.43+max(ndl,0.)*.78);
        vec3 oceanDay=mix(vec3(.005,.035,.078),vec3(.012,.135,.225),clamp(raw.b*1.45,0.,1.))*(.58+max(ndl,0.)*.78);
        vec3 H=normalize(sunDir+V);float spec=pow(max(dot(N,H),0.),92.)*smoothstep(-.04,.42,ndl);oceanDay+=vec3(.45,.70,.88)*spec*.42;
        float viewFacing=max(dot(N,V),0.);float rim=pow(1.-viewFacing,3.2);oceanDay+=vec3(.025,.12,.20)*rim*.46;
        vec3 landSource=mix(vec3(l),raw,uNightLandSaturation)*uNightLandTint;
        float wc=floor(texture2D(worldCoverTex,vUv).r*255.+.5);
        float forest=worldCoverClass(wc,10.);
        float shrub=worldCoverClass(wc,20.);
        float grass=worldCoverClass(wc,30.);
        float cropland=worldCoverClass(wc,40.);
        float built=worldCoverClass(wc,50.);
        float arid=worldCoverClass(wc,60.);
        float snow=worldCoverClass(wc,70.);
        float inlandWater=worldCoverClass(wc,80.);
        float wetland=worldCoverClass(wc,90.);
        float mangrove=worldCoverClass(wc,95.);
        float moss=worldCoverClass(wc,100.);
        float classified=clamp(forest+shrub+grass+cropland+built+arid+snow+inlandWater+wetland+mangrove+moss,0.,1.);
        float plateau=(1.-classified);
        float vegetation=clamp(forest+shrub+grass+cropland+wetland+mangrove+moss,0.,1.);
        vec3 forestColor=mix(vec3(.024,.090,.052),vec3(.021,.068,.043),uOrbitalNatural);
        vec3 shrubColor=vec3(.086,.092,.061);
        vec3 grassColor=vec3(.082,.112,.078);
        vec3 croplandColor=vec3(.112,.108,.069);
        vec3 builtColor=vec3(.105,.098,.090);
        vec3 desertColor=vec3(.185,.132,.072);
        vec3 plateauColor=vec3(.112,.102,.092);
        vec3 snowColor=vec3(.285,.330,.382);
        vec3 wetlandColor=vec3(.044,.094,.076);
        vec3 mangroveColor=vec3(.018,.074,.046);
        vec3 mossColor=vec3(.092,.105,.088);
        vec3 inlandWaterColor=vec3(.012,.052,.082);
        vec3 biome=forestColor*forest+shrubColor*shrub+grassColor*grass+croplandColor*cropland+builtColor*built+desertColor*arid+plateauColor*plateau+snowColor*snow+wetlandColor*wetland+mangroveColor*mangrove+mossColor*moss+inlandWaterColor*inlandWater;
        vec4 terrainPacked=texture2D(terrainMetricsTex,vUv);
        float terrainElevation=decodeTerrainElevation(terrainPacked);
        float terrainSlope=terrainPacked.b;
        float terrainCurvature=terrainPacked.a*2.-1.;
        float highland=smoothstep(650.,3600.,terrainElevation)*land;
        float exposedRock=clamp(arid+shrub*.22+plateau,0.,1.)*highland;
        biome=mix(biome,vec3(.118,.103,.086),exposedRock*.42);
        float terrainDetail=.78+clamp(l*.72,0.,.30)+terrainSlope*.13+terrainCurvature*.065+localRelief*.16;
        // The observed cloud-free albedo remains the dominant land signal.
        // Biome mapping only stabilizes the night palette; it does not replace
        // the photographed terrain color and embedded relief detail.
        vec3 landNight=mix(landSource*uNightLand+uNightLift,biome*terrainDetail,.50);
        // Numeric ETOPO elevation provides restrained orbital relief. The gain
        // makes real ridges and plateaus legible without displacing geometry.
        float ridgeLight=max(terrainCurvature,0.)*terrainSlope;
        float valleyShade=max(-terrainCurvature,0.)*terrainSlope;
        landNight+=vec3(.014,.013,.011)*ridgeLight*.32;
        landNight-=vec3(.010,.011,.012)*valleyShade*.22;
        landNight=mix(landNight,landNight*vec3(.93,.96,1.02),highland*.12);
        // Orbital atmospheric perspective: distant terrain loses contrast and
        // shifts slightly cooler without changing the underlying biome fact.
        float perspective=pow(1.-viewFacing,1.65);
        vec3 airColor=vec3(.070,.086,.108);
        landNight=mix(landNight,airColor,perspective*.30);
        // Moist vegetated surfaces receive a restrained cool diffuse lift.
        // This is view-dependent optical response, not a new vegetation map.
        float moisture=vegetation*(.35+.65*perspective)*(1.-smoothstep(.48,.78,l));
        landNight+=vec3(.003,.015,.007)*moisture;
        // Orbital-natural presentation: preserve WorldCover geography while
        // reducing vivid vegetation competition and adding restrained aerial
        // depth. No class boundary or terrain fact is changed.
        float orbitalVegetation=clamp(forest+mangrove+wetland*.55,0.,1.)*uOrbitalNatural;
        float landGray=lum(landNight);
        landNight=mix(landNight,vec3(landGray)*vec3(.84,.96,.89),orbitalVegetation*.18);
        landNight=mix(landNight,landNight*vec3(.94,.97,1.025),perspective*uOrbitalNatural*.10);
        float bathyBlue=clamp(reliefRaw.b-max(reliefRaw.r,reliefRaw.g)*.58,0.,1.);
        float depthProxy=clamp((.50-reliefL)*1.65+bathyBlue*.18,0.,1.);
        vec3 shelfColor=vec3(.005,.052,.098),deepColor=vec3(.0035,.025,.058),trenchColor=vec3(.0022,.015,.036);
        vec3 oceanDepth=mix(shelfColor,deepColor,smoothstep(.16,.64,depthProxy));
        oceanDepth=mix(oceanDepth,trenchColor,smoothstep(.72,.96,depthProxy));
        oceanDepth+=vec3(.002,.018,.031)*reliefSlope*.18;
        oceanDepth+=vec3(.006,.052,.073)*coastNear*.30;
        float oceanFresnel=pow(1.-viewFacing,3.0);
        vec3 oceanNight=oceanDepth+uNightOceanRim*oceanFresnel*.78;
        // Ocean Landscape V2: the frozen V1 ocean remains the default. This
        // branch derives every large-scale boundary from numeric ETOPO depth.
        // Cinematic color and optical gain make those facts legible at orbital
        // scale but never alter the coastline or invent bathymetry.
        float depthWest=decodeTerrainElevation(texture2D(terrainMetricsTex,vUv-vec2(uTerrainTexel.x*4.,0.)));
        float depthEast=decodeTerrainElevation(texture2D(terrainMetricsTex,vUv+vec2(uTerrainTexel.x*4.,0.)));
        float depthNorth=decodeTerrainElevation(texture2D(terrainMetricsTex,vUv+vec2(0.,uTerrainTexel.y*4.)));
        float depthSouth=decodeTerrainElevation(texture2D(terrainMetricsTex,vUv-vec2(0.,uTerrainTexel.y*4.)));
        float orbitalElevation=mix(terrainElevation,(terrainElevation+depthWest+depthEast+depthNorth+depthSouth)*.2,.72);
        float depthMeters=max(-orbitalElevation,0.);
        float shelfBand=smoothstep(45.,240.,depthMeters);
        float slopeBand=smoothstep(240.,2100.,depthMeters);
        float abyssBand=smoothstep(2100.,6100.,depthMeters);
        float trenchBand=smoothstep(6100.,9400.,depthMeters);
        vec3 oceanV2Color=mix(uOceanV2Coast,uOceanV2Shelf,shelfBand);
        oceanV2Color=mix(oceanV2Color,uOceanV2Slope,slopeBand);
        oceanV2Color=mix(oceanV2Color,uOceanV2Abyss,abyssBand);
        oceanV2Color=mix(oceanV2Color,uOceanV2Trench,trenchBand);
        float seafloorStructure=clamp((abs(depthEast-depthWest)+abs(depthNorth-depthSouth))/5200.,0.,1.);
        oceanV2Color+=vec3(.003,.015,.025)*seafloorStructure*.045;
        oceanV2Color+=vec3(.006,.042,.062)*coastNear*.18;
        float v2Fresnel=pow(1.-viewFacing,3.4);
        oceanV2Color+=uOceanV2Rim*v2Fresnel*.58;
        oceanNight=mix(oceanNight,oceanV2Color,uOceanV2);
        vec3 surface=mix(mix(landNight,oceanNight,ocean),mix(landDay,oceanDay,ocean),day);
        gl_FragColor=vec4(surface,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const surface=new THREE.Mesh(new THREE.SphereGeometry(1,256,192),material)
  const mesh=new THREE.Group();mesh.add(surface)
  const viewRotY=-THREE.MathUtils.degToRad(lon)-Math.PI*.5
  mesh.rotation.y=viewRotY
  const active=sourceManifest.active
  return {mesh,surface,material,radianceTexture:radiance,radianceDimensions,radianceDecodeMode:active.encoding==='linear-u16-normalized'?1:0,radianceMax:active.radianceMax,nasaTexture,nasaDimensions:nasaTier.dimensions,gripTexture,factNetworkTexture,viewRotY,LIGHTING,landscapeOcean:{frozenVersion:HOMEPAGE_LANDSCAPE_FROZEN_V1.id,oceanVariant:oceanV2?OCEAN_LANDSCAPE_V2.id:'FROZEN_V1',landscapePalette:orbitalNatural?'ORBITAL_NATURAL_V1':'FROZEN_V1',changedLayer:oceanV2?'ocean':'none',tier:landscapeTier.id,tierDimensions:{albedo:landscapeTier.albedoDimensions,landMask:landscapeTier.landMaskDimensions,relief:landscapeTier.reliefDimensions,worldCover:landscapeTier.worldCoverDimensions,terrain:landscapeTier.terrainDimensions},landMask:'Natural Earth 1:10m Land v5.1.1',landCover:'ESA WorldCover 10 m 2021 v200; official COG overview aggregated to orbital LOD',terrain:'NOAA ETOPO 2022 60 arc-second global relief; stride-5 numerical runtime aggregation',bathymetrySourceType:`${gebcoTidManifest.product}; ${gebcoTidManifest.runtimeAsset.dimensions.join('x')} orbital source-confidence asset; no visual gain`,relief:'NASA Blue Marble NG Topography and Bathymetry display composite retained only as ocean/display micro-detail proxy',status:oceanV2?'OCEAN_LANDSCAPE_V2_EXPERIMENT; V1_LAND_AND_ALL_NON_OCEAN_LAYERS_PRESERVED':'FOUNDER_APPROVED_LANDSCAPE_V1; FACT_COASTLINE_WORLDCOVER_ETOPO_AND_GEBCO_2026_TID'},nightSource:{product:active.product,url:tier.url,dimensions:radianceDimensions,tier:tier.id,radianceMapping:active.mapping,formalFact:active.factStatus==='FORMAL_FACT',factStatus:active.factStatus,nasaTier:nasaTier.id,civilizationContract:'NASA_DISPLAY_PROXY + EOG_ARTIST_PROXY + GRIP4 + FACT_DERIVED_NETWORK; GHSL_BUILTUP_AND_WSF_PENDING'},setSun(v){LIGHTING.sunDir.copy(v).normalize();material.uniforms.sunDir.value.copy(LIGHTING.sunDir)}}
}
