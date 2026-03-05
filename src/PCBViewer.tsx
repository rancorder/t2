/**
 * PCBViewer.tsx
 * Three.js based high-fidelity AI Edge Computer PCB visualizer
 *
 * 修正5:  Manhattan routing — 横移動→縦移動の直角パーティクル動作
 * 修正6:  600 particles
 * 修正7:  CPUから波紋演出 — sin(time - dist * k) で輝度変化
 * 修正9:  renderer.setPixelRatio を Math.min(devicePixelRatio, 2) に固定
 * BONUS:  AI推論デモ — センサ→基板→AI→物体検出BOX
 */
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─── State ────────────────────────────────────────────────
interface ManhattanParticle {
  // 現在セグメント (水平 or 垂直)
  seg: number          // 0: 水平移動中, 1: 垂直移動中
  t: number            // 0→1 区間進捗
  speed: number
  // 現在の始点・終点
  from: THREE.Vector3
  to: THREE.Vector3
  // 次の折り返し点 (vertexリスト)
  vertices: THREE.Vector3[]
  vi: number           // 次の頂点インデックス
  color: THREE.Color
  size: number
}

interface RippleUniform {
  mat: THREE.ShaderMaterial
  cpuPos: THREE.Vector3
}

interface AIDemo {
  phase: number        // 0=idle 1=sensor 2=processing 3=detect
  timer: number
  detected: boolean
  boxMat?: THREE.ShaderMaterial
  scanMat?: THREE.ShaderMaterial
  labelMesh?: THREE.Mesh
}

interface State {
  renderer?: THREE.WebGLRenderer
  scene?: THREE.Scene
  camera?: THREE.PerspectiveCamera
  controls?: any
  ledLights: Array<{ light: THREE.PointLight; phase: number }>
  // 修正5/6: Manhattan particles
  particles: ManhattanParticle[]
  ptGeo?: THREE.BufferGeometry
  ptPos?: Float32Array
  ptCol?: Float32Array
  ptSz?: Float32Array
  // 修正7: Ripple shaders
  ripples: RippleUniform[]
  // AI Demo
  aiDemo: AIDemo
  time: number
  rid?: number
}

const BW = 4.0, BD = 3.6, BH = 0.08
const Y0 = BH / 2
// CPU 中心位置 (基板上)
const CPU_POS = new THREE.Vector3(-0.18, Y0 + 0.04, 0.12)

// ─── Component ────────────────────────────────────────────
export default function PCBViewer() {
  const elRef = useRef<HTMLDivElement>(null)
  const st = useRef<State>({
    ledLights: [],
    particles: [],
    ripples: [],
    aiDemo: { phase: 0, timer: 0, detected: false },
    time: 0,
  })

  useEffect(() => {
    const el = elRef.current; if (!el) return
    const W = el.clientWidth || 640, H = el.clientHeight || 480
    const s = st.current

    // ── Renderer (修正9: pixelRatio固定) ──────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // 修正9
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.9
    el.appendChild(renderer.domElement)
    s.renderer = renderer

    // ── Scene ──────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x040b14)
    scene.fog = new THREE.FogExp2(0x040b14, 0.085)
    s.scene = scene

    // ── Camera ─────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 60)
    camera.position.set(0.5, 5.0, 5.4)
    camera.lookAt(0, 0, 0)
    s.camera = camera

    // ── Lights ─────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1e3048, 1.4))
    const key = new THREE.DirectionalLight(0xfff4e0, 3.0)
    key.position.set(4, 10, 5); key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -6; key.shadow.camera.right = 6
    key.shadow.camera.top = 6; key.shadow.camera.bottom = -6
    key.shadow.bias = -0.001
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x6090c8, 1.0)
    fill.position.set(-6, 4, -2); scene.add(fill)
    const rim = new THREE.DirectionalLight(0xffffff, 0.4)
    rim.position.set(0, 5, -8); scene.add(rim)

    // ── Board + components ─────────────────────────────────
    buildBoard(scene, s)

    // ── Manhattan particles (修正5/6) ──────────────────────
    buildManhattanParticles(scene, s)

    // ── AI inference demo ──────────────────────────────────
    buildAIDemo(scene, s)

    // ── OrbitControls ──────────────────────────────────────
    const sc = document.createElement('script')
    sc.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'
    sc.onload = () => {
      const OC = (THREE as any).OrbitControls; if (!OC) return
      const ctrl = new OC(camera, renderer.domElement)
      ctrl.enableDamping = true; ctrl.dampingFactor = 0.05
      ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.4
      ctrl.minDistance = 3; ctrl.maxDistance = 12
      ctrl.maxPolarAngle = Math.PI * 0.43
      s.controls = ctrl
    }
    document.head.appendChild(sc)

    // ── Resize ─────────────────────────────────────────────
    const onResize = () => {
      const nW = el.clientWidth, nH = el.clientHeight
      camera.aspect = nW / nH; camera.updateProjectionMatrix()
      renderer.setSize(nW, nH)
    }
    window.addEventListener('resize', onResize)

    // ── Render loop ────────────────────────────────────────
    let lt = performance.now()
    const loop = () => {
      s.rid = requestAnimationFrame(loop)
      const now = performance.now(), dt = Math.min((now - lt) / 1000, 0.05); lt = now
      s.time += dt
      if (s.controls) s.controls.update()

      // LED pulse
      s.ledLights.forEach(({ light, phase }) => {
        light.intensity = 0.02 + (Math.sin(s.time * 1.8 + phase) * 0.5 + 0.5) * 0.4
      })

      // 修正7: Ripple uniforms (CPU波紋)
      s.ripples.forEach(r => {
        r.mat.uniforms.time.value = s.time
      })

      // 修正5/6: Manhattan particles
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

  return <div ref={elRef} style={{ width: '100%', height: '100%', background: '#040b14' }} />
}

// ─── Material helpers ──────────────────────────────────────
const mp = (c: number, r: number, mt: number, extra?: object) =>
  new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: mt, ...extra })
