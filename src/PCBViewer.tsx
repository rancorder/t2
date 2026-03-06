/**
 * PCBViewer.tsx — T² Laboratory
 * Three.js high-fidelity AI Edge PCB visualizer
 *
 * FIXES:
 * - position readonly: すべて .set() / .copy() に統一 (Object.assignを廃止)
 * - pixelRatio: Math.min(devicePixelRatio, 2) 固定
 * - Manhattan particles 600個
 * - CPU ripple演出
 * - AI推論デモフロー
 * - OrbitControls: import from three/examples
 */
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

// ─── Types ────────────────────────────────────────────────
interface ManhattanParticle {
  seg: number
  t: number
  speed: number
  from: THREE.Vector3
  to: THREE.Vector3
  vertices: THREE.Vector3[]
  vi: number
  color: THREE.Color
  size: number
}
interface RippleUniform { mat: THREE.ShaderMaterial; cpuPos: THREE.Vector3 }
interface AIDemo {
  phase: number; timer: number; detected: boolean
  boxMat?: THREE.ShaderMaterial; scanMat?: THREE.ShaderMaterial; labelMesh?: THREE.Mesh
}
interface State {
  renderer?: THREE.WebGLRenderer; scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; controls?: OrbitControls
  ledLights: Array<{ light: THREE.PointLight; phase: number }>
  particles: ManhattanParticle[]
  ptGeo?: THREE.BufferGeometry; ptPos?: Float32Array; ptCol?: Float32Array; ptSz?: Float32Array
  ripples: RippleUniform[]
  aiDemo: AIDemo
  time: number; rid?: number
}

// ─── Constants ────────────────────────────────────────────
const BW = 4.0, BD = 3.6, BH = 0.08, Y0 = BH / 2
const CPU_POS = new THREE.Vector3(-0.18, Y0 + 0.04, 0.12)

// ─── Material helpers ─────────────────────────────────────
const mp = (c: number, r: number, mt: number): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt })

const darkPkg = () => mp(0x0c0c10, 0.85, 0.05)
const copper  = () => mp(0xb87333, 0.25, 0.9)
const pcbGreen = () => mp(0x0a2a1a, 0.82, 0.08)

// ─── PCB Board ────────────────────────────────────────────
function buildBoard(scene: THREE.Scene, s: State) {
  const root = new THREE.Group()
  scene.add(root)

  // ── Board substrate ──
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(BW, BH, BD),
    new THREE.MeshStandardMaterial({ color: 0x0b2218, roughness: 0.8, metalness: 0.05 })
  )
  // FIX: use .set() instead of direct assignment (position is readonly)
  board.position.set(0, 0, 0)
  board.receiveShadow = true
  root.add(board)

  // ── PCB surface traces ──
  const traceM = new THREE.MeshStandardMaterial({ color: 0x2a6b3a, roughness: 0.6, metalness: 0.1 })
  for (let i = 0; i < 24; i++) {
    const isH = i % 2 === 0
    const geo = new THREE.BoxGeometry(isH ? BW - 0.2 : 0.012, 0.003, isH ? 0.012 : BD - 0.2)
    const trace = new THREE.Mesh(geo, traceM)
    const spreadVals = { x: isH ? 0 : -BW / 2 + 0.1 + (i % 12) * ((BW - 0.2) / 11), z: isH ? -BD / 2 + 0.1 + Math.floor(i / 2) * ((BD - 0.2) / 11) : 0 }
    trace.position.set(spreadVals.x, Y0 + 0.003, spreadVals.z)
    root.add(trace)
  }

  // ── CPU/SoC ──
  cpu(root)

  // ── RAM (LPDDR) ──
  lpddr(root, 0.88, 0.58)
  lpddr(root, 0.88, -0.58)

  // ── PMIC ──
  pmic(root)

  // ── Connectors ──
  usbC(root)
  sdSlot(root)
  ffcConn(root)
  header40pin(root)

  // ── SOT/passives ──
  passives(root)

  // ── LEDs ──
  buildLEDs(root, s)

  // ── Copper pour ──
  copperPour(root)
}

