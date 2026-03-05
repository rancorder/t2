import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface State {
  renderer?: THREE.WebGLRenderer
  scene?: THREE.Scene
  camera?: THREE.PerspectiveCamera
  controls?: any
  animatedMaterials: THREE.ShaderMaterial[]
  ledLights: Array<{ light: THREE.PointLight; phase: number }>
  signalPulses: Array<{ mat: THREE.ShaderMaterial; t: number; speed: number }>
  time: number
  rid?: number
}

const BW = 4.0, BD = 3.6, BH = 0.08
const Y0 = BH / 2  // top surface Y

export default function PCBViewer() {
  const elRef = useRef<HTMLDivElement>(null)
  const s = useRef<State>({
    animatedMaterials: [], ledLights: [], signalPulses: [], time: 0
  })

  useEffect(() => {
    const el = elRef.current; if (!el) return
    const W = el.clientWidth || 640, H = el.clientHeight || 480

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.9
    el.appendChild(renderer.domElement)
    s.current.renderer = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x040b14)
    scene.fog = new THREE.FogExp2(0x040b14, 0.085)
    s.current.scene = scene

    const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 60)
    camera.position.set(0.5, 5.0, 5.4)
    camera.lookAt(0, 0, 0)
    s.current.camera = camera

    // Lights
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

    build(scene, s.current)

    // OrbitControls
    const sc = document.createElement('script')
    sc.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'
    sc.onload = () => {
      const OC = (THREE as any).OrbitControls; if (!OC) return
      const ctrl = new OC(camera, renderer.domElement)
      ctrl.enableDamping = true; ctrl.dampingFactor = 0.05
      ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.4
      ctrl.minDistance = 3; ctrl.maxDistance = 12
      ctrl.maxPolarAngle = Math.PI * 0.43
      s.current.controls = ctrl
    }
    document.head.appendChild(sc)

    const onResize = () => {
      const nW = el.clientWidth, nH = el.clientHeight
      camera.aspect = nW / nH; camera.updateProjectionMatrix()
      renderer.setSize(nW, nH)
    }
    window.addEventListener('resize', onResize)

    let lt = performance.now()
    const loop = () => {
      s.current.rid = requestAnimationFrame(loop)
      const now = performance.now(), dt = Math.min((now - lt) / 1000, 0.05); lt = now
      s.current.time += dt
      if (s.current.controls) s.current.controls.update()
      // LEDs
      s.current.ledLights.forEach(({ light, phase }) => {
        light.intensity = 0.02 + (Math.sin(s.current.time * 1.8 + phase) * 0.5 + 0.5) * 0.4
      })
      // Signal pulses
      s.current.signalPulses.forEach(p => {
        p.t += dt * p.speed; if (p.t > 1.3) p.t = -0.15
        p.mat.uniforms.progress.value = Math.max(0, Math.min(1, p.t))
      })
      renderer.render(scene, camera)
    }
    loop()

    return () => {
      if (s.current.rid) cancelAnimationFrame(s.current.rid)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={elRef} style={{ width: '100%', height: '100%', background: '#040b14' }} />
}

// ─── materials ────────────────────────────────────────────
const m = (c: number, r: number, mt: number, extra?: object) =>
  new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: mt, ...extra })
const copper = () => m(0xd4aa35, 0.12, 0.97)
const darkPkg = () => m(0x0e0e14, 0.26, 0.55, { emissive: 0x030308, emissiveIntensity: 0.12 })

// ─── main build ───────────────────────────────────────────
function build(scene: THREE.Scene, s: State) {
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
  mainSoC(root)
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
  traces(root, s)
}