const copper = () => mp(0xd4aa35, 0.12, 0.97)
const darkPkg = () => mp(0x0e0e14, 0.26, 0.55, { emissive: 0x030308, emissiveIntensity: 0.12 })

// ─── Board build (全コンポーネント) ────────────────────────
function buildBoard(scene: THREE.Scene, s: State) {
  const root = new THREE.Group()
  root.rotation.x = -0.04
  scene.add(root)

  substrate(root)
  vias(root)
  castellated(root)
  usbC(root)
  sdSlot(root)
  ffcConn(root)
  header40pin(root)
  mainSoC(root, s, scene)
  lpddr(root, 0.95, -0.62)
  lpddr(root, 0.95,  0.58)
  pmic(root)
  inductors(root)
  caps(root)
  resistors(root)
  smallICs(root)
  crystal(root)
  testPoints(root)
  leds(root, s, scene)
  buildTraces(root, s)   // 修正7のRippleを含む
}

function substrate(root: THREE.Group) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD),
    mp(0x1a4a1a, 0.88, 0.0, { emissive: 0x0a1f0a, emissiveIntensity: 0.12 }))
  board.receiveShadow = true; root.add(board)
  const top = new THREE.Mesh(new THREE.PlaneGeometry(BW, BD),
    new THREE.MeshPhysicalMaterial({
      color: 0x1e5c22, roughness: 0.28, metalness: 0.0,
      transparent: true, opacity: 0.9,
      clearcoat: 0.6, clearcoatRoughness: 0.25,
    }))
  top.rotation.x = -Math.PI / 2; top.position.y = Y0 + 0.001; root.add(top)
  const bot = new THREE.Mesh(new THREE.PlaneGeometry(BW, BD), mp(0x0d2e0d, 0.9, 0.0))
  bot.rotation.x = Math.PI / 2; bot.position.y = -Y0 - 0.001; root.add(bot)
}

function vias(root: THREE.Group) {
  const vm = copper()
  const rows: [number,number][] = [
    [-1.7,-1.5],[-1.7,-1.0],[-1.7,-0.5],[-1.7,0],[-1.7,0.5],[-1.7,1.0],[-1.7,1.5],
     [1.7,-1.5], [1.7,-1.0], [1.7,-0.5], [1.7,0], [1.7,0.5], [1.7,1.0], [1.7,1.5],
    [-0.6,-1.6],[-0.3,-1.6],[0,-1.6],[0.3,-1.6],[0.6,-1.6],[0.9,-1.6],[1.2,-1.6],
    [-0.6, 1.6],[-0.3, 1.6],[0, 1.6],[0.3, 1.6],[0.6, 1.6],[0.9, 1.6],[1.2, 1.6],
  ]
  rows.forEach(([x,z]) => {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, BH + 0.003, 8), vm.clone())
    v.position.set(x, 0, z); root.add(v)
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.024, 0.042, 10), mp(0xd4aa35, 0.1, 0.97))
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, Y0 + 0.002, z); root.add(ring)
  })
}

function castellated(root: THREE.Group) {
  const pm = copper()
  const count = 16, sp = (BD - 0.4) / (count - 1)
  for (let side = 0; side < 2; side++) {
    const xPos = (side === 0 ? -1 : 1) * (BW / 2 - 0.035)
    for (let i = 0; i < count; i++) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.08, BH + 0.002, 0.06), pm.clone())
      pad.position.set(xPos, 0, -BD / 2 + 0.2 + i * sp); root.add(pad)
    }
  }
}