function cpu(root: THREE.Group) {
  const g = new THREE.Group()
  g.position.copy(CPU_POS)     // FIX: .copy() instead of direct assign
  g.position.y = Y0
  root.add(g)

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.072, 0.68), darkPkg())
  body.position.set(0, 0.036, 0)
  body.castShadow = true
  g.add(body)

  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.01, 0.62), mp(0x1c1c22, 0.12, 0.9))
  lid.position.set(0, 0.074, 0)
  g.add(lid)

  // Markings
  const notch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.06), mp(0xffffff, 0.9, 0.0))
  notch.position.set(-0.26, 0.074, -0.26)
  g.add(notch)

  // BGA balls
  const bm = mp(0xb8b8b8, 0.18, 0.92)
  for (let xi = -5; xi <= 5; xi++) {
    for (let zi = -5; zi <= 5; zi++) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), bm)
      ball.position.set(xi * 0.054, 0.008, zi * 0.054)
      g.add(ball)
    }
  }

  // Decoupling caps
  dcaps(root)
}

function dcaps(root: THREE.Group) {
  const dcM = mp(0x303030, 0.8, 0.1)
  const dcE = mp(0xc8a060, 0.2, 0.9)
  const dcPos: [number, number][] = [
    [0, -0.72], [0, 0.72], [-0.38, 0.88], [0.38, 0.88], [-0.38, -0.88], [0.38, -0.88],
    [-0.88, 0.38], [0.88, 0.38], [-0.88, -0.38], [0.88, -0.38],
    [-0.55, 0.88], [0.55, 0.88], [-0.55, -0.88], [0.55, -0.88],
    [-0.88, 0], [-0.72, 0.38], [0.72, 0.38], [0.72, -0.38],
  ]
  dcPos.forEach(([dx, dz]) => {
    const wx = CPU_POS.x + dx, wz = CPU_POS.z + dz
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.048, 0.03), dcM.clone())
    // FIX: .set() not direct assignment
    cb.position.set(wx, Y0 + 0.024, wz)
    root.add(cb)
    ;[-1, 1].forEach(side => {
      const ce = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.048, 0.03), dcE.clone())
      ce.position.set(wx + side * 0.033, Y0 + 0.024, wz)
      root.add(ce)
    })
  })
}

function lpddr(root: THREE.Group, x: number, z: number) {
  const g = new THREE.Group()
  g.position.set(x, Y0, z)    // FIX: .set()
  root.add(g)

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.058, 0.7), darkPkg())
  body.position.set(0, 0.029, 0)
  body.castShadow = true
  g.add(body)

  const ihs = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.016, 0.64), mp(0x1c1c22, 0.12, 0.88))
  ihs.position.set(0, 0.065, 0)
  g.add(ihs)

  const bm = mp(0xb8b8b8, 0.18, 0.92)
  for (let xi = -5; xi <= 5; xi++) {
    for (let zi = -3; zi <= 3; zi++) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), bm)
      ball.position.set(xi * 0.082, 0.007, zi * 0.082)
      g.add(ball)
    }
  }
}

function pmic(root: THREE.Group) {
  const g = new THREE.Group()
  g.position.set(-1.12, Y0, -0.82)   // FIX: .set()
  root.add(g)

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.062, 0.58), darkPkg())
  body.position.set(0, 0.031, 0)
  g.add(body)

  const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.01, 0.5), mp(0x222222, 0.5, 0.4))
  top.position.set(0, 0.066, 0)
  g.add(top)
}

function usbC(root: THREE.Group) {
  const usbShell = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.48), mp(0x2a2a2e, 0.3, 0.85))
  usbShell.position.set(-0.35, Y0 + 0.1, -BD / 2 - 0.18)   // FIX: .set()
  root.add(usbShell)

  const usbPort = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.06), mp(0x080810, 0.9, 0.1))
  usbPort.position.set(-0.35, Y0 + 0.1, -BD / 2 - 0.42)
  root.add(usbPort)
}

function sdSlot(root: THREE.Group) {
  const sd = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.56), mp(0x888888, 0.18, 0.88))
  sd.position.set(0.55, Y0 + 0.07, -BD / 2 - 0.18)   // FIX: .set()
  root.add(sd)
}

function ffcConn(root: THREE.Group) {
  const ffc = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.24), mp(0x1a1a1a, 0.8, 0.1))
  ffc.position.set(0, Y0 + 0.05, BD / 2 + 0.02)   // FIX: .set()
  root.add(ffc)

  for (let i = 0; i < 18; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.01, 0.2), copper())
    c.position.set(-0.58 + i * 0.065, Y0 + 0.002, BD / 2 + 0.02)
    root.add(c)
  }
}

function header40pin(root: THREE.Group) {
  const hdr = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 2.0), mp(0x0d0d0d, 0.9, 0.05))
  hdr.position.set(1.6, Y0 + 0.12, 0)   // FIX: .set()
  root.add(hdr)

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 20; col++) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.34, 6), mp(0xd0c060, 0.2, 0.95))
      pin.position.set(1.6 + (row - 0.5) * 0.12, Y0 + 0.0, -0.95 + col * 0.1)
      root.add(pin)
    }
  }
}

