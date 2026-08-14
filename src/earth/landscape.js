// Founder-approved Landscape Layer, 2026-08-09.
// New visual tuning must create a new version rather than editing this contract.
export const HOMEPAGE_LANDSCAPE_FROZEN_V1=Object.freeze({
  id:'LANDSCAPE_V1_FOUNDER_APPROVED_2026-08-09',
  mobileBreakpoint:600,
  desktop:Object.freeze({
    albedo:'textures/earth-blue-marble-cloudless-4k.jpg',
    albedoDimensions:[4096,2048],
    landMask:'data/homepage-complete-expression-v1/landscape-ocean/natural-earth-land-mask-8192x4096.png',
    landMaskDimensions:[8192,4096],
    relief:'data/homepage-complete-expression-v1/landscape-ocean/nasa-topography-bathymetry-8192x4096.jpg',
    reliefDimensions:[8192,4096],
    worldCover:'data/homepage-complete-expression-v1/landscape-ocean/esa-worldcover-2021-v200-4096x2048.png',
    worldCoverDimensions:[4096,2048],
    terrain:'data/homepage-complete-expression-v1/landscape-ocean/noaa-etopo-2022-terrain-4096x2048.png',
    terrainDimensions:[4096,2048],
  }),
  mobile:Object.freeze({
    albedo:'data/homepage-complete-expression-v1/landscape-ocean/surface-albedo-2048x1024.jpg',
    albedoDimensions:[2048,1024],
    landMask:'data/homepage-complete-expression-v1/landscape-ocean/natural-earth-land-mask-4096x2048.png',
    landMaskDimensions:[4096,2048],
    relief:'data/homepage-complete-expression-v1/landscape-ocean/nasa-topography-bathymetry-4096x2048.jpg',
    reliefDimensions:[4096,2048],
    worldCover:'data/homepage-complete-expression-v1/landscape-ocean/esa-worldcover-2021-v200-2048x1024.png',
    worldCoverDimensions:[2048,1024],
    terrain:'data/homepage-complete-expression-v1/landscape-ocean/noaa-etopo-2022-terrain-2048x1024.png',
    terrainDimensions:[2048,1024],
  }),
  uniforms:Object.freeze({
    nightLand:.105,
    nightOcean:.040,
    nightLift:[.014,.024,.040],
    nightLandSaturation:1,
    nightLandTint:[1,1,1],
    nightOceanDeep:[.003,.018,.042],
    nightOceanRim:[.012,.055,.095],
  }),
  immutableLayers:'civilization,ocean-color,cloud,atmosphere,aurora,photos,camera,composition',
})

export function selectHomepageLandscapeTier(viewportWidth){
  return viewportWidth<=HOMEPAGE_LANDSCAPE_FROZEN_V1.mobileBreakpoint
    ?{id:'mobile-orbital',...HOMEPAGE_LANDSCAPE_FROZEN_V1.mobile}
    :{id:'desktop-orbital',...HOMEPAGE_LANDSCAPE_FROZEN_V1.desktop}
}