function usbC(root: THREE.Group) {
  const shell = mp(0x2a2a2e, 0.3, 0.85)
  root.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.48), shell.clone()),
    { position: new THREE.Vector3(-0.35, Y0 + 0.1, -BD / 2 - 0.18) }))
  root.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.06), mp(0x080810, 0.9, 0.1)),
    { position: new THREE.Vector3(-0.35, Y0 + 0.1, -BD / 2 - 0.42) }))
}

function sdSlot(root: THREE.Group) {
  root.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.56), mp(0x888888, 0.18, 0.88)),
    { position: new THREE.Vector3(0.55, Y0 + 0.07, -BD / 2 - 0.18) }))
}

function ffcConn(root: THREE.Group) {
  root.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.24), mp(0x1a1a1a, 0.8, 0.1)),
    { position: new THREE.Vector3(0, Y0 + 0.05, BD / 2 + 0.02) }))
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.01, 0.2), copper())
    c.position.set(-0.58 + i * 0.065, Y0 + 0.002, BD / 2 + 0.02); root.add(c)
  }
}

function header40pin(root: THREE.Group) {
  root.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 2.0), mp(0x0d0d0d, 0.9, 0.05)),
    { position: new THREE.Vector3(1.6, Y0 + 0.12, 0) }))
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 20; col++) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.34, 6), mp(0xd4aa35, 0.08, 0.99))
      pin.position.set(1.52 + row * 0.1, Y0 + 0.12, -0.95 + col * 0.1); root.add(pin)
    }
  }
}

function mainSoC(root: THREE.Group, s: State, scene: THREE.Scene) {
  const g = new THREE.Group()
  // CPU_POS はグローバル定数を使う (root.rotation考慮しない — worldスペースでOK)
  g.position.copy(new THREE.Vector3(CPU_POS.x, Y0, CPU_POS.z))
  root.add(g)

  const sub = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.065, 1.15),
    mp(0x181820, 0.28, 0.6, { emissive: 0x04040c, emissiveIntensity: 0.2 }))
  sub.position.y = 0.032; sub.castShadow = true; g.add(sub)

  const ihs = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.022, 1.04), mp(0x252528, 0.1, 0.9))
  ihs.position.y = 0.076; g.add(ihs)

  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.002, 0.14), mp(0x303038, 0.2, 0.7))
  mark.position.set(0.08, 0.088, 0.05); g.add(mark)

  const bm = mp(0xb8b8b8, 0.18, 0.92)
  for (let xi = -5; xi <= 5; xi++) {
    for (let zi = -5; zi <= 5; zi++) {
      if (Math.abs(xi) < 3 && Math.abs(zi) < 3) continue
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.017, 7, 7), bm)
      ball.position.set(xi * 0.096, 0.01, zi * 0.096); g.add(ball)
    }
  }

  // CPU glow point light
  const cpuLight = new THREE.PointLight(0x00aaff, 0.05, 2.0)
  cpuLight.position.copy(CPU_POS).setY(CPU_POS.y + 0.1)
  scene.add(cpuLight)
  s.ledLights.push({ light: cpuLight, phase: 0 })

  // Decoupling caps
  const dcM = mp(0x1c1c1c, 0.78, 0.06), dcE = copper()
  const dcPos: [number,number][] = [
    [-0.72,0.72],[-0.72,0],[-0.72,-0.72],[0.72,0.72],[0.72,0],[0.72,-0.72],
    [0,0.72],[0,-0.72],[-0.38,0.88],[0.38,0.88],[-0.38,-0.88],[0.38,-0.88],
    [-0.88,0.38],[0.88,0.38],[-0.88,-0.38],[0.88,-0.38],
    [-0.55,0.88],[0.55,0.88],[-0.55,-0.88],[0.55,-0.88],
    [-0.88,0],[-0.72,0.38],[0.72,0.38],[0.72,-0.38],
  ]
  dcPos.forEach(([dx, dz]) => {
    const wx = CPU_POS.x + dx, wz = CPU_POS.z + dz
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.048, 0.03), dcM.clone())
    cb.position.set(wx, Y0 + 0.024, wz); root.add(cb)
    ;[-1,1].forEach(side => {
      const ce = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.048, 0.03), dcE.clone())
      ce.position.set(wx + side * 0.033, Y0 + 0.024, wz); root.add(ce)
    })
  })
}

function lpddr(root: THREE.Group, x: number, z: number) {
  const g = new THREE.Group(); g.position.set(x, Y0, z); root.add(g)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.058, 0.7), darkPkg())
  body.position.y = 0.029; body.castShadow = true; g.add(body)
  const ihs = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.016, 0.64), mp(0x1c1c22, 0.12, 0.88))
  ihs.position.y = 0.065; g.add(ihs)
  const bm = mp(0xb8b8b8, 0.18, 0.92)
  for (let xi = -5; xi <= 5; xi++) {
    for (let zi = -3; zi <= 3; zi++) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), bm)
      ball.position.set(xi * 0.082, 0.007, zi * 0.082); g.add(ball)
    }
  }
}

