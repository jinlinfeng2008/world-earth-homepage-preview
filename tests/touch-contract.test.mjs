import assert from 'node:assert/strict'
import test from 'node:test'
import {createCameraNavigation} from '../src/core/camera-navigation.js'

function createFakeCamera() {
  return {
    position: {
      values: [0, 0, 0],
      set(x, y, z) { this.values = [x, y, z] },
      toArray() { return this.values },
    },
    up: {
      set() {},
    },
    lookAt() {},
    updateMatrixWorld() {},
  }
}

function createEventTarget() {
  const listeners = new Map()
  const removed = []
  return {
    listeners,
    removed,
    captures: [],
    releases: [],
    addEventListener(type, handler, options) {
      const bucket = listeners.get(type) ?? []
      bucket.push({handler, options})
      listeners.set(type, bucket)
    },
    removeEventListener(type, handler, options) {
      removed.push({type, handler, options})
      const bucket = listeners.get(type) ?? []
      listeners.set(type, bucket.filter((entry) => entry.handler !== handler))
    },
    setPointerCapture(pointerId) {
      this.captures.push(pointerId)
    },
    releasePointerCapture(pointerId) {
      this.releases.push(pointerId)
    },
    fire(type, init = {}) {
      const event = createPointerEvent(init)
      for (const {handler} of listeners.get(type) ?? []) handler(event)
      return event
    },
    count(type) {
      return listeners.get(type)?.length ?? 0
    },
  }
}

function createPointerEvent(init = {}) {
  return {
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? 'touch',
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    timeStamp: init.timeStamp ?? 0,
    deltaY: init.deltaY ?? 0,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true
    },
  }
}

function installFakeWindow() {
  const previous = globalThis.window
  const fakeWindow = createEventTarget()
  globalThis.window = fakeWindow
  return {
    fakeWindow,
    restore() {
      if (previous === undefined) delete globalThis.window
      else globalThis.window = previous
    },
  }
}

function setupNavigation(opts = {}) {
  const {fakeWindow, restore} = installFakeWindow()
  const dom = createEventTarget()
  const camera = createFakeCamera()
  const api = createCameraNavigation(camera, opts)
  const calls = []

  for (const name of ['pointerDown', 'pointerMove', 'pointerUp', 'pinch', 'wheel']) {
    const original = api[name].bind(api)
    api[name] = (...args) => {
      calls.push({name, args})
      return original(...args)
    }
  }

  const attachResult = api.attach(dom)
  return {api, calls, camera, dom, fakeWindow, attachResult, restore}
}

function withNavigation(fn, opts) {
  const ctx = setupNavigation(opts)
  try {
    return fn(ctx)
  } finally {
    ctx.restore()
  }
}

function callsNamed(calls, name) {
  return calls.filter((call) => call.name === name)
}

test('1. single-finger touch drag rotates through pointerDown, scaled pointerMove, and pointerUp', () => withNavigation(({api, calls, dom, fakeWindow}) => {
  dom.fire('pointerdown', {pointerId: 1, clientX: 100, clientY: 100, timeStamp: 10})
  dom.fire('pointermove', {pointerId: 1, clientX: 120, clientY: 110, timeStamp: 26})
  fakeWindow.fire('pointerup', {pointerId: 1, clientX: 120, clientY: 110, timeStamp: 40})

  assert.deepEqual(calls.map((call) => call.name), ['pointerDown', 'pointerMove', 'pointerUp'])
  assert.deepEqual(calls[0].args, [100, 100, 10])
  assert.deepEqual(calls[1].args, [120, 110, 26, 0.62])
  assert.equal(api.state().dragging, false)
}))

