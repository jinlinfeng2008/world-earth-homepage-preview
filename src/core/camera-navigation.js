// ============================================================================
// Travel Earth · Run-08 · CameraNavigation (INDEPENDENT, world-space orbit)
// Real camera orbit around a FIXED world (camera moves; earth does NOT rotate).
// Does NOT modify any frozen layer (Earth/Cloud C2/Atmosphere B3/Lighting/BG).
//
// Run-08A: spherical orbit + zoom + limits + collision + reset + export/restore
//          + fixed(snap)/interactive(damped).  [applyImmediate path unchanged]
// Run-08B: velocity-based interactive FEEL — pointer drag/release inertia + wheel
//          zoom inertia with friction; real DOM handlers via attach(); F1/F2/F3
//          feel presets. Fixed-mode (applyImmediate/__accept) path is preserved.
// ============================================================================
import * as THREE from 'three'

export const FEEL_PRESETS = {
  // damping kept for Run-08A compatibility; feel uses velocity + friction
  f1: { name: 'Weighted', dragSensitivity: 0.0060, wheelSensitivity: 0.0016, friction: 8.0, releaseScale: 0.75, maxAngularVel: 3.0, stopThreshold: 0.02, zoomFriction: 12.0, zoomStep: 0.22, damping: 0.22 },
  f2: { name: 'Balanced', dragSensitivity: 0.0060, wheelSensitivity: 0.0016, friction: 4.2, releaseScale: 1.00, maxAngularVel: 4.0, stopThreshold: 0.02, zoomFriction: 7.0, zoomStep: 0.22, damping: 0.12 },
  f3: { name: 'Flowing', dragSensitivity: 0.0060, wheelSensitivity: 0.0016, friction: 2.2, releaseScale: 1.20, maxAngularVel: 5.0, stopThreshold: 0.02, zoomFriction: 4.0, zoomStep: 0.22, damping: 0.06 },
}