function pmic(root: THREE.Group) {
  const g = new THREE.Group(); g.position.set(-1.12, Y0, -0.82); root.add(g)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.062, 0.58), darkPkg())
  body.position.y = 0.031; g.add(body)
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.5), mp(0x1c1c24, 0.1, 0.88))
  top.position.y = 0.068; g.add(top)
  const epad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.002, 0.3), copper())
  epad.position.y = 0.002; g.add(epad)
  for (let i = 0; i < 7; i++) {
    const lx = -0.27 + i * 0.09
    ;[-1,1].forEach(side => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.01, 0.06), copper())
      l.position.set(lx, 0, side * 0.31); g.add(l)
    })
  }
}

function inductors(root: THREE.Group) {
  const positions: [number,number][] = [[-1.0,0.3],[-1.3,0.3],[-1.0,0.65],[-1.3,0.65]]
  positions.forEach(([x,z]) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.28),
      mp(0x383840, 0.3, 0.45, { emissive: 0x080810, emissiveIntensity: 0.1 }))
    body.position.set(x, Y0 + 0.1, z); body.castShadow = true; root.add(body)
    for (let j = 0; j < 4; j++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.006, 0.008), mp(0xd4aa35, 0.12, 0.96))
      line.position.set(x, Y0 + 0.05 + j * 0.04, z); root.add(line)
    }
  })
}

function caps(root: THREE.Group) {
  const bm = mp(0x1e1e1e, 0.78, 0.04), em = copper()
  const positions: [number,number][] = [
    [-0.3,-1.42],[-0.5,-1.42],[0.1,-1.42],[0.35,-1.42],[0.6,-1.42],
    [-0.3, 1.42],[-0.5, 1.42],[0.1, 1.42],[0.35, 1.42],[0.6, 1.42],
    [0.72,-1.0],[0.72,-1.22],[0.72,1.0],[0.72,1.22],
    [-1.4,0.1],[-1.4,-0.1],[-1.4,0.3],[-1.35,0],
    [1.32,-1.42],[1.32,1.42],[1.4,0],
    [-0.2,-0.5],[-0.2,0.5],[-0.5,0.2],[-0.5,-0.2],
  ]
  positions.forEach(([x,z]) => {
    const angle = Math.random() > 0.5 ? Math.PI/2 : 0
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.044, 0.03), bm.clone())
    b.position.set(x, Y0+0.022, z); b.rotation.y = angle; root.add(b)
    ;[-1,1].forEach(side => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.044, 0.03), em.clone())
      e.position.set(x + (angle===0 ? side*0.035 : 0), Y0+0.022, z + (angle!==0 ? side*0.035 : 0))
      e.rotation.y = angle; root.add(e)
    })
  })
}

function resistors(root: THREE.Group) {
  const bm = mp(0x2a2018, 0.88, 0.0), em = copper()
  const positions: [number,number][] = [
    [-1.2,-1.2],[-1.0,-1.2],[-0.8,-1.2],[-1.2,1.2],[-1.0,1.2],[-0.8,1.2],
    [0,-0.85],[0.2,-0.85],[0.4,-0.85],[0,-1.05],[0.2,-1.05],
    [-0.4,-1.0],[-0.6,-1.0],[-0.4,-1.2],[-0.6,-1.2],
    [-0.4,1.0],[-0.6,1.0],[-0.4,1.2],[-0.6,1.2],
    [0,0.85],[0.2,0.85],[0.4,0.85],[1.2,-0.5],[1.2,0],[1.2,0.5],
  ]
  positions.forEach(([x,z]) => {
    const angle = Math.random() > 0.4 ? Math.PI/2 : 0
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.032, 0.024), bm.clone())
    b.position.set(x, Y0+0.016, z); b.rotation.y = angle; root.add(b)
    ;[-1,1].forEach(side => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.032, 0.024), em.clone())
      e.position.set(x + (angle===0 ? side*0.029 : 0), Y0+0.016, z + (angle!==0 ? side*0.029 : 0))
      e.rotation.y = angle; root.add(e)
    })
  })
}