function substrate(root: THREE.Group) {
  // FR4 body
  const board = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD),
    m(0x1a4a1a, 0.88, 0.0, { emissive: 0x0a1f0a, emissiveIntensity: 0.12 }))
  board.receiveShadow = true; root.add(board)
  // Solder mask (glossy top)
  const top = new THREE.Mesh(new THREE.PlaneGeometry(BW, BD),
    new THREE.MeshPhysicalMaterial({
      color: 0x1e5c22, roughness: 0.28, metalness: 0.0,
      transparent: true, opacity: 0.9,
      clearcoat: 0.6, clearcoatRoughness: 0.25,
    }))
  top.rotation.x = -Math.PI / 2; top.position.y = Y0 + 0.001; root.add(top)
  // Bottom layer glimpse
  const bot = new THREE.Mesh(new THREE.PlaneGeometry(BW, BD), m(0x0d2e0d, 0.9, 0.0))
  bot.rotation.x = Math.PI / 2; bot.position.y = -Y0 - 0.001; root.add(bot)
}

function vias(root: THREE.Group) {
  const vm = copper()
  const rows: [number, number][] = [
    [-1.7,-1.5],[-1.7,-1.0],[-1.7,-0.5],[-1.7,0],[-1.7,0.5],[-1.7,1.0],[-1.7,1.5],
     [1.7,-1.5], [1.7,-1.0], [1.7,-0.5], [1.7,0], [1.7,0.5], [1.7,1.0], [1.7,1.5],
    [-0.6,-1.6],[-0.3,-1.6],[0,-1.6],[0.3,-1.6],[0.6,-1.6],[0.9,-1.6],[1.2,-1.6],
    [-0.6, 1.6],[-0.3, 1.6],[0, 1.6],[0.3, 1.6],[0.6, 1.6],[0.9, 1.6],[1.2, 1.6],
  ]
  rows.forEach(([x, z]) => {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, BH + 0.003, 8), vm.clone())
    v.position.set(x, 0, z); root.add(v)
    // annular ring
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.024, 0.042, 10),
      m(0xd4aa35, 0.1, 0.97))
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, Y0 + 0.002, z); root.add(ring)
  })
}

function castellated(root: THREE.Group) {
  const pm = copper()
  const count = 16
  const sp = (BD - 0.4) / (count - 1)
  for (let side = 0; side < 2; side++) {
    const xPos = (side === 0 ? -1 : 1) * (BW / 2 - 0.035)
    for (let i = 0; i < count; i++) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.08, BH + 0.002, 0.06), pm.clone())
      pad.position.set(xPos, 0, -BD / 2 + 0.2 + i * sp); root.add(pad)
    }
  }
}

function usbC(root: THREE.Group) {
  const shell = m(0x2a2a2e, 0.3, 0.85)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.48), shell.clone())
  body.position.set(-0.35, Y0 + 0.1, -BD / 2 - 0.18); root.add(body)
  // opening
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.06), m(0x080810, 0.9, 0.1))
  hole.position.set(-0.35, Y0 + 0.1, -BD / 2 - 0.42); root.add(hole)
  // solder tabs
  ;[-0.22, 0.22].forEach(dz => {
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), copper())
    tab.position.set(-0.35, Y0 - 0.02, -BD / 2 + dz); root.add(tab)
  })
}

function sdSlot(root: THREE.Group) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.56),
    m(0x888888, 0.18, 0.88))
  body.position.set(0.55, Y0 + 0.07, -BD / 2 - 0.18); root.add(body)
  const opening = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.06), m(0x060606, 0.9, 0.0))
  opening.position.set(0.55, Y0 + 0.07, -BD / 2 - 0.44); root.add(opening)
}

function ffcConn(root: THREE.Group) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.24), m(0x1a1a1a, 0.8, 0.1))
  body.position.set(0, Y0 + 0.05, BD / 2 + 0.02); root.add(body)
  // contact strips
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.01, 0.2), copper())
    c.position.set(-0.58 + i * 0.065, Y0 + 0.002, BD / 2 + 0.02); root.add(c)
  }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.06), m(0x333333, 0.6, 0.2))
  lock.position.set(0, Y0 + 0.08, BD / 2 + 0.15); root.add(lock)
}