export function createCameraNavigation(camera, opts = {}) {
  const cfg = {
    target: opts.target ? opts.target.clone() : new THREE.Vector3(0, 0, 0),
    distance: opts.distance ?? 2.62,
    minDistance: opts.minDistance ?? 1.30,
    maxDistance: opts.maxDistance ?? 6.00,
    minSafeGap: opts.minSafeGap ?? 0.14,
    earthRadius: opts.earthRadius ?? 1.0,
    minEl: opts.minEl ?? THREE.MathUtils.degToRad(-85),
    maxEl: opts.maxEl ?? THREE.MathUtils.degToRad(85),
    damping: opts.damping ?? 0.12,
    az: opts.az ?? 0, el: opts.el ?? 0,
  }
  const collisionFloor = cfg.earthRadius + cfg.minSafeGap
  const effMin = Math.max(cfg.minDistance, collisionFloor)
  const cur = { az: cfg.az, el: cfg.el, d: cfg.distance }
  const tgt = { az: cfg.az, el: cfg.el, d: cfg.distance }
  let interactive = false
  let feel = { ...FEEL_PRESETS.f2 }

  // velocity state (interactive feel)
  const vel = { az: 0, el: 0 }
  let zoomVel = 0
  let dragging = false
  let last = { x: 0, y: 0, t: 0 }
  let teardownAttached = null

  const clampEl = (e) => Math.max(cfg.minEl, Math.min(cfg.maxEl, e))
  const clampD = (d) => Math.max(effMin, Math.min(cfg.maxDistance, d))

  function place() {
    cur.el = clampEl(cur.el); cur.d = clampD(cur.d)
    const ce = Math.cos(cur.el), se = Math.sin(cur.el), sa = Math.sin(cur.az), ca = Math.cos(cur.az)
    camera.position.set(cfg.target.x + cur.d * ce * sa, cfg.target.y + cur.d * se, cfg.target.z + cur.d * ce * ca)
    camera.up.set(0, 1, 0); camera.lookAt(cfg.target); camera.updateMatrixWorld()
  }

  const clampVel = (v) => Math.max(-feel.maxAngularVel, Math.min(feel.maxAngularVel, v))

  const api = {
    config: cfg,
    // ---- Run-08A fixed-mode API (unchanged) ----
    orbitTo(az, el, d) { tgt.az = az; tgt.el = clampEl(el); if (d !== undefined) tgt.d = clampD(d) },
    orbitBy(daz, del) { tgt.az += daz; tgt.el = clampEl(tgt.el + del) },
    zoomTo(d) { tgt.d = clampD(d) },
    zoomBy(dd) { tgt.d = clampD(tgt.d + dd) },
    update() { if (!interactive) return; const k = cfg.damping; cur.az += (tgt.az - cur.az) * k; cur.el += (tgt.el - cur.el) * k; cur.d += (tgt.d - cur.d) * k; place() },
    applyImmediate() { cur.az = tgt.az; cur.el = clampEl(tgt.el); cur.d = clampD(tgt.d); vel.az = vel.el = zoomVel = 0; place() },
    setInteractive(on) { interactive = !!on },
    reset() { tgt.az = cfg.az; tgt.el = cfg.el; tgt.d = cfg.distance; this.applyImmediate() },
    exportState() { return { az: +cur.az.toFixed(6), el: +cur.el.toFixed(6), d: +cur.d.toFixed(6), target: cfg.target.toArray() } },
    restoreState(s) { if (!s) return; tgt.az = s.az; tgt.el = clampEl(s.el); tgt.d = clampD(s.d); if (s.target) cfg.target.fromArray(s.target); this.applyImmediate() },
    state() { return { az: cur.az, el: cur.el, d: cur.d, camPos: camera.position.toArray().map(v => +v.toFixed(4)), collisionFloor, interactive, dragging, vAz: +vel.az.toFixed(4), vEl: +vel.el.toFixed(4), zoomVel: +zoomVel.toFixed(4) } },
    limits() { return { minDistance: effMin, maxDistance: cfg.maxDistance, minEl: cfg.minEl, maxEl: cfg.maxEl, collisionFloor } },

    // ---- Run-08B interactive feel ----
    setFeel(preset) { const f = typeof preset === 'string' ? FEEL_PRESETS[preset] : preset; if (f) { feel = { ...feel, ...f }; cfg.damping = feel.damping } return { ...feel } },
    getFeel() { return { ...feel } },
    pointerDown(x, y, t) { dragging = true; vel.az = vel.el = 0; last = { x, y, t } },
    pointerMove(x, y, t, sensitivityScale = 1) {
      if (!dragging) return
      const dx = x - last.x, dy = y - last.y
      const daz = -dx * feel.dragSensitivity * sensitivityScale
      const del = -dy * feel.dragSensitivity * sensitivityScale
      cur.az += daz; cur.el = clampEl(cur.el + del); place()
      const dt = Math.max((t - last.t) / 1000, 1e-3)
      vel.az = clampVel(daz / dt); vel.el = clampVel(del / dt)     // instantaneous angular velocity
      last = { x, y, t }
    },
    pointerUp() { dragging = false; vel.az = clampVel(vel.az * feel.releaseScale); vel.el = clampVel(vel.el * feel.releaseScale) },
    pinch(scale) { dragging = false; vel.az = vel.el = zoomVel = 0; cur.d = clampD(cur.d / scale); tgt.d = cur.d; place() },
    wheel(delta) { zoomVel += delta * feel.wheelSensitivity * feel.zoomStep },   // accumulate zoom velocity
    // integrate feel by real dt (seconds); returns whether still moving
    tickFeel(dt) {
      if (dragging) { return true }
      let moving = false
      // angular inertia with friction
      if (Math.abs(vel.az) > 0 || Math.abs(vel.el) > 0) {
        cur.az += vel.az * dt; cur.el = clampEl(cur.el + vel.el * dt)
        const decay = Math.exp(-feel.friction * dt)
        vel.az *= decay; vel.el *= decay
        if (Math.abs(vel.az) < feel.stopThreshold) vel.az = 0
        if (Math.abs(vel.el) < feel.stopThreshold) vel.el = 0
        moving = true
      }
      // zoom inertia
      if (Math.abs(zoomVel) > 0) {
        cur.d = clampD(cur.d + zoomVel * dt)
        zoomVel *= Math.exp(-feel.zoomFriction * dt)
        if (Math.abs(zoomVel) < 0.001) zoomVel = 0
        moving = true
      }
      if (moving) place()
      return moving
    },
    // attach real DOM pointer/wheel handlers to a canvas element
    attach(dom) {
      teardownAttached?.()
      const pointers=new Map()
      let pinchDistance=0
      const distance=()=>{const [a,b]=[...pointers.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0}
      const onPointerDown = (e) => {
        dom.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,type:e.pointerType})
        if(pointers.size===1)api.pointerDown(e.clientX,e.clientY,e.timeStamp)
        else{api.pointerUp();pinchDistance=distance()}
      }
      const onPointerMove = (e) => {
        if(!pointers.has(e.pointerId))return
        pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,type:e.pointerType})
        if(pointers.size===2){const next=distance();if(pinchDistance>0&&next>0)api.pinch(next/pinchDistance);pinchDistance=next;return}
        if(pointers.size===1)api.pointerMove(e.clientX,e.clientY,e.timeStamp,e.pointerType==='touch'?.62:1)
      }
      const end=(e)=>{
        pointers.delete(e.pointerId);pinchDistance=0;api.pointerUp()
        if(pointers.size===1){const p=[...pointers.values()][0];api.pointerDown(p.x,p.y,e.timeStamp)}
      }
      const onPointerLeave=(e)=>{
        if((e.pointerType==='touch'||e.pointerType==='pen'||pointers.has(e.pointerId)))end(e)
      }
      const onBlur=()=>{pointers.clear();pinchDistance=0;api.pointerUp()}
      const onWheel=(e)=>{ e.preventDefault(); api.wheel(e.deltaY) }
      dom.addEventListener('pointerdown', onPointerDown)
      dom.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', end)
      dom.addEventListener('pointercancel', end)
      dom.addEventListener('pointerleave', onPointerLeave)
      window.addEventListener('blur', onBlur)
      dom.addEventListener('wheel', onWheel, { passive: false })
      teardownAttached=()=>{
        dom.removeEventListener('pointerdown', onPointerDown)
        dom.removeEventListener('pointermove', onPointerMove)
        dom.removeEventListener('pointercancel', end)
        dom.removeEventListener('pointerleave', onPointerLeave)
        dom.removeEventListener('wheel', onWheel, { passive: false })
        window.removeEventListener('pointerup', end)
        window.removeEventListener('blur', onBlur)
        if(teardownAttached===teardown)teardownAttached=null
      }
      const teardown=teardownAttached
      return teardown
    },
  }
  api.applyImmediate()
  return api
}