function passives(root: THREE.Group) {
  const positions: [number, number, number][] = [
    [-0.5, Y0 + 0.02, 1.4],[-0.3, Y0 + 0.02, 1.4],[0.0, Y0 + 0.02, 1.4],
    [0.3, Y0 + 0.02, 1.4],[0.5, Y0 + 0.02, 1.4],[0.7, Y0 + 0.02, 1.4],
    [-1.2, Y0 + 0.02, 0.8],[-1.2, Y0 + 0.02, 0.5],[-1.2, Y0 + 0.02, 0.2],
    [-1.2, Y0 + 0.02, -0.2],[-1.2, Y0 + 0.02, -0.5],
    [1.0, Y0 + 0.02, -1.0],[1.0, Y0 + 0.02, -0.8],[1.0, Y0 + 0.02, -0.6],
    [1.2, Y0 + 0.02, 0.8],[1.2, Y0 + 0.02, 0.5],[1.2, Y0 + 0.02, 0.2],
  ]
  const cm = mp(0x2a2a2a, 0.85, 0.05)
  const em = mp(0xc8a060, 0.2, 0.9)
  positions.forEach(([px, py, pz]) => {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), cm)
    cap.position.set(px, py, pz)   // FIX: .set()
    root.add(cap)
    ;[-1, 1].forEach(side => {
      const end = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.04), em)
      end.position.set(px + side * 0.036, py, pz)
      root.add(end)
    })
  })
}

function buildLEDs(root: THREE.Group, s: State) {
  const ledConfigs = [
    { pos: new THREE.Vector3(-1.55, Y0 + 0.015, 1.3), color: 0x00ff44, phase: 0.0 },
    { pos: new THREE.Vector3(-1.55, Y0 + 0.015, 1.1), color: 0xff4400, phase: 1.2 },
    { pos: new THREE.Vector3(-1.55, Y0 + 0.015, 0.9), color: 0x0088ff, phase: 2.4 },
  ]
  ledConfigs.forEach(cfg => {
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.04), mp(cfg.color, 0.3, 0.0))
    led.position.copy(cfg.pos)    // FIX: .copy() for Vector3 assignment
    root.add(led)
    const light = new THREE.PointLight(cfg.color, 0.3, 0.8)
    light.position.copy(cfg.pos)  // FIX: .copy()
    light.position.y += 0.05
    root.add(light)
    s.ledLights.push({ light, phase: cfg.phase })
  })
}

function copperPour(root: THREE.Group) {
  const pourGeo = new THREE.BoxGeometry(BW - 0.3, 0.001, BD - 0.3)
  const pour = new THREE.Mesh(pourGeo, new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.35, metalness: 0.85, opacity: 0.35, transparent: true }))
  pour.position.set(0, Y0 + 0.001, 0)   // FIX: .set()
  root.add(pour)
}

// ─── Manhattan Particles ──────────────────────────────────
function buildManhattanParticles(scene: THREE.Scene, s: State) {
  const COUNT = 600
  const ptPos = new Float32Array(COUNT * 3)
  const ptCol = new Float32Array(COUNT * 3)
  const ptSz  = new Float32Array(COUNT)

  const palette = [
    new THREE.Color(0xe8000f), new THREE.Color(0x00aaff),
    new THREE.Color(0x00ff88), new THREE.Color(0xff8800),
    new THREE.Color(0xffffff),
  ]

  // Manhattan-style routing vertices on board surface
  const routeVertices: THREE.Vector3[] = []
  const xs = [-1.6, -1.0, -0.4, 0.2, 0.8, 1.4]
  const zs = [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5]
  xs.forEach(x => zs.forEach(z => routeVertices.push(new THREE.Vector3(x, Y0 + 0.004, z))))

  s.particles = Array.from({ length: COUNT }, () => {
    const from = routeVertices[Math.floor(Math.random() * routeVertices.length)].clone()
    const to   = routeVertices[Math.floor(Math.random() * routeVertices.length)].clone()
    const mid  = new THREE.Vector3(to.x, from.y, from.z)
    return {
      seg: 0, t: Math.random(), speed: 0.3 + Math.random() * 0.7,
      from: from.clone(), to: mid,
      vertices: [from, mid, to], vi: 1,
      color: palette[Math.floor(Math.random() * palette.length)].clone(),
      size: 0.012 + Math.random() * 0.02,
    }
  })

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(ptCol, 3))
  geo.setAttribute('size',     new THREE.BufferAttribute(ptSz,  1))

  const mat = new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 1.0 } },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        gl_FragColor = vec4(vColor, (1.0 - d * d) * 0.9);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })

  scene.add(new THREE.Points(geo, mat))
  s.ptGeo = geo; s.ptPos = ptPos; s.ptCol = ptCol; s.ptSz = ptSz
}