function header40pin(root: THREE.Group) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 2.0),
    m(0x0d0d0d, 0.9, 0.05))
  base.position.set(1.6, Y0 + 0.12, 0); root.add(base)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 20; col++) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.34, 6),
        m(0xd4aa35, 0.08, 0.99))
      pin.position.set(1.52 + row * 0.1, Y0 + 0.12, -0.95 + col * 0.1); root.add(pin)
    }
  }
}

function mainSoC(root: THREE.Group) {
  const g = new THREE.Group()
  g.position.set(-0.18, Y0, 0.12); root.add(g)

  // Substrate PCB piece
  const sub = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.065, 1.15),
    m(0x181820, 0.28, 0.6, { emissive: 0x04040c, emissiveIntensity: 0.2 }))
  sub.position.y = 0.032; sub.castShadow = true; g.add(sub)

  // IHS (integrated heat spreader)
  const ihs = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.022, 1.04),
    m(0x252528, 0.1, 0.9))
  ihs.position.y = 0.076; g.add(ihs)

  // Die markings on IHS
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.002, 0.14), m(0x303038, 0.2, 0.7))
  mark.position.set(0.08, 0.088, 0.05); g.add(mark)
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.022, 8), m(0x888890, 0.2, 0.5))
  dot.rotation.x = -Math.PI / 2; dot.position.set(-0.42, 0.089, -0.42); g.add(dot)

  // BGA balls
  const bm = m(0xb8b8b8, 0.18, 0.92)
  for (let xi = -5; xi <= 5; xi++) {
    for (let zi = -5; zi <= 5; zi++) {
      if (Math.abs(xi) < 3 && Math.abs(zi) < 3) continue
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.017, 7, 7), bm)
      ball.position.set(xi * 0.096, 0.01, zi * 0.096); g.add(ball)
    }
  }

  // Decoupling caps — tight ring
  const dcM = m(0x1c1c1c, 0.78, 0.06)
  const dcE = copper()
  const dcPos: [number,number][] = [
    [-0.72,0.72],[-0.72,0],[-0.72,-0.72],[0.72,0.72],[0.72,0],[0.72,-0.72],
    [0,0.72],[0,-0.72],[-0.38,0.88],[0.38,0.88],[-0.38,-0.88],[0.38,-0.88],
    [-0.88,0.38],[0.88,0.38],[-0.88,-0.38],[0.88,-0.38],
    [-0.55,0.88],[0.55,0.88],[-0.55,-0.88],[0.55,-0.88],
    [-0.88,0],[-0.72,0.38],[0.72,0.38],[0.72,-0.38],
  ]
  dcPos.forEach(([x, z]) => {
    const ox = x > 0 ? g.position.x + x : g.position.x + x
    const oz = z > 0 ? g.position.z + z : g.position.z + z
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.048, 0.03), dcM.clone())
    cb.position.set(ox, Y0 + 0.024, oz); root.add(cb)
    ;[-1,1].forEach(side => {
      const ce = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.048, 0.03), dcE.clone())
      ce.position.set(ox + side * 0.033, Y0 + 0.024, oz); root.add(ce)
    })
  })
}

