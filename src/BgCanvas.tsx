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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 120)
    camera.position.z = 10

    // ── Mouse parallax state ─────────────────────────────────
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    const onMouseMove = (e: MouseEvent) => {
      mouse.tx = (e.clientX / window.innerWidth  - 0.5) * 2.2
      mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 1.6
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })

    // ── Layer groups (parallax depth) ────────────────────────
    const gFar  = new THREE.Group()
    const gMid  = new THREE.Group()
    const gNear = new THREE.Group()
    scene.add(gFar, gMid, gNear)

    // ── PCB grid traces ──────────────────────────────────────
    const addGrid = (group: THREE.Group, z: number, alpha: number) => {
      const mat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: alpha })
      for (let y = -9; y <= 9; y += 1.4) {
        const pts = [new THREE.Vector3(-20, y, z), new THREE.Vector3(20, y, z)]
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat.clone()))
      }
      for (let x = -20; x <= 20; x += 2.1) {
        const pts = [new THREE.Vector3(x, -10, z), new THREE.Vector3(x, 10, z)]
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat.clone()))
      }
    }
    addGrid(gFar,  -3, 0.020)
    addGrid(gMid,   0, 0.036)
    addGrid(gNear,  1.5, 0.016)

    // ── Fiber optic curves ───────────────────────────────────
    type Fiber = { line: THREE.Line; speed: number; phase: number }
    const fibers: Fiber[] = []

    const addFibers = (group: THREE.Group, count: number, baseZ: number) => {
      for (let i = 0; i < count; i++) {
        const pts: THREE.Vector3[] = []
        const y0 = (Math.random() - 0.5) * 12
        for (let j = 0; j <= 28; j++) {
          pts.push(new THREE.Vector3(
            -16 + j * 1.15,
            y0 + Math.sin(j * 0.28 + i * 1.7) * (0.3 + Math.random() * 0.25),
            baseZ + (Math.random() - 0.5) * 0.6
          ))
        }
        const curve = new THREE.CatmullRomCurve3(pts)
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(110))
        const mat = new THREE.LineBasicMaterial({
          color: i % 4 !== 0 ? 0x00e5ff : 0x00ff9d,
          transparent: true,
          opacity: 0.03 + Math.random() * 0.09,
        })
        const line = new THREE.Line(geo, mat)
        group.add(line)
        fibers.push({ line, speed: 0.2 + Math.random() * 0.6, phase: Math.random() * Math.PI * 2 })
      }
    }
    addFibers(gFar,  14, -2)
    addFibers(gMid,  10,  0)
    addFibers(gNear,  6,  1.5)

    // ── Intersection nodes ───────────────────────────────────
    type Node = { mesh: THREE.Mesh; base: number; speed: number; phase: number }
    const nodeList: Node[] = []
    for (let i = 0; i < 32; i++) {
      const geo = new THREE.CircleGeometry(i % 5 === 0 ? 0.055 : 0.022, 8)
      const mat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0x00ff9d : 0x00e5ff, transparent: true, opacity: 0 })
      const mesh = new THREE.Mesh(geo, mat)
      const lyr = i % 3
      mesh.position.set((Math.random() - 0.5) * 28, (Math.random() - 0.5) * 12, lyr === 0 ? -2.5 : lyr === 1 ? 0 : 1.5)
      scene.add(mesh)
      nodeList.push({ mesh, base: 0.12 + Math.random() * 0.28, speed: 0.5 + Math.random() * 1.5, phase: Math.random() * Math.PI * 2 })
    }

    // ── Ripples ──────────────────────────────────────────────
    type Ripple = { mesh: THREE.Mesh; t: number; dur: number }
    const ripples: Ripple[] = []
    let lastRippleT = 0
    const spawnRipple = () => {
      const mat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.4 ? 0x00e5ff : 0x00ff9d, transparent: true, opacity: 0, side: THREE.DoubleSide })
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.06, 48), mat)
      mesh.position.set((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 1)
      scene.add(mesh)
      ripples.push({ mesh, t: 0, dur: 2.4 + Math.random() * 2.2 })
    }
    for (let i = 0; i < 6; i++) spawnRipple()

    // ── Particle flow ─────────────────────────────────────────
    type Particle = { mesh: THREE.Mesh; vx: number; vy: number; life: number; maxLife: number }
    const particles: Particle[] = []
    const spawnParticle = (randomX = false) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0 })
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.012, 6), mat)
      const maxLife = 2.5 + Math.random() * 3
      mesh.position.set(randomX ? (Math.random() - 0.5) * 32 : -16 + Math.random() * 2, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 1.5)
      scene.add(mesh)
      particles.push({ mesh, vx: 0.04 + Math.random() * 0.08, vy: (Math.random() - 0.5) * 0.015, life: randomX ? Math.random() * maxLife : 0, maxLife })
    }
    for (let i = 0; i < 22; i++) spawnParticle(true)

    // ── Scroll intensity ──────────────────────────────────────
    let scrollInt = 1
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollInt = max > 0 ? 0.65 + (window.scrollY / max) * 0.6 : 1
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // ── Render loop ───────────────────────────────────────────
    let raf: number
    let frame = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      frame++
      if (frame % 2 !== 0) return

      const t = frame * 0.016

      // Parallax
      mouse.x += (mouse.tx - mouse.x) * 0.04
      mouse.y += (mouse.ty - mouse.y) * 0.04
      gNear.position.set(mouse.x * 0.18, mouse.y * 0.12, 0)
      gMid.position.set(mouse.x * 0.09, mouse.y * 0.06, 0)
      gFar.position.set(mouse.x * 0.03, mouse.y * 0.02, 0)
      camera.position.x = mouse.x * 0.06
      camera.position.y = mouse.y * 0.04

      // Fibers
      fibers.forEach(({ line, speed, phase }) => {
        ;(line.material as THREE.LineBasicMaterial).opacity = (0.02 + (Math.sin(t * speed + phase) * 0.5 + 0.5) * 0.1) * scrollInt
      })

      // Nodes
      nodeList.forEach(({ mesh, base, speed, phase }) => {
        ;(mesh.material as THREE.MeshBasicMaterial).opacity = base * (Math.sin(t * speed + phase) * 0.5 + 0.5) * scrollInt
      })

      // Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]; r.t += 0.03
        const p = r.t / r.dur
        r.mesh.scale.setScalar(1 + p * 12)
        ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.28 * (1 - p) ** 2 * scrollInt
        if (r.t >= r.dur) {
          scene.remove(r.mesh)
          ;(r.mesh.material as THREE.MeshBasicMaterial).dispose()
          r.mesh.geometry.dispose()
          ripples.splice(i, 1)
        }
      }
      if (ripples.length < 8 && t - lastRippleT > 0.7) { spawnRipple(); lastRippleT = t }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.life += 0.03
        const lp = p.life / p.maxLife
        p.mesh.position.x += p.vx
        p.mesh.position.y += p.vy
        const o = lp < 0.2 ? lp / 0.2 : lp > 0.8 ? (1 - lp) / 0.2 : 1
        ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = o * 0.55 * scrollInt
        if (p.mesh.position.x > 18 || p.life >= p.maxLife) {
          scene.remove(p.mesh);(p.mesh.material as THREE.MeshBasicMaterial).dispose(); p.mesh.geometry.dispose()
          particles.splice(i, 1); spawnParticle()
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const nW = window.innerWidth; const nH = window.innerHeight
      camera.aspect = nW / nH; camera.updateProjectionMatrix(); renderer.setSize(nW, nH)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}
