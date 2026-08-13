// Layer 02 — Stars（星点层）
// 全部参数来自参考图实测（2026-07-27 星点检测，见 docs/v1-acceptance/layer02）：
// - 可见天空总密度 9.28 颗/万px；区域不均匀：左上7.12 / 上中6.41 / 右上3.13 /
//   左中27.82 / 右中2.92（IDW 密度场复刻该构图关系）
// - 尺寸分级实测占比 S 74% / M 14% / L 12%
// - 亮度（峰值-背景）：S 28–80 / M 80–170 / L 170–255，中位 45
// - 色温：冷白偏蓝；静态图无闪烁/运动证据 → 星点静止
// - 位置由固定种子哈希决定：刷新构图不变；网格 + 抖动避免规则感
// - 密度按 CSS 像素计算，与 DPR 无关；画幅变化时保持归一化构图关系
import * as THREE from 'three'

// 参考图测得的区域密度控制点（归一化坐标 + 密度/万px）
// 控制点 d 值 = 实测区域密度 × 校准系数（IDW 区域均值欠冲 + 检测损失，
// 依 canvas 真像素复测标定，使各区实测密度回到参考图数值）
const DENSITY_POINTS = [
  { u: 0.116, v: 0.093, d: 2.0 },
  { u: 0.503, v: 0.065, d: 3.5 },
  { u: 0.901, v: 0.156, d: 1.9 },
  { u: 0.287, v: 0.187, d: 52.0 },
  { u: 0.76, v: 0.149, d: 3.1 },
]
const DEFAULT_DENSITY = 5.4
const CELL = 30 // CSS px 网格；每格由哈希决定是否生成星点
const SEED = 20260727

function hash(ix, iy, k) {
  // murmur3 终混合，避免弱哈希在小整数键上的分布偏置
  let h = (Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(k, 0x9e3779b9) ^ SEED) | 0
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

function densityAt(u, v) {
  // IDW 插值 + 背景均值项，复刻参考图的空间密度分布
  let wsum = 0.35
  let dsum = DEFAULT_DENSITY * 0.35
  for (const p of DENSITY_POINTS) {
    const dist2 = (u - p.u) * (u - p.u) + (v - p.v) * (v - p.v)
    const w = 1 / (dist2 + 0.01)
    wsum += w
    dsum += w * p.d
  }
  return dsum / wsum
}

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uDpr;
  varying float vAlpha;
  varying float vSize;

  void main() {
    vAlpha = aAlpha;
    vSize = aSize * uDpr;
    // 星点钉在远平面附近（NDC z≈1）：透视深度非线性，地球片元深度≈0.9，
    // 星点必须比它更远才能被正确遮挡
    gl_Position = vec4(position.xy, 0.9999, 1.0);
    gl_PointSize = vSize;
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uGain;          // global star recession (Stage A.1: stars → far background)
  varying float vAlpha;
  varying float vSize;

  void main() {
    // 参考图中 S/M 星是 1px 级硬像素（峰值即亮度值，无光晕）：
    // 小点(≤2.5 设备px)直接输出硬像素，避免径向衰减吃掉中心亮度；
    // 大点(L)用亮核 + 短软边，与参考图亮星的 2–3px 形态一致。
    float a = vAlpha;
    if (vSize > 2.5) {
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c) * 2.0;
      a *= smoothstep(1.0, 0.35, d);
    }
    // 实测星点色温：冷白偏蓝
    vec3 color = vec3(0.86, 0.90, 1.0);
    gl_FragColor = vec4(color, a * uGain);
  }
`

function buildGeometry(width, height) {
  const positions = []
  const sizes = []
  const alphas = []
  const cols = Math.ceil(width / CELL)
  const rows = Math.ceil(height / CELL)
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const u = (ix + 0.5) / cols
      const v = (iy + 0.5) / rows
      // 每格期望星数 = 密度 × 格面积 / 10000
      const expect = (densityAt(u, v) * CELL * CELL) / 10000
      const count = hash(ix, iy, 1) < expect % 1 ? Math.ceil(expect) : Math.floor(expect)
      for (let k = 0; k < count; k++) {
        const x = (ix + hash(ix, iy, 2 + k * 7)) * CELL
        const y = (iy + hash(ix, iy, 3 + k * 7)) * CELL
        if (x >= width || y >= height) continue
        const r = hash(ix, iy, 4 + k * 7)
        // 亮度分布对齐参考图实测（峰-背差中位45 / P90 85 / max 204）：
        // 参考图的"大星"多为宽而暗的星斑，真正高亮星仅约 2%
        let size, alpha
        if (r < 0.74) {
          // 细小暗星（S）：1px 级，28–80
          size = 1.0 + hash(ix, iy, 5 + k * 7) * 0.4
          alpha = 0.14 + hash(ix, iy, 6 + k * 7) * 0.17
        } else if (r < 0.9) {
          // 普通星点（M）：55–96
          size = 1.4 + hash(ix, iy, 5 + k * 7) * 0.6
          alpha = 0.24 + hash(ix, iy, 6 + k * 7) * 0.18
        } else if (r < 0.98) {
          // 宽而暗的星斑（L-dim）：46–126
          size = 2.0 + hash(ix, iy, 5 + k * 7) * 0.6
          alpha = 0.2 + hash(ix, iy, 6 + k * 7) * 0.35
        } else {
          // 高亮星（L-bright，约2%）：150–230
          size = 2.2 + hash(ix, iy, 5 + k * 7) * 0.8
          alpha = 0.65 + hash(ix, iy, 6 + k * 7) * 0.35
        }
        positions.push((x / width) * 2 - 1, -((y / height) * 2 - 1), 0)
        sizes.push(size)
        alphas.push(alpha)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))
  geo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alphas, 1))
  return geo
}

export function createStars() {
  const material = new THREE.ShaderMaterial({
    uniforms: { uDpr: { value: Math.min(window.devicePixelRatio, 2) }, uGain: { value: 1.0 } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    // 星点位于 NDC z=0（远平面侧），开启深度测试后被更近的地球体自然遮挡
    // ——对应参考图实测"星点被地球/UI遮挡"的事实（Layer 03 接入时启用）
    depthTest: true,
    blending: THREE.AdditiveBlending,
  })
  let geometry = buildGeometry(window.innerWidth, window.innerHeight)
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = -90 // 在 Universe(-100) 之上，后续层之下

  return {
    mesh: points,
    material,
    setGain(v) { material.uniforms.uGain.value = v },
    update() {}, // 静态：参考图为静态图，无闪烁/运动证据
    resize(width, height) {
      geometry.dispose()
      geometry = buildGeometry(width, height)
      points.geometry = geometry
      material.uniforms.uDpr.value = Math.min(window.devicePixelRatio, 2)
    },
  }
}
