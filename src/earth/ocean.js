export const OCEAN_LANDSCAPE_V2 = Object.freeze({
  id: 'OCEAN_LANDSCAPE_V2_FIRST_SCREEN',
  base: 'LANDSCAPE_V1_FOUNDER_APPROVED_2026-08-09',
  changedLayer: 'ocean',
  factualInputs: Object.freeze([
    'Natural Earth 1:10m land/ocean mask',
    'NOAA ETOPO 2022 numeric depth',
    'GEBCO_2026 TID source category',
  ]),
  depthMeters: Object.freeze({ coast: 0, shelf: 200, slope: 2000, abyss: 6000, trench: 9000 }),
  colors: Object.freeze({
    coast: Object.freeze([0.007, 0.070, 0.120]),
    shelf: Object.freeze([0.005, 0.050, 0.094]),
    slope: Object.freeze([0.0035, 0.035, 0.073]),
    abyss: Object.freeze([0.0025, 0.024, 0.057]),
    trench: Object.freeze([0.0018, 0.017, 0.041]),
    rim: Object.freeze([0.014, 0.078, 0.132]),
  }),
  optics: Object.freeze({ fresnelPower: 3.4, fresnelGain: 0.58, terrainStructureGain: 0.045, coastGain: 0.18 }),
})