test('2. two-finger touch pinch calls pinch with distance ratio', () => withNavigation(({calls, dom}) => {
  dom.fire('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 1})
  dom.fire('pointerdown', {pointerId: 2, clientX: 0, clientY: 100, timeStamp: 2})
  dom.fire('pointermove', {pointerId: 2, clientX: 0, clientY: 150, timeStamp: 3})

  const pinchCalls = callsNamed(calls, 'pinch')
  assert.equal(pinchCalls.length, 1)
  assert.equal(pinchCalls[0].args[0], 1.5)
}))

test('3. second finger terminates active single-finger rotation', () => withNavigation(({api, calls, dom}) => {
  dom.fire('pointerdown', {pointerId: 1, clientX: 20, clientY: 20, timeStamp: 1})
  dom.fire('pointerdown', {pointerId: 2, clientX: 60, clientY: 20, timeStamp: 2})

  assert.equal(callsNamed(calls, 'pointerUp').length, 1)
  assert.equal(api.state().dragging, false)
}))

test('4. continuous pinch updates from the previous pinch distance', () => withNavigation(({calls, dom}) => {
  dom.fire('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 1})
  dom.fire('pointerdown', {pointerId: 2, clientX: 0, clientY: 100, timeStamp: 2})
  dom.fire('pointermove', {pointerId: 2, clientX: 0, clientY: 120, timeStamp: 3})
  dom.fire('pointermove', {pointerId: 2, clientX: 0, clientY: 180, timeStamp: 4})

  assert.deepEqual(callsNamed(calls, 'pinch').map((call) => call.args[0]), [1.2, 1.5])
}))

test('5. lifting one finger during pinch re-baselines remaining finger and avoids jump rotation', () => withNavigation(({calls, dom, fakeWindow}) => {
  dom.fire('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 1})
  dom.fire('pointerdown', {pointerId: 2, clientX: 60, clientY: 10, timeStamp: 2})
  fakeWindow.fire('pointerup', {pointerId: 2, clientX: 60, clientY: 10, timeStamp: 30})
  dom.fire('pointermove', {pointerId: 1, clientX: 12, clientY: 10, timeStamp: 40})

  assert.deepEqual(calls.map((call) => call.name), ['pointerDown', 'pointerUp', 'pointerUp', 'pointerDown', 'pointerMove'])
  assert.deepEqual(calls.at(-2).args, [10, 10, 30])
  assert.deepEqual(calls.at(-1).args, [12, 10, 40, 0.62])
}))

test('6. pointercancel clears active pointer and stops dragging', () => withNavigation(({api, calls, dom}) => {
  dom.fire('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 1})
  dom.fire('pointercancel', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 2})
  dom.fire('pointermove', {pointerId: 1, clientX: 20, clientY: 0, timeStamp: 3})

  assert.equal(callsNamed(calls, 'pointerUp').length, 1)
  assert.equal(callsNamed(calls, 'pointerMove').length, 0)
  assert.equal(api.state().dragging, false)
}))

test('7. pointerleave clears active pointer when touch leaves canvas', () => withNavigation(({api, calls, dom}) => {
  assert.equal(dom.count('pointerleave'), 1, 'attach(dom) must register a pointerleave cleanup handler on the canvas')
  dom.fire('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 1})
  dom.fire('pointerleave', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 2})

  assert.equal(callsNamed(calls, 'pointerUp').length, 1)
  assert.equal(api.state().dragging, false)
}))

test('8. rapid pinch-to-drag switching leaves no stale pointer state', () => withNavigation(({calls, dom, fakeWindow}) => {
  dom.fire('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 1})
  dom.fire('pointerdown', {pointerId: 2, clientX: 0, clientY: 80, timeStamp: 2})
  dom.fire('pointermove', {pointerId: 2, clientX: 0, clientY: 120, timeStamp: 3})
  fakeWindow.fire('pointerup', {pointerId: 2, clientX: 0, clientY: 120, timeStamp: 4})
  dom.fire('pointermove', {pointerId: 1, clientX: 8, clientY: 0, timeStamp: 5})
  fakeWindow.fire('pointerup', {pointerId: 1, clientX: 8, clientY: 0, timeStamp: 6})
  dom.fire('pointerdown', {pointerId: 3, clientX: 20, clientY: 20, timeStamp: 7})
  dom.fire('pointermove', {pointerId: 3, clientX: 25, clientY: 20, timeStamp: 8})

  assert.equal(callsNamed(calls, 'pinch').length, 1)
  assert.deepEqual(calls.at(-2).args, [20, 20, 7])
  assert.deepEqual(calls.at(-1).args, [25, 20, 8, 0.62])
}))

test('9. pinch zoom respects min/max distance boundaries', () => withNavigation(({api, dom}) => {
  dom.fire('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 1})
  dom.fire('pointerdown', {pointerId: 2, clientX: 0, clientY: 100, timeStamp: 2})
  dom.fire('pointermove', {pointerId: 2, clientX: 0, clientY: 100000, timeStamp: 3})
  assert.equal(api.state().d, api.limits().minDistance)

  dom.fire('pointermove', {pointerId: 2, clientX: 0, clientY: 1, timeStamp: 4})
  assert.equal(api.state().d, api.limits().maxDistance)
}))

test('10. mouse pointer drag and wheel keep desktop behavior', () => withNavigation(({calls, dom}) => {
  dom.fire('pointerdown', {pointerId: 1, pointerType: 'mouse', clientX: 10, clientY: 10, timeStamp: 1})
  dom.fire('pointermove', {pointerId: 1, pointerType: 'mouse', clientX: 12, clientY: 10, timeStamp: 2})
  const wheelEvent = dom.fire('wheel', {deltaY: 120})

  assert.deepEqual(callsNamed(calls, 'pointerMove')[0].args, [12, 10, 2, 1])
  assert.deepEqual(callsNamed(calls, 'wheel')[0].args, [120])
  assert.equal(wheelEvent.defaultPrevented, true)
}))

test('11. wheel handler prevents page scrolling and is registered non-passive', () => withNavigation(({dom}) => {
  assert.equal(dom.count('wheel'), 1)
  assert.deepEqual(dom.listeners.get('wheel')[0].options, {passive: false})
  const event = dom.fire('wheel', {deltaY: -50})
  assert.equal(event.defaultPrevented, true)
}))

test('12. attach returns a teardown that removes listeners and prevents duplicate listener leaks', () => withNavigation(({attachResult, dom, fakeWindow}) => {
  assert.equal(typeof attachResult, 'function', 'attach(dom) must return a teardown function')
  attachResult()

  assert.ok(dom.removed.length > 0, 'teardown must call dom.removeEventListener')
  assert.ok(fakeWindow.removed.length > 0, 'teardown must call window.removeEventListener')
  assert.equal(dom.count('pointerdown'), 0)
  assert.equal(dom.count('pointermove'), 0)
  assert.equal(dom.count('pointercancel'), 0)
  assert.equal(dom.count('wheel'), 0)
  assert.equal(fakeWindow.count('pointerup'), 0)
  assert.equal(fakeWindow.count('blur'), 0)
}))