function smallICs(root: THREE.Group) {
  const cfgs = [
    { x: 0.85, z: -1.25, w: 0.56, d: 0.44, n: 8 },
    { x:-1.25, z:  1.0,  w: 0.52, d: 0.52, n: 8 },
    { x: 0.4,  z:  1.25, w: 0.48, d: 0.36, n: 6 },
    { x:-0.5,  z:  0.62, w: 0.42, d: 0.34, n: 6 },
    { x: 0.2,  z: -0.6,  w: 0.36, d: 0.28, n: 5 },
  ]
  cfgs.forEach(({ x, z, w, d, n }) => {
    const g = new THREE.Group(); g.position.set(x, Y0, z); root.add(g)
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.052, d), darkPkg())
    body.position.y = 0.026; body.castShadow = true; g.add(body)
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), mp(0x2a2a32, 0.5, 0.2))
    dot.position.set(-w/2+0.06, 0.055, -d/2+0.06); g.add(dot)
    for (let i = 0; i < n; i++) {
      const lx = -w/2 + w/(n+1) * (i+1)
      ;[-1,1].forEach(side => {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.01, 0.065), copper())
        l.position.set(lx, 0, side*(d/2+0.032)); g.add(l)
      })
    }
  })
}

function crystal(root: THREE.Group) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.095, 0.105), mp(0xc0c8d0, 0.04, 0.93))
  body.position.set(-0.88, Y0+0.048, -0.3); root.add(body)
  ;[-1,1].forEach(side => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.095, 0.105), copper())
    e.position.set(-0.88 + side*0.132, Y0+0.048, -0.3); root.add(e)
  })
}

function testPoints(root: THREE.Group) {
  const pm = copper()
  const pts: [number,number][] = [
    [0.3,-1.56],[0.55,-1.56],[0.8,-1.56],[1.05,-1.56],[-0.2,-1.56],
    [0.3, 1.56],[0.55, 1.56],[0.8, 1.56],[1.05, 1.56],[-0.2, 1.56],
  ]
  pts.forEach(([x,z]) => {
    const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.018, 10), pm.clone())
    tp.position.set(x, Y0+0.009, z); root.add(tp)
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.026, 0.044, 10), pm.clone())
    ring.rotation.x = -Math.PI/2; ring.position.set(x, Y0+0.003, z); root.add(ring)
  })
}

function leds(root: THREE.Group, s: State, scene: THREE.Scene) {
  const cfgs = [
    { x:-1.55, z:-1.42, color: 0x00ff55, phase: 0.0 },
    { x:-1.55, z:-1.22, color: 0x0088ff, phase: 1.3 },
    { x:-1.55, z:-1.02, color: 0xff6600, phase: 2.6 },
  ]
  cfgs.forEach(({ x, z, color, phase }) => {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.022, 0.042, 8),
      new THREE.MeshPhysicalMaterial({
        color, roughness: 0.0, emissive: color, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.88,
      })
    )
    body.position.set(x, Y0+0.021, z); root.add(body)
    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.023, 10, 6, 0, Math.PI*2, 0, Math.PI/2),
      new THREE.MeshPhysicalMaterial({
        color, roughness: 0.0, emissive: color, emissiveIntensity: 0.8,
        transparent: true, opacity: 0.82,
      })
    )
    lens.position.set(x, Y0+0.042, z); root.add(lens)
    const light = new THREE.PointLight(color, 0.0, 1.4)
    light.position.set(x, Y0+0.07, z); scene.add(light)
    s.ledLights.push({ light, phase })
  })
}

