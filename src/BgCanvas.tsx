import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function BgCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const W = window.innerWidth
    const H = window.innerHeight

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(1)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100)
    camera.position.z = 8

    // ── Fiber optic lines ──────────────────────────────────
    type FiberLine = { line: THREE.Line; speed: number; phase: number }
    const fibers: FiberLine[] = []

    for (let i = 0; i < 28; i++) {
      const pts: THREE.Vector3[] = []
      const y0 = (Math.random() - 0.5) * 10
      const xStart = -12

      for (let j = 0; j <= 24; j++) {
        pts.push(
          new THREE.Vector3(
            xStart + j * 1.05,
            y0 + Math.sin(j * 0.35 + i * 1.3) * (0.25 + Math.random() * 0.2),
            (Math.random() - 0.5) * 0.4
          )
        )
      }

      const curve = new THREE.CatmullRomCurve3(pts)
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(90))
      const isCyan = i % 3 !== 0
      const mat = new THREE.LineBasicMaterial({
        color: isCyan ? 0x00e5ff : 0x00ff9d,
        transparent: true,
        opacity: 0.04 + Math.random() * 0.1,
      })
      const line = new THREE.Line(geo, mat)
      scene.add(line)
      fibers.push({ line, speed: 0.25 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 })
    }

    // ── Ripple system ──────────────────────────────────────
    type Ripple = { mesh: THREE.Mesh; t: number; dur: number }
    const ripples: Ripple[] = []

    const spawnRipple = () => {
      const geo = new THREE.RingGeometry(0.02, 0.055, 48)
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x00e5ff : 0x00ff9d,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 9,
        0
      )
      scene.add(mesh)
      ripples.push({ mesh, t: 0, dur: 2.2 + Math.random() * 1.8 })
    }

    for (let i = 0; i < 7; i++) spawnRipple()

    // ── Node dots ──────────────────────────────────────────
    for (let i = 0; i < 18; i++) {
      const geo = new THREE.CircleGeometry(0.018, 8)
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00e5ff : 0x00ff9d,
        transparent: true,
        opacity: 0.2 + Math.random() * 0.3,
      })
      const dot = new THREE.Mesh(geo, mat)
      dot.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 9, 0.05)
      scene.add(dot)
    }

    // ── Animation ─────────────────────────────────────────
    let raf: number
    let frame = 0
    let lastSpawnT = 0

    const animate = () => {
      raf = requestAnimationFrame(animate)
      frame++
      if (frame % 2 !== 0) return // ~30fps

      const t = frame * 0.016

      // Fiber pulse
      fibers.forEach(({ line, speed, phase }) => {
        const mat = line.material as THREE.LineBasicMaterial
        mat.opacity = 0.02 + (Math.sin(t * speed + phase) * 0.5 + 0.5) * 0.11
      })

      // Ripple lifecycle
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        r.t += 0.032
        const p = r.t / r.dur
        r.mesh.scale.set(1 + p * 9, 1 + p * 9, 1)
        ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - p) ** 2

        if (r.t >= r.dur) {
          scene.remove(r.mesh)
          ;(r.mesh.material as THREE.MeshBasicMaterial).dispose()
          ;(r.mesh.geometry as THREE.RingGeometry).dispose()
          ripples.splice(i, 1)
        }
      }

      // Spawn new ripples
      if (ripples.length < 7 && t - lastSpawnT > 0.9) {
        spawnRipple()
        lastSpawnT = t
      }

      renderer.render(scene, camera)
    }

    animate()

    const onResize = () => {
      const nW = window.innerWidth
      const nH = window.innerHeight
      camera.aspect = nW / nH
      camera.updateProjectionMatrix()
      renderer.setSize(nW, nH)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
