import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ── helpers ──────────────────────────────────────────────────
const rng = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

// ── Trace path type ───────────────────────────────────────────
type TracePath = { pts: THREE.Vector3[]; len: number }

// Build an L-shaped trace between two 2D points on the PCB surface (z = boardZ)
function makeTrace(
  x0: number, y0: number,
  x1: number, y1: number,
  boardZ: number,
  corner: 'h-first' | 'v-first' = 'h-first'
): TracePath {
  const pts: THREE.Vector3[] = []
  if (corner === 'h-first') {
    pts.push(new THREE.Vector3(x0, y0, boardZ))
    pts.push(new THREE.Vector3(x1, y0, boardZ))
    pts.push(new THREE.Vector3(x1, y1, boardZ))
  } else {
    pts.push(new THREE.Vector3(x0, y0, boardZ))
    pts.push(new THREE.Vector3(x0, y1, boardZ))
    pts.push(new THREE.Vector3(x1, y1, boardZ))
  }
  let len = 0
  for (let i = 0; i < pts.length - 1; i++) len += pts[i].distanceTo(pts[i + 1])
  return { pts, len }
}

// ── Main component ────────────────────────────────────────────
export default function PCBHero() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const W = mount.clientWidth || window.innerWidth
    const H = mount.clientHeight || window.innerHeight

    // ── Renderer ─────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
    renderer.shadowMap.enabled = false
    mount.appendChild(renderer.domElement)

    // ── Scene / Camera ────────────────────────────────────────
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200)
    camera.position.set(0, 2.5, 11)
    camera.lookAt(0, 0, 0)

    // ── Lighting ──────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x0a1628, 2.5)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0x00e5ff, 1.2)
    keyLight.position.set(4, 6, 8)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x00ff9d, 0.5)
    fillLight.position.set(-6, -2, 4)
    scene.add(fillLight)

    // ── Board group (everything rotates together) ─────────────
    const board = new THREE.Group()
    scene.add(board)

    const BW = 10    // board width
    const BH = 6.2   // board height
    const BD = 0.12  // board depth (thin)
    const SURF = BD / 2   // z of top surface (+)
    const BACK = -BD / 2  // z of back surface (-)

    // PCB substrate
    const boardGeo = new THREE.BoxGeometry(BW, BH, BD)
    const boardMat = new THREE.MeshPhongMaterial({
      color: 0x040f1e,
      emissive: 0x010608,
      shininess: 60,
      specular: 0x003344,
    })
    const boardMesh = new THREE.Mesh(boardGeo, boardMat)
    board.add(boardMesh)

    // Board edge glow
    const edgeGeo = new THREE.EdgesGeometry(boardGeo)
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.22 })
    board.add(new THREE.LineSegments(edgeGeo, edgeMat))

    // ── Grid traces (fine PCB grid) ───────────────────────────
    const traceGridMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.06 })
    const GRID = 0.55
    for (let x = -BW / 2 + GRID; x < BW / 2; x += GRID) {
      const pts = [new THREE.Vector3(x, -BH / 2 + 0.02, SURF), new THREE.Vector3(x, BH / 2 - 0.02, SURF)]
      board.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), traceGridMat))
    }
    for (let y = -BH / 2 + GRID; y < BH / 2; y += GRID) {
      const pts = [new THREE.Vector3(-BW / 2 + 0.02, y, SURF), new THREE.Vector3(BW / 2 - 0.02, y, SURF)]
      board.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), traceGridMat))
    }

    // ── IC chips ──────────────────────────────────────────────
    type Component = { x: number; y: number; w: number; h: number; color: number }
    const components: Component[] = []

    const addIC = (x: number, y: number, w: number, h: number, color = 0x112233) => {
      const geo = new THREE.BoxGeometry(w, h, 0.06)
      const mat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.15 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, SURF + 0.03)
      board.add(mesh)

      // Pin markings on edges
      const pinMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.5 })
      const pinCount = Math.floor(w / 0.2)
      for (let i = 0; i < pinCount; i++) {
        const px = x - w / 2 + (i + 0.5) * (w / pinCount)
        const linePts = [
          new THREE.Vector3(px, y + h / 2, SURF + 0.065),
          new THREE.Vector3(px, y + h / 2 + 0.12, SURF + 0.065),
        ]
        board.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), pinMat))
        const linePts2 = [
          new THREE.Vector3(px, y - h / 2, SURF + 0.065),
          new THREE.Vector3(px, y - h / 2 - 0.12, SURF + 0.065),
        ]
        board.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts2), pinMat))
      }
      // IC edge
      const icEdge = new THREE.EdgesGeometry(geo)
      const icEdgeMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.3 })
      const icLines = new THREE.LineSegments(icEdge, icEdgeMat)
      icLines.position.set(x, y, SURF + 0.03)
      board.add(icLines)

      components.push({ x, y, w, h, color })
    }

    // Main SOC
    addIC(0, 0.3, 2.2, 1.6, 0x081522)
    // Memory chips
    addIC(-2.8, 0.8, 1.2, 0.9, 0x091a1a)
    addIC( 2.8, 0.8, 1.2, 0.9, 0x091a1a)
    addIC(-2.8,-0.8, 1.2, 0.9, 0x091a1a)
    addIC( 2.8,-0.8, 1.2, 0.9, 0x091a1a)
    // Smaller ICs
    addIC(-3.8, 2.0, 0.7, 0.5, 0x0a1520)
    addIC( 3.8, 2.0, 0.7, 0.5, 0x0a1520)
    addIC(-3.8,-2.0, 0.7, 0.5, 0x0a1520)
    addIC( 3.8,-2.0, 0.7, 0.5, 0x0a1520)
    addIC( 0,  2.3, 0.9, 0.5, 0x0a1820)
    addIC( 0, -2.3, 0.9, 0.5, 0x0a1820)

    // ── Capacitors / resistors (tiny) ─────────────────────────
    for (let i = 0; i < 28; i++) {
      const x = rng(-BW / 2 + 0.4, BW / 2 - 0.4)
      const y = rng(-BH / 2 + 0.4, BH / 2 - 0.4)
      const isCap = Math.random() > 0.5
      const geo = isCap
        ? new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8)
        : new THREE.BoxGeometry(0.18, 0.1, 0.07)
      const mat = new THREE.MeshPhongMaterial({
        color: isCap ? 0x111122 : 0x1a1208,
        emissive: isCap ? 0x000011 : 0x080600,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, SURF + (isCap ? 0.07 : 0.035))
      if (isCap) mesh.rotation.x = Math.PI / 2
      board.add(mesh)
    }

    // ── Via holes ─────────────────────────────────────────────
    for (let i = 0; i < 40; i++) {
      const x = rng(-BW / 2 + 0.3, BW / 2 - 0.3)
      const y = rng(-BH / 2 + 0.3, BH / 2 - 0.3)
      const geo = new THREE.CircleGeometry(0.035, 8)
      const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, SURF + 0.001)
      board.add(mesh)
    }

    // ── Signal traces (L-shaped, bright) ──────────────────────
    const traceMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.55 })
    const traceMatG = new THREE.LineBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.45 })

    type ActiveTrace = { path: TracePath; t: number; speed: number; mat: THREE.LineBasicMaterial }
    const activeTraces: ActiveTrace[] = []
    const tracePaths: TracePath[] = []

    // Generate random L-shaped traces across the board
    for (let i = 0; i < 36; i++) {
      const x0 = rng(-BW / 2 + 0.3, BW / 2 - 0.3)
      const y0 = rng(-BH / 2 + 0.3, BH / 2 - 0.3)
      const x1 = rng(-BW / 2 + 0.3, BW / 2 - 0.3)
      const y1 = rng(-BH / 2 + 0.3, BH / 2 - 0.3)
      const corner = pick<'h-first' | 'v-first'>(['h-first', 'v-first'])
      const tp = makeTrace(x0, y0, x1, y1, SURF + 0.002, corner)
      tracePaths.push(tp)

      const m = Math.random() > 0.3 ? traceMat.clone() : traceMatG.clone()
      const geo = new THREE.BufferGeometry().setFromPoints(tp.pts)
      board.add(new THREE.Line(geo, m))
    }

    // ── Pulse system ──────────────────────────────────────────
    // A glowing dot travels along each trace path
    const pulseMeshes: { mesh: THREE.Mesh; path: TracePath; t: number; speed: number }[] = []

    const spawnPulse = () => {
      if (tracePaths.length === 0) return
      const path = pick(tracePaths)
      const geo = new THREE.CircleGeometry(0.055, 8)
      const isCyan = Math.random() > 0.35
      const mat = new THREE.MeshBasicMaterial({
        color: isCyan ? 0x00e5ff : 0x00ff9d,
        transparent: true,
        opacity: 0,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.lookAt(0, 0, 10)
      board.add(mesh)
      pulseMeshes.push({ mesh, path, t: 0, speed: rng(0.12, 0.28) })
    }

    for (let i = 0; i < 16; i++) spawnPulse()

    // Helper: position along path by normalized t (0→1)
    const getPosOnPath = (path: TracePath, t: number): THREE.Vector3 => {
      const dist = t * path.len
      let acc = 0
      for (let i = 0; i < path.pts.length - 1; i++) {
        const seg = path.pts[i].distanceTo(path.pts[i + 1])
        if (acc + seg >= dist) {
          const local = (dist - acc) / seg
          return path.pts[i].clone().lerp(path.pts[i + 1], local)
        }
        acc += seg
      }
      return path.pts[path.pts.length - 1].clone()
    }

    // ── Connector pads on board edge ──────────────────────────
    const padMat = new THREE.MeshPhongMaterial({ color: 0x00e5ff, emissive: 0x004455, emissiveIntensity: 0.5 })
    const padCount = 10
    for (let i = 0; i < padCount; i++) {
      const x = -BW / 2 + 0.6 + i * ((BW - 1.2) / (padCount - 1))
      const geo = new THREE.BoxGeometry(0.14, 0.08, 0.03)
      const mesh = new THREE.Mesh(geo, padMat)
      mesh.position.set(x, -BH / 2 + 0.04, SURF)
      board.add(mesh)
    }
    for (let i = 0; i < padCount; i++) {
      const x = -BW / 2 + 0.6 + i * ((BW - 1.2) / (padCount - 1))
      const geo = new THREE.BoxGeometry(0.14, 0.08, 0.03)
      const mesh = new THREE.Mesh(geo, padMat.clone())
      mesh.position.set(x, BH / 2 - 0.04, SURF)
      board.add(mesh)
    }

    // ══════════════════════════════════════════════════════════
    // ── BACK SIDE ─────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    // Back grid (green tint to visually distinguish)
    const backGridMat = new THREE.LineBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.05 })
    for (let x = -BW / 2 + GRID; x < BW / 2; x += GRID) {
      const pts = [new THREE.Vector3(x, -BH / 2 + 0.02, BACK), new THREE.Vector3(x, BH / 2 - 0.02, BACK)]
      board.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), backGridMat))
    }
    for (let y = -BH / 2 + GRID; y < BH / 2; y += GRID) {
      const pts = [new THREE.Vector3(-BW / 2 + 0.02, y, BACK), new THREE.Vector3(BW / 2 - 0.02, y, BACK)]
      board.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), backGridMat))
    }

    // Back ICs — different layout from front
    const addBackIC = (x: number, y: number, w: number, h: number, color = 0x081c18) => {
      const geo = new THREE.BoxGeometry(w, h, 0.055)
      const mat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.12 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, BACK - 0.028)
      board.add(mesh)
      // Edge glow
      const icEdgeMat = new THREE.LineBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.28 })
      const icLines = new THREE.LineSegments(new THREE.EdgesGeometry(geo), icEdgeMat)
      icLines.position.set(x, y, BACK - 0.028)
      board.add(icLines)
      // Pins (short stubs on both sides)
      const pinMat2 = new THREE.LineBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.45 })
      const pinN = Math.floor(h / 0.22)
      for (let i = 0; i < pinN; i++) {
        const py = y - h / 2 + (i + 0.5) * (h / pinN)
        ;[x - w / 2, x + w / 2].forEach((px, side) => {
          const dir = side === 0 ? -0.13 : 0.13
          board.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(px, py, BACK - 0.01),
              new THREE.Vector3(px + dir, py, BACK - 0.01),
            ]),
            pinMat2
          ))
        })
      }
    }

    // Back component layout — rows of memory / power section
    addBackIC(-3.2,  1.6, 1.4, 1.0, 0x081a14)
    addBackIC(-3.2,  0.0, 1.4, 1.0, 0x081a14)
    addBackIC(-3.2, -1.6, 1.4, 1.0, 0x081a14)
    addBackIC( 3.2,  1.6, 1.4, 1.0, 0x081a14)
    addBackIC( 3.2,  0.0, 1.4, 1.0, 0x081a14)
    addBackIC( 3.2, -1.6, 1.4, 1.0, 0x081a14)
    addBackIC( 0.0,  1.8, 1.8, 0.8, 0x0a1a10)
    addBackIC( 0.0, -1.8, 1.8, 0.8, 0x0a1a10)
    // Power regulators (tall rectangular)
    addBackIC(-1.4,  0.0, 0.6, 1.8, 0x101808)
    addBackIC( 1.4,  0.0, 0.6, 1.8, 0x101808)

    // Back capacitors / resistors
    for (let i = 0; i < 32; i++) {
      const x = rng(-BW / 2 + 0.4, BW / 2 - 0.4)
      const y = rng(-BH / 2 + 0.4, BH / 2 - 0.4)
      const isCap = Math.random() > 0.45
      const geo = isCap
        ? new THREE.CylinderGeometry(0.055, 0.055, 0.12, 8)
        : new THREE.BoxGeometry(0.16, 0.09, 0.065)
      const mat = new THREE.MeshPhongMaterial({ color: isCap ? 0x0a1a10 : 0x141008 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, BACK - (isCap ? 0.06 : 0.032))
      if (isCap) mesh.rotation.x = Math.PI / 2
      board.add(mesh)
    }

    // Back vias (same positions won't match exactly — scatter new ones)
    for (let i = 0; i < 44; i++) {
      const x = rng(-BW / 2 + 0.3, BW / 2 - 0.3)
      const y = rng(-BH / 2 + 0.3, BH / 2 - 0.3)
      const geo = new THREE.CircleGeometry(0.033, 8)
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.4 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, BACK - 0.001)
      mesh.rotation.y = Math.PI  // face outward
      board.add(mesh)
    }

    // Back traces (L-shaped, green)
    const backTraceMat = new THREE.LineBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.52 })
    const backTracePaths: TracePath[] = []
    for (let i = 0; i < 32; i++) {
      const x0 = rng(-BW / 2 + 0.3, BW / 2 - 0.3)
      const y0 = rng(-BH / 2 + 0.3, BH / 2 - 0.3)
      const x1 = rng(-BW / 2 + 0.3, BW / 2 - 0.3)
      const y1 = rng(-BH / 2 + 0.3, BH / 2 - 0.3)
      const corner = pick<'h-first' | 'v-first'>(['h-first', 'v-first'])
      const tp = makeTrace(x0, y0, x1, y1, BACK - 0.002, corner)
      backTracePaths.push(tp)
      board.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tp.pts), backTraceMat.clone()))
    }

    // Back pulses — separate from front pulses
    const backPulses: { mesh: THREE.Mesh; path: TracePath; t: number; speed: number }[] = []
    const spawnBackPulse = () => {
      if (backTracePaths.length === 0) return
      const path = pick(backTracePaths)
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0 })
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), mat)
      mesh.rotation.y = Math.PI
      board.add(mesh)
      backPulses.push({ mesh, path, t: 0, speed: rng(0.10, 0.26) })
    }
    for (let i = 0; i < 12; i++) spawnBackPulse()

    // Back connector pads (bottom edge, opposite side)
    const backPadMat = new THREE.MeshPhongMaterial({ color: 0x00ff9d, emissive: 0x004422, emissiveIntensity: 0.5 })
    for (let i = 0; i < padCount; i++) {
      const x = -BW / 2 + 0.6 + i * ((BW - 1.2) / (padCount - 1))
      const geo = new THREE.BoxGeometry(0.14, 0.08, 0.03)
      const mesh = new THREE.Mesh(geo, backPadMat.clone())
      mesh.position.set(x, -BH / 2 + 0.04, BACK)
      board.add(mesh)
    }
    // Left/right edge connectors on back
    for (let i = 0; i < 6; i++) {
      const y = -BH / 2 + 0.6 + i * ((BH - 1.2) / 5)
      const geo = new THREE.BoxGeometry(0.08, 0.14, 0.03)
      const mesh = new THREE.Mesh(geo, backPadMat.clone())
      mesh.position.set(-BW / 2 + 0.04, y, BACK)
      board.add(mesh)
      const mesh2 = new THREE.Mesh(geo, backPadMat.clone())
      mesh2.position.set(BW / 2 - 0.04, y, BACK)
      board.add(mesh2)
    }

    // ── Mouse tilt ────────────────────────────────────────────
    const mouse = { tx: 0, ty: 0, cx: 0, cy: 0 }
    const onMouse = (e: MouseEvent) => {
      mouse.tx =  (e.clientX / window.innerWidth  - 0.5) * 0.4
      mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 0.28
    }
    window.addEventListener('mousemove', onMouse, { passive: true })

    // ── Animation ─────────────────────────────────────────────
    let raf: number
    let frame = 0
    let lastSpawn = 0

    const animate = () => {
      raf = requestAnimationFrame(animate)
      frame++
      if (frame % 2 !== 0) return  // 30fps

      const t = frame * 0.016

      // Auto-rotate + mouse tilt
      mouse.cx += (mouse.tx - mouse.cx) * 0.035
      mouse.cy += (mouse.ty - mouse.cy) * 0.035
      board.rotation.y = t * 0.12 + mouse.cx
      board.rotation.x = -0.25 + mouse.cy

      // Pulse animation
      for (let i = pulseMeshes.length - 1; i >= 0; i--) {
        const p = pulseMeshes[i]
        p.t += p.speed * 0.016

        if (p.t > 1) {
          board.remove(p.mesh)
          ;(p.mesh.material as THREE.MeshBasicMaterial).dispose()
          p.mesh.geometry.dispose()
          pulseMeshes.splice(i, 1)
          continue
        }

        // fade in/out at ends
        const fade = p.t < 0.15 ? p.t / 0.15 : p.t > 0.85 ? (1 - p.t) / 0.15 : 1
        ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.92

        const pos = getPosOnPath(p.path, p.t)
        p.mesh.position.copy(pos)
      }

      // Spawn new front pulses
      if (pulseMeshes.length < 18 && t - lastSpawn > 0.35) {
        spawnPulse(); lastSpawn = t
      }

      // Back pulse animation
      for (let i = backPulses.length - 1; i >= 0; i--) {
        const p = backPulses[i]
        p.t += p.speed * 0.016
        if (p.t > 1) {
          board.remove(p.mesh)
          ;(p.mesh.material as THREE.MeshBasicMaterial).dispose()
          p.mesh.geometry.dispose()
          backPulses.splice(i, 1)
          continue
        }
        const fade = p.t < 0.15 ? p.t / 0.15 : p.t > 0.85 ? (1 - p.t) / 0.15 : 1
        ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.88
        const pos = getPosOnPath(p.path, p.t)
        p.mesh.position.copy(pos)
      }
      if (backPulses.length < 14 && t - lastSpawn > 0.35) {
        spawnBackPulse()
      }

      renderer.render(scene, camera)
    }

    animate()

    // ── Resize ────────────────────────────────────────────────
    const onResize = () => {
      const nW = mount.clientWidth; const nH = mount.clientHeight
      camera.aspect = nW / nH; camera.updateProjectionMatrix()
      renderer.setSize(nW, nH)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', onResize)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.82,
      }}
    />
  )
}