function lpddr(root: THREE.Group, x: number, z: number) {
  const g = new THREE.Group(); g.position.set(x, Y0, z); root.add(g)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.058, 0.7), darkPkg())
  body.position.y = 0.029; body.castShadow = true; g.add(body)
  const ihs = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.016, 0.64), m(0x1c1c22, 0.12, 0.88))
  ihs.position.y = 0.065; g.add(ihs)
  // wirebond marks
  for (let i = 0; i < 9; i++) {
    const wb = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.002, 0.006), copper())
    wb.position.set(-0.39 + i * 0.095, 0.058, 0); g.add(wb)
  }
  // BGA
  const bm = m(0xb8b8b8, 0.18, 0.92)
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
  body.position.y = 0.031; body.castShadow = true; g.add(body)
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.5), m(0x1c1c24, 0.1, 0.88))
  top.position.y = 0.068; g.add(top)
  const epad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.002, 0.3), copper())
  epad.position.y = 0.002; g.add(epad)
  // QFN leads
  for (let i = 0; i < 7; i++) {
    const lx = -0.27 + i * 0.09
    ;[-1,1].forEach(side => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.01, 0.06), copper())
      l.position.set(lx, 0, side * 0.31); g.add(l)
    })
  }
  for (let i = 0; i < 7; i++) {
    const lz = -0.27 + i * 0.09
    ;[-1,1].forEach(side => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.048), copper())
      l.position.set(side * 0.31, 0, lz); g.add(l)
    })
  }
}

function inductors(root: THREE.Group) {
  const positions: [number,number][] = [[-1.0,0.3],[-1.3,0.3],[-1.0,0.65],[-1.3,0.65]]
  positions.forEach(([x,z]) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.28),
      m(0x383840, 0.3, 0.45, { emissive: 0x080810, emissiveIntensity: 0.1 }))
    body.position.set(x, Y0 + 0.1, z); body.castShadow = true; root.add(body)
    const top = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), m(0x282830, 0.35, 0.4))
    top.rotation.x = -Math.PI/2; top.position.set(x, Y0+0.201, z); root.add(top)
    // wrap lines
    for (let j = 0; j < 4; j++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.006, 0.008), m(0xd4aa35, 0.12, 0.96))
      line.position.set(x, Y0 + 0.05 + j * 0.04, z); root.add(line)
    }
  })
}

function caps(root: THREE.Group) {
  const bm = m(0x1e1e1e, 0.78, 0.04)
  const em = copper()
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
      e.position.set(x + (angle === 0 ? side*0.035 : 0), Y0+0.022, z + (angle !== 0 ? side*0.035 : 0))
      e.rotation.y = angle; root.add(e)
    })
  })
}

function resistors(root: THREE.Group) {
  const bm = m(0x2a2018, 0.88, 0.0)
  const em = copper()
  const positions: [number,number][] = [
    [-1.2,-1.2],[-1.0,-1.2],[-0.8,-1.2],[-1.2,1.2],[-1.0,1.2],[-0.8,1.2],
    [0,-0.85],[0.2,-0.85],[0.4,-0.85],[0,-1.05],[0.2,-1.05],
    [-0.4,-1.0],[-0.6,-1.0],[-0.4,-1.2],[-0.6,-1.2],
    [-0.4,1.0],[-0.6,1.0],[-0.4,1.2],[-0.6,1.2],
    [0,0.85],[0.2,0.85],[0.4,0.85],[0,-1.05],
    [1.2,-0.5],[1.2,0],[1.2,0.5],
  ]
  positions.forEach(([x,z]) => {
    const angle = Math.random() > 0.4 ? Math.PI/2 : 0
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.032, 0.024), bm.clone())
    b.position.set(x, Y0+0.016, z); b.rotation.y = angle; root.add(b)
    ;[-1,1].forEach(side => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.032, 0.024), em.clone())
      e.position.set(x + (angle === 0 ? side*0.029 : 0), Y0+0.016, z + (angle !== 0 ? side*0.029 : 0))
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
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), m(0x2a2a32, 0.5, 0.2))
    dot.position.set(-w/2+0.06, 0.055, -d/2+0.06); g.add(dot)
    const lm = copper()
    for (let i = 0; i < n; i++) {
      const lx = -w/2 + w/(n+1) * (i+1)
      ;[-1,1].forEach(side => {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.01, 0.065), lm.clone())
        l.position.set(lx, 0, side*(d/2+0.032)); g.add(l)
      })
    }
  })
}

function crystal(root: THREE.Group) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.095, 0.105), m(0xc0c8d0, 0.04, 0.93))
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
        color, roughness: 0.0, metalness: 0.0,
        emissive: color, emissiveIntensity: 0.5,
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