function updateManhattanParticles(dt: number, s: State) {
  if (!s.ptPos || !s.ptCol || !s.ptSz) return
  s.particles.forEach((p, i) => {
    p.t += p.speed * dt
    if (p.t >= 1.0) {
      p.t -= 1.0
      p.from.copy(p.to)
      p.vi++
      if (p.vi >= p.vertices.length) {
        // Reset to new route
        const routeXs = [-1.6, -1.0, -0.4, 0.2, 0.8, 1.4]
        const routeZs = [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5]
        const newFrom = new THREE.Vector3(
          routeXs[Math.floor(Math.random() * routeXs.length)], Y0 + 0.004,
          routeZs[Math.floor(Math.random() * routeZs.length)]
        )
        const newTo = new THREE.Vector3(
          routeXs[Math.floor(Math.random() * routeXs.length)], Y0 + 0.004,
          routeZs[Math.floor(Math.random() * routeZs.length)]
        )
        const newMid = new THREE.Vector3(newTo.x, newFrom.y, newFrom.z)
        p.vertices = [newFrom, newMid, newTo]
        p.vi = 1
        p.from.copy(newFrom)
      }
      p.to.copy(p.vertices[p.vi])
    }
    // FIX: use lerpVectors (no direct assignment) instead of Object.assign
    const pos = new THREE.Vector3().lerpVectors(p.from, p.to, p.t)
    const base = i * 3
    s.ptPos![base]     = pos.x
    s.ptPos![base + 1] = pos.y
    s.ptPos![base + 2] = pos.z
    s.ptCol![base]     = p.color.r
    s.ptCol![base + 1] = p.color.g
    s.ptCol![base + 2] = p.color.b
    s.ptSz![i]         = p.size
  })
  const geo = s.ptGeo!
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
  const colAttr = geo.getAttribute('color')    as THREE.BufferAttribute
  const szAttr  = geo.getAttribute('size')     as THREE.BufferAttribute
  posAttr.needsUpdate = true
  colAttr.needsUpdate = true
  szAttr.needsUpdate  = true
}

// ─── CPU Ripple ───────────────────────────────────────────
function buildAIDemo(scene: THREE.Scene, s: State) {
  // Ripple ring on board surface (CPU position)
  const rippleMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      cpuPos: { value: CPU_POS.clone() },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float time;
      uniform vec3 cpuPos;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv - 0.5;
        float d = length(uv) * 2.0;
        float wave = sin(d * 12.0 - time * 3.0) * exp(-d * 2.5);
        float alpha = clamp(wave * 0.35, 0.0, 0.4);
        gl_FragColor = vec4(0.91, 0.0, 0.06, alpha);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  })
  const ripplePlane = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8, 1, 1), rippleMat)
  ripplePlane.rotation.x = -Math.PI / 2
  ripplePlane.position.set(CPU_POS.x, Y0 + 0.005, CPU_POS.z)   // FIX: .set()
  scene.add(ripplePlane)
  s.ripples.push({ mat: rippleMat, cpuPos: CPU_POS.clone() })

  // AI bounding box overlay
  const boxMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, opacity: { value: 0 } },
    vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float opacity;
      uniform float time;
      void main() { gl_FragColor = vec4(0.0, 0.78, 0.39, opacity * (0.6 + 0.4 * sin(time * 6.0))); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, wireframe: true,
  })
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), boxMat)
  box.position.set(CPU_POS.x, Y0 + 0.3, CPU_POS.z)   // FIX: .set()
  scene.add(box)
  s.aiDemo.boxMat = boxMat

  const scanMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, opacity: { value: 0 } },
    vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float opacity;
      void main() { gl_FragColor = vec4(0.91, 0.0, 0.06, opacity); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.01), scanMat)
  scan.position.set(CPU_POS.x, Y0 + 0.1, CPU_POS.z)   // FIX: .set()
  scene.add(scan)
  s.aiDemo.scanMat = scanMat
}

