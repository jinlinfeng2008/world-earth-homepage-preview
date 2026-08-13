import { HOMEPAGE_LANDSCAPE_FROZEN_V1 } from './landscape.js'
import { OCEAN_LANDSCAPE_V2 } from './ocean.js'

// Founder approved 2026-08-09. This immutable combined runtime contract
// preserves the original Landscape V1 record and replaces only its ocean
// presentation with the approved Ocean Landscape V2 implementation.
// Organizational FROZEN status becomes effective only after Technical
// Architect review and the required Git commit.
export const HOMEPAGE_WORLD_APPROVED_V2 = Object.freeze({
  id: 'HOMEPAGE_LANDSCAPE_V1_OCEAN_V2_FOUNDER_APPROVED_2026-08-09',
  status: 'FOUNDER_APPROVED_PENDING_TECH_ARCHITECT_REVIEW_AND_GIT',
  founderApprovedAt: '2026-08-09',
  landscape: HOMEPAGE_LANDSCAPE_FROZEN_V1,
  ocean: OCEAN_LANDSCAPE_V2,
  replacement: Object.freeze({ from: 'FROZEN_V1_OCEAN', to: OCEAN_LANDSCAPE_V2.id }),
  unchangedLayers: 'landscape,civilization,cloud,atmosphere,aurora,photos,camera,composition,controls',
})