// ─── Traces + 修正7 CPU Ripple ─────────────────────────────
function buildTraces(root: THREE.Group, s: State) {
  const baseY = Y0 + 0.018
  const traceM = mp(0xc89828, 0.15, 0.96)

  // Manhattan-style waypoints: 各セグメントは水平か垂直のみ
  // [x1,z1] → [x2,z2] を折れ線で結ぶ
  type Seg = [number, number]
  const traceDefs: Seg[][] = [
    [[-0.18,0.12],[0.55,0.12],[0.55,-0.62]],      // SoC → LPDDR1
    [[-0.18,0.12],[0.55,0.12],[0.55, 0.58]],       // SoC → LPDDR2
    [[-0.90,0.12],[-0.90,-0.82],[-1.12,-0.82]],    // SoC → PMIC
    [[-0.90,0.12],[-0.90,-1.74],[-0.35,-1.74]],    // SoC → USB
    [[-0.90,0.12],[-0.90, 0.30],[-1.00, 0.30]],    // SoC → Inductors
    [[ 0.55,-0.62],[1.72,-0.62],[1.72,-1.10]],     // LPDDR1 → Castellated
    [[ 0.55, 0.58],[1.72, 0.58],[1.72, 1.10]],     // LPDDR2 → Castellated
    [[-0.88,-0.30],[-0.18,-0.30],[-0.18, 0.12]],   // Crystal → SoC
    [[ 0.85,-1.25],[1.72,-1.25],[1.72,-1.30]],     // IC → Connector
    [[ 0.40, 1.25],[1.50, 1.25],[1.50, 1.30]],     // IC2 → Connector
    [[ 1.60, 0.50],[1.60, 0.00],[1.50, 0.00]],     // Header power
    [[-1.70,-0.50],[-0.90,-0.50],[-0.90, 0.12]],   // Via → SoC
    [[ 1.70, 0.50],[0.55, 0.50],[0.55, 0.58]],     // Via → LPDDR2
    [[-0.18, 0.12],[-0.18,-1.56],[0.30,-1.56]],    // SoC → TestPoint
  ]

  traceDefs.forEach(segs => {
    // Build straight copper segments for physical trace
    for (let i = 0; i < segs.length - 1; i++) {
      const [x1,z1] = segs[i], [x2,z2] = segs[i+1]
      const len = Math.sqrt((x2-x1)**2 + (z2-z1)**2)
      const mx = (x1+x2)/2, mz = (z1+z2)/2
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(len+0.001, 0.0025, 0.016),
        traceM.clone()
      )
      seg.position.set(mx, baseY, mz)
      if (Math.abs(z2-z1) > Math.abs(x2-x1)) seg.rotation.y = Math.PI/2
      root.add(seg)
    }

    // 修正7: CPU波紋シェーダーをtube上に実装
    // シェーダーは distance from CPU pos で輝度をsin変調する
    const tubePoints = segs.map(([x,z]) => new THREE.Vector3(x, baseY, z))
    // Manhattan曲線 (折れ線) を Catmull で滑らかにする
    const curve = new THREE.CatmullRomCurve3(tubePoints, false, 'catmullrom', 0.0)
    const tube = new THREE.TubeGeometry(curve, segs.length * 10, 0.011, 4, false)

    const rippleMat = new THREE.ShaderMaterial({
      uniforms: {
        time:   { value: 0 },
        cpuPos: { value: new THREE.Vector3(CPU_POS.x, baseY, CPU_POS.z) },
        color:  { value: new THREE.Color([0x00d4ff, 0x00ff88, 0xff8800, 0xaa44ff][Math.floor(Math.random()*4)]) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3  cpuPos;
        uniform vec3  color;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
          // 修正7: CPU からの距離で波紋強度を計算
          float dist = distance(vWorldPos, cpuPos);
          float k    = 3.2;  // 空間周波数
          float spd  = 2.6;  // 伝搬速度
          float ripple = sin(time * spd - dist * k) * 0.5 + 0.5;
          // 波紋が遠距離で減衰
          float atten = exp(-dist * 0.55);
          float edge  = smoothstep(0.0, 0.45, 1.0 - abs(vUv.y - 0.5) * 2.0);
          float alpha = ripple * atten * edge * 0.75;
          gl_FragColor = vec4(color + vec3(ripple * 0.25), alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(tube, rippleMat)
    root.add(mesh)

    // State に登録してアニメループで time を更新
    s.ripples.push({ mat: rippleMat, cpuPos: CPU_POS })
  })
}

// ─── 修正5/6: Manhattan Routing Particles ─────────────────
/**
 * Manhattan routing: 各パーティクルは
 *   横移動 → 縦移動 → 横移動 → …
 * という直角ルーティングで移動する
 */
function buildManhattanParticles(scene: THREE.Scene, s: State) {
  const N = 600  // 修正6: 600 particles

  // パーティクルの移動グリッド定義 (Manhattan waypoint sets)
  // 各セットは直角で構成されたwaypoint列
  const routes: [number,number,number][][] = [
    // Route A: 左→右上 (SoC→LPDDR方向)
    [[-1.8,Y0+0.02,0],[0,Y0+0.02,0],[0,Y0+0.02,-0.6],[0.9,Y0+0.02,-0.6]],
    [[-1.8,Y0+0.02,0],[0,Y0+0.02,0],[0,Y0+0.02,0.6],[0.9,Y0+0.02,0.6]],
    // Route B: 上→下 (縦幹線)
    [[-0.2,Y0+0.02,-1.6],[-0.2,Y0+0.02,0],[-0.2,Y0+0.02,1.6]],
    [[0.5,Y0+0.02,-1.6],[0.5,Y0+0.02,0],[0.5,Y0+0.02,1.6]],
    // Route C: PMIC電源ライン
    [[-1.8,Y0+0.02,-0.8],[-1.1,Y0+0.02,-0.8],[-1.1,Y0+0.02,0],[-0.2,Y0+0.02,0]],
    [[-1.8,Y0+0.02,0.5],[-1.0,Y0+0.02,0.5],[-1.0,Y0+0.02,0],[-0.2,Y0+0.02,0]],
    // Route D: 右端コネクタ
    [[1.7,Y0+0.02,-1.5],[1.7,Y0+0.02,0],[1.7,Y0+0.02,1.5]],
    // Route E: USB→SoC
    [[-0.35,Y0+0.02,-1.7],[-0.35,Y0+0.02,-0.5],[-0.2,Y0+0.02,-0.5],[-0.2,Y0+0.02,0.12]],
    // Route F: Crystal→SoC
    [[-0.88,Y0+0.02,-0.3],[-0.88,Y0+0.02,0.12],[-0.2,Y0+0.02,0.12]],
    // Route G: 横断幹線
    [[-1.8,Y0+0.02,-0.3],[1.7,Y0+0.02,-0.3]],
    [[-1.8,Y0+0.02, 0.3],[1.7,Y0+0.02, 0.3]],
  ]

  const palColors = [0x00d4ff, 0x00ff88, 0xaaffdd, 0x4488ff, 0xff8800, 0xaa44ff]
  const palette = palColors.map(c => new THREE.Color(c))

  const pPos = new Float32Array(N * 3)
  const pCol = new Float32Array(N * 3)
  const pSz  = new Float32Array(N)

  const particles: ManhattanParticle[] = []
  for (let i = 0; i < N; i++) {
    particles.push(spawnManhattan(routes, palette))
  }
  s.particles = particles

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
  geo.setAttribute('aColor',   new THREE.BufferAttribute(pCol, 3))
  geo.setAttribute('size',     new THREE.BufferAttribute(pSz,  1))

  const mat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      attribute float size;
      attribute vec3 aColor;
      varying vec3 vC;
      void main() {
        vC = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (200.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vC;
      void main() {
        vec2  uv = gl_PointCoord - 0.5;
        float d  = length(uv);
        if (d > 0.5) discard;
        float a = pow(1.0 - smoothstep(0.0, 0.5, d), 1.8);
        gl_FragColor = vec4(vC, a * 0.85);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const points = new THREE.Points(geo, mat)
  scene.add(points)

  s.ptGeo = geo
  s.ptPos = pPos
  s.ptCol = pCol
  s.ptSz  = pSz
}

/** Manhattan パーティクルを初期化 */
function spawnManhattan(
  routes: [number,number,number][][],
  palette: THREE.Color[]
): ManhattanParticle {
  const ri = Math.floor(Math.random() * routes.length)
  const verts = routes[ri].map(([x,y,z]) => new THREE.Vector3(x, y, z))
  const vi = Math.floor(Math.random() * (verts.length - 1))
  return {
    seg: 0, t: Math.random(),
    speed: 0.22 + Math.random() * 0.38,
    from: verts[vi].clone(),
    to:   verts[vi + 1].clone(),
    vertices: verts,
    vi: vi + 1,
    color: palette[Math.floor(Math.random() * palette.length)].clone(),
    size: 1.2 + Math.random() * 2.5,
  }
}

/** 修正5: Manhattan straight-line + 90deg turn update */
function updateManhattanParticles(dt: number, s: State) {
  if (!s.ptPos || !s.ptGeo || !s.particles.length) return
  const routes: [number,number,number][][] = [
    [[-1.8,Y0+0.02,0],[0,Y0+0.02,0],[0,Y0+0.02,-0.6],[0.9,Y0+0.02,-0.6]],
    [[-1.8,Y0+0.02,0],[0,Y0+0.02,0],[0,Y0+0.02,0.6],[0.9,Y0+0.02,0.6]],
    [[-0.2,Y0+0.02,-1.6],[-0.2,Y0+0.02,0],[-0.2,Y0+0.02,1.6]],
    [[0.5,Y0+0.02,-1.6],[0.5,Y0+0.02,0],[0.5,Y0+0.02,1.6]],
    [[-1.8,Y0+0.02,-0.8],[-1.1,Y0+0.02,-0.8],[-1.1,Y0+0.02,0],[-0.2,Y0+0.02,0]],
    [[-1.8,Y0+0.02,0.5],[-1.0,Y0+0.02,0.5],[-1.0,Y0+0.02,0],[-0.2,Y0+0.02,0]],
    [[1.7,Y0+0.02,-1.5],[1.7,Y0+0.02,0],[1.7,Y0+0.02,1.5]],
    [[-0.35,Y0+0.02,-1.7],[-0.35,Y0+0.02,-0.5],[-0.2,Y0+0.02,-0.5],[-0.2,Y0+0.02,0.12]],
    [[-0.88,Y0+0.02,-0.3],[-0.88,Y0+0.02,0.12],[-0.2,Y0+0.02,0.12]],
    [[-1.8,Y0+0.02,-0.3],[1.7,Y0+0.02,-0.3]],
    [[-1.8,Y0+0.02, 0.3],[1.7,Y0+0.02, 0.3]],
  ]
  const palette = [0x00d4ff, 0x00ff88, 0xaaffdd, 0x4488ff, 0xff8800, 0xaa44ff].map(c => new THREE.Color(c))

  s.particles.forEach((p, i) => {
    p.t += dt * p.speed

    if (p.t >= 1.0) {
      // 次のセグメントへ (直角ターン)
      p.t -= 1.0
      p.vi += 1
      if (p.vi >= p.vertices.length) {
        // ルート終端: 新しいパーティクルとして再スポーン
        const np = spawnManhattan(routes, palette)
        s.particles[i] = np
        return
      }
      p.from.copy(p.to)
      p.to.copy(p.vertices[p.vi])
    }

    // 線形補間 (直線移動のみ — Manhattan)
    const pos = new THREE.Vector3().lerpVectors(p.from, p.to, p.t)
    s.ptPos![i*3]   = pos.x
    s.ptPos![i*3+1] = pos.y
    s.ptPos![i*3+2] = pos.z
    s.ptCol![i*3]   = p.color.r
    s.ptCol![i*3+1] = p.color.g
    s.ptCol![i*3+2] = p.color.b
    s.ptSz![i]      = p.size
  })

  s.ptGeo.attributes.position.needsUpdate = true
  s.ptGeo.attributes.aColor.needsUpdate   = true
  s.ptGeo.attributes.size.needsUpdate     = true
}

// ─── AI Demo: センサ→基板→AI→検出BOX ────────────────────
/**
 * BONUS: AI推論デモ演出
 * phase 0: アイドル (3秒待機)
 * phase 1: センサ入力 — 入射光のフラッシュ
 * phase 2: データ処理 — CPU波紋高速化
 * phase 3: 検出 — ワイヤーフレームBOX出現 + ラベル
 * → ループ
 */
function buildAIDemo(scene: THREE.Scene, s: State) {
  // 検出BOX — ワイヤーフレーム
  const boxGeo = new THREE.BoxGeometry(0.8, 0.5, 0.8)
  const boxMat = new THREE.ShaderMaterial({
    uniforms: {
      time:    { value: 0 },
      opacity: { value: 0 },
      color:   { value: new THREE.Color(0x00ff88) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float opacity;
      uniform vec3  color;
      uniform float time;
      varying vec2 vUv;
      void main() {
        float pulse = 0.7 + 0.3 * sin(time * 4.0);
        gl_FragColor = vec4(color * pulse, opacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    wireframe: true,
  })
  const box = new THREE.Mesh(boxGeo, boxMat)
  box.position.set(CPU_POS.x, Y0 + 0.35, CPU_POS.z)
  scene.add(box)

  // スキャンライン (水平走査)
  const scanGeo = new THREE.PlaneGeometry(0.82, 0.04)
  const scanMat = new THREE.ShaderMaterial({
    uniforms: {
      time:    { value: 0 },
      opacity: { value: 0 },
    },
    vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float opacity;
      void main() {
        gl_FragColor = vec4(0.0, 1.0, 0.5, opacity * 0.7);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const scan = new THREE.Mesh(scanGeo, scanMat)
  scan.position.set(CPU_POS.x, Y0 + 0.3, CPU_POS.z)
  scan.rotation.y = Math.PI / 8
  scene.add(scan)

  s.aiDemo.boxMat  = boxMat
  s.aiDemo.scanMat = scanMat
  s.aiDemo.phase   = 0
  s.aiDemo.timer   = 0
}

function updateAIDemo(dt: number, s: State) {
  const d = s.aiDemo
  d.timer += dt

  if (!d.boxMat || !d.scanMat) return

  d.boxMat.uniforms.time.value  = s.time
  d.scanMat.uniforms.time.value = s.time

  switch (d.phase) {
    case 0: // アイドル
      d.boxMat.uniforms.opacity.value  = 0
      d.scanMat.uniforms.opacity.value = 0
      if (d.timer > 3.5) { d.phase = 1; d.timer = 0 }
      break

    case 1: // センサ入力フラッシュ
      {
        const fl = Math.sin(d.timer * 12) * 0.5 + 0.5
        d.boxMat.uniforms.opacity.value  = fl * 0.2
        d.scanMat.uniforms.opacity.value = fl * 0.4
      }
      if (d.timer > 0.8) { d.phase = 2; d.timer = 0 }
      break

    case 2: // 処理中 — スキャンBOX上下移動
      {
        const t = d.timer / 1.5
        if (d.scanMat.uniforms) {
          d.scanMat.uniforms.opacity.value = 0.6
        }
        const scanY = Y0 + 0.1 + t * 0.5
        d.boxMat.uniforms.opacity.value = 0.15 + t * 0.25
        // scan Y は uniform化できないので opacity で代替
        d.scanMat.uniforms.opacity.value = (1 - Math.abs(t - 0.5) * 2) * 0.8
      }
      if (d.timer > 1.6) { d.phase = 3; d.timer = 0; d.detected = true }
      break

    case 3: // 検出完了 — BOXをはっきり表示
      {
        const fade = Math.min(d.timer / 0.3, 1)
        d.boxMat.uniforms.opacity.value  = fade * 0.85
        d.scanMat.uniforms.opacity.value = 0
      }
      if (d.timer > 2.5) { d.phase = 0; d.timer = 0; d.detected = false }
      break
  }
}