function traces(root: THREE.Group, s: State) {
  const baseY = Y0 + 0.018
  const traceColor = m(0xc89828, 0.15, 0.96)

  const paths: [number,number,number][][] = [
    // SoC → LPDDR1
    [[-0.18,baseY,0.0],[0.2,baseY,-0.35],[0.55,baseY,-0.62]],
    // SoC → LPDDR2
    [[-0.18,baseY,0.25],[0.2,baseY,0.42],[0.55,baseY,0.58]],
    // SoC → PMIC
    [[-0.72,baseY,0.0],[-0.9,baseY,-0.5],[-1.12,baseY,-0.82]],
    // SoC → USB
    [[-0.72,baseY,-0.1],[-0.5,baseY,-0.9],[-0.35,baseY,-1.74]],
    // SoC → inductors
    [[-0.72,baseY,0.12],[-0.88,baseY,0.28],[-1.0,baseY,0.3]],
    // LPDDR1 → castellated
    [[0.95,baseY,-0.85],[1.3,baseY,-1.0],[1.72,baseY,-1.1]],
    // LPDDR2 → castellated
    [[0.95,baseY,0.8],[1.3,baseY,1.0],[1.72,baseY,1.1]],
    // Crystal → SoC
    [[-0.88,baseY,-0.3],[-0.55,baseY,-0.2],[-0.18,baseY,-0.15]],
    // IC → connector
    [[0.85,baseY,-1.0],[1.15,baseY,-1.15],[1.72,baseY,-1.3]],
    [[0.4,baseY,1.0],[0.8,baseY,1.15],[1.5,baseY,1.3]],
    // Header power
    [[1.6,baseY,0.5],[1.6,baseY,0.2],[1.5,baseY,0]],
    // Via connections
    [[-1.7,baseY,-0.5],[-1.2,baseY,-0.5],[-0.72,baseY,-0.2]],
    [[1.7,baseY,0.5],[1.32,baseY,0.5],[0.95,baseY,0.58]],
  ]

  paths.forEach(rawPts => {
    const pts = rawPts.map(p => new THREE.Vector3(p[0], p[1], p[2]))
    const curve = new THREE.CatmullRomCurve3(pts)
    const pts30 = curve.getPoints(30)

    // Physical copper trace
    for (let i = 0; i < pts30.length - 1; i++) {
      const a = pts30[i], b = pts30[i+1]
      const len = a.distanceTo(b)
      const mid = new THREE.Vector3().addVectors(a,b).multiplyScalar(0.5)
      const seg = new THREE.Mesh(new THREE.BoxGeometry(len+0.001, 0.0025, 0.016), traceColor.clone())
      seg.position.copy(mid); seg.lookAt(b); seg.rotation.y += Math.PI/2
      root.add(seg)
    }

    // Animated signal pulse
    const pulseMat = new THREE.ShaderMaterial({
      uniforms: {
        progress: { value: Math.random() },
        color: { value: new THREE.Color([0x00d4ff, 0x00ff88, 0xff8800, 0xaa44ff][Math.floor(Math.random()*4)]) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform float progress;
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          float d = abs(vUv.x - progress);
          float edge = smoothstep(0.0, 0.5, 1.0 - abs(vUv.y - 0.5) * 2.0);
          float pulse = smoothstep(0.07, 0.0, d);
          float head = smoothstep(0.0, 0.0, d) * smoothstep(0.0, 0.02, 0.07 - d);
          gl_FragColor = vec4(color, (pulse * 0.8 + head * 0.4) * edge);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    const tube = new THREE.TubeGeometry(curve, 40, 0.011, 4, false)
    const mesh = new THREE.Mesh(tube, pulseMat)
    root.add(mesh)
    s.signalPulses.push({ mat: pulseMat, t: Math.random(), speed: 0.16 + Math.random()*0.24 })
  })
}