function updateAIDemo(dt: number, s: State) {
  const d = s.aiDemo
  if (!d.boxMat || !d.scanMat) return
  d.timer += dt
  d.boxMat.uniforms.time.value = s.time

  switch (d.phase) {
    case 0:
      d.boxMat.uniforms.opacity.value  = 0
      d.scanMat.uniforms.opacity.value = 0
      if (d.timer > 3.5) { d.phase = 1; d.timer = 0 }
      break
    case 1: {
      const fl = Math.sin(d.timer * 12) * 0.5 + 0.5
      d.boxMat.uniforms.opacity.value  = fl * 0.2
      d.scanMat.uniforms.opacity.value = fl * 0.4
      if (d.timer > 0.8) { d.phase = 2; d.timer = 0 }
      break
    }
    case 2: {
      const t = d.timer / 1.5
      d.boxMat.uniforms.opacity.value  = 0.15 + t * 0.25
      d.scanMat.uniforms.opacity.value = (1 - Math.abs(t - 0.5) * 2) * 0.8
      if (d.timer > 1.6) { d.phase = 3; d.timer = 0; d.detected = true }
      break
    }
    case 3: {
      const fade = Math.min(d.timer / 0.3, 1)
      d.boxMat.uniforms.opacity.value  = fade * 0.85
      d.scanMat.uniforms.opacity.value = 0
      if (d.timer > 2.5) { d.phase = 0; d.timer = 0; d.detected = false }
      break
    }
  }
}

// ─── Component ────────────────────────────────────────────
export default function PCBViewer() {
  const elRef = useRef<HTMLDivElement>(null)
  const st = useRef<State>({
    ledLights: [], particles: [], ripples: [],
    aiDemo: { phase: 0, timer: 0, detected: false },
    time: 0,
  })

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const W = el.clientWidth  || 640
    const H = el.clientHeight || 480
    const s = st.current

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))   // FIX: capped at 2
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.95
    el.appendChild(renderer.domElement)
    s.renderer = renderer

    // ── Scene ──
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x040b14)
    scene.fog = new THREE.FogExp2(0x040b14, 0.075)
    s.scene = scene

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 60)
    camera.position.set(0.5, 5.0, 5.4)   // FIX: .set()
    camera.lookAt(0, 0, 0)
    s.camera = camera

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0x1e3048, 1.4))
    const key = new THREE.DirectionalLight(0xfff4e0, 3.0)
    key.position.set(4, 10, 5)   // FIX: .set()
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -6; key.shadow.camera.right = 6
    key.shadow.camera.top = 6; key.shadow.camera.bottom = -6
    key.shadow.bias = -0.001
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x6090c8, 1.0)
    fill.position.set(-6, 4, -2)   // FIX: .set()
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0xffffff, 0.4)
    rim.position.set(0, 5, -8)     // FIX: .set()
    scene.add(rim)

    // ── Build scene ──
    buildBoard(scene, s)
    buildManhattanParticles(scene, s)
    buildAIDemo(scene, s)

    // ── OrbitControls ──
    const ctrl = new OrbitControls(camera, renderer.domElement)
    ctrl.enableDamping = true; ctrl.dampingFactor = 0.05
    ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.4
    ctrl.minDistance = 3; ctrl.maxDistance = 12
    ctrl.maxPolarAngle = Math.PI * 0.43
    s.controls = ctrl

    // ── Resize ──
    const onResize = () => {
      const nW = el.clientWidth, nH = el.clientHeight
      camera.aspect = nW / nH
      camera.updateProjectionMatrix()
      renderer.setSize(nW, nH)
    }
    window.addEventListener('resize', onResize)

    // ── Render loop ──
    let lt = performance.now()
    const loop = () => {
      s.rid = requestAnimationFrame(loop)
      const now = performance.now(), dt = Math.min((now - lt) / 1000, 0.05)
      lt = now
      s.time += dt

      if (s.controls) s.controls.update()

      // LED pulse
      s.ledLights.forEach(({ light, phase }) => {
        light.intensity = 0.02 + (Math.sin(s.time * 1.8 + phase) * 0.5 + 0.5) * 0.4
      })

      // Ripple uniforms
      s.ripples.forEach(r => { r.mat.uniforms.time.value = s.time })

      // Particles
      updateManhattanParticles(dt, s)

      // AI demo
      updateAIDemo(dt, s)

      renderer.render(scene, camera)
    }
    loop()

    return () => {
      if (s.rid) cancelAnimationFrame(s.rid)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={elRef}
      style={{ width: '100%', height: '100%', minHeight: '300px', background: '#040b14' }}
    />
  )
}
