import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// OrbitControls via CDN-style dynamic import fallback
declare global {
  interface Window { _orbitLoaded?: boolean }
}

const BW = 3.8, BD = 3.4, BY = 0.06

export default function PCBViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<{
    renderer?: THREE.WebGLRenderer
    scene?: THREE.Scene
    camera?: THREE.PerspectiveCamera
    controls?: any
    cpu?: THREE.PointLight
    glows: Array<{ m: THREE.Mesh; type: string; col?: string; ph?: number }>
    shaders: THREE.ShaderMaterial[]
    pts?: THREE.Points
    ppos?: Float32Array
    pcol?: Float32Array
    psz?: Float32Array
    paths?: THREE.CatmullRomCurve3[]
    particles?: Array<{ pi: number; t: number; spd: number; col: THREE.Color; sz: number }>
    time: number
    rid?: number
    lt: number
  }>({ glows: [], shaders: [], time: 0, lt: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const s = stateRef.current

    const W = el.clientWidth || 520
    const H = el.clientHeight || 400

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    el.appendChild(renderer.domElement)
    s.renderer = renderer

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050e1a)
    scene.fog = new THREE.FogExp2(0x040d1a, 0.12)
    s.scene = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 50)
    camera.position.set(0, 4.0, 5.0)
    camera.lookAt(0, 0, 0)
    s.camera = camera

    // Lights
    scene.add(new THREE.AmbientLight(0x1a2a3a, 0.8))
    const d1 = new THREE.DirectionalLight(0xffffff, 1.4); d1.position.set(3, 7, 5); scene.add(d1)
    const d2 = new THREE.DirectionalLight(0xffffff, 0.6); d2.position.set(-5, 4, -2); scene.add(d2)
    const d3 = new THREE.DirectionalLight(0x7799bb, 0.5); d3.position.set(0, 8, -5); scene.add(d3)
    const cpu = new THREE.PointLight(0x00aaff, 0.008, 1.5)
    cpu.position.set(0, 0.4, 0); scene.add(cpu); s.cpu = cpu

    buildBoard(scene, s)
    buildParticles(scene, s)

    // OrbitControls — load from CDN
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'
    script.onload = () => {
      const OC = (THREE as any).OrbitControls
      if (OC) {
        const ctrl = new OC(camera, renderer.domElement)
        ctrl.enableDamping = true; ctrl.dampingFactor = 0.06
        ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.6
        ctrl.minDistance = 2.5; ctrl.maxDistance = 11
        ctrl.maxPolarAngle = Math.PI * 0.46
        s.controls = ctrl
      }
    }
    document.head.appendChild(script)

    // Resize
    const onResize = () => {
      const nW = el.clientWidth, nH = el.clientHeight
      camera.aspect = nW / nH; camera.updateProjectionMatrix()
      renderer.setSize(nW, nH)
    }
    window.addEventListener('resize', onResize)

    // Loop
    const loop = () => {
      s.rid = requestAnimationFrame(loop)
      const now = performance.now() * 0.001
      const dt = Math.min(now - s.lt, 0.05); s.lt = now; s.time += dt
      if (s.controls) s.controls.update()
      if (s.cpu) {
        const p = Math.sin(s.time * 2.4) * 0.5 + 0.5
        s.cpu.intensity = 0.004 + p * 0.006
      }
      s.glows.forEach(g => {
        if (g.type === 'core') {
          const p = Math.sin(s.time * 2.4) * 0.5 + 0.5
          ;(g.m.material as THREE.MeshBasicMaterial).opacity = 0.05 + p * 0.07
        } else if (g.type === 'led' && g.col) {
          const p = Math.sin(s.time * 1.5 + (g.ph ?? 0)) * 0.5 + 0.5
          const c = new THREE.Color(g.col); c.multiplyScalar(0.4 + p * 0.6)
          ;(g.m.material as THREE.MeshBasicMaterial).color = c
        }
      })
      s.shaders.forEach(sm => sm.uniforms.time.value = s.time)
      updateParticles(dt, s)
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
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#071524' }} />
  )
}

function buildBoard(scene: THREE.Scene, s: any) {
  const g = new THREE.Group(); scene.add(g)
  g.add(new THREE.Mesh(new THREE.BoxGeometry(BW, 0.12, BD),
    new THREE.MeshPhysicalMaterial({ color: 0x0a2810, roughness: 0.75, metalness: 0.05, emissive: 0x001400, emissiveIntensity: 0.05 })))
  const em = new THREE.MeshPhysicalMaterial({ color: 0xd4a017, roughness: 0.2, metalness: 0.9 });
  [-BD / 2 + 0.06, BD / 2 - 0.06].forEach(z => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.13, 0.1), em.clone()); e.position.set(0, 0, z); g.add(e)
  })
  const cm = new THREE.MeshPhysicalMaterial({ color: 0xc87533, roughness: 0.25, metalness: 0.85 });
  [[0,0,0,-1.4],[0,0,0,1.4],[0,0,-1.6,0],[0,0,1.6,0],[-1.6,-1,1.6,-1],[-1.6,1,1.6,1],
   [-1.6,-1.4,-1.6,1.4],[1.6,-1.4,1.6,1.4],[-.8,-.6,-1.6,-1],[.8,-.6,1.6,-1],
   [-.8,.6,-1.6,1],[.8,.6,1.6,1],[-.5,-1,-.5,-1.4],[.5,-1,.5,-1.4],[-.5,1,-.5,1.4],[.5,1,.5,1.4]
  ].forEach(([x1,z1,x2,z2]) => {
    const len = Math.sqrt((x2-x1)**2 + (z2-z1)**2); if (len < 0.01) return
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.013, len), cm.clone())
    m.position.set((x1+x2)/2, BY+0.006, (z1+z2)/2); m.rotation.y = Math.atan2(x2-x1, z2-z1); g.add(m)
  });
  [[0,0,0,-1.4],[0,0,0,1.4],[-1.6,-1,1.6,-1],[-1.6,1,1.6,1]].forEach(([x1,z1,x2,z2]) => {
    const len = Math.sqrt((x2-x1)**2 + (z2-z1)**2)
    const sm = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, col: { value: new THREE.Color(0x00a8cc) } },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform float time;uniform vec3 col;varying vec2 vUv;void main(){float p=pow(sin(vUv.y*10.0-time*3.2)*.5+.5,4.0);float e=smoothstep(0.,.5,1.-abs(vUv.x-.5)*2.);gl_FragColor=vec4(col*(1.+p*.25),p*e*.38);}`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    })
    s.shaders.push(sm)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.055, len), sm)
    m.position.set((x1+x2)/2, BY+0.017, (z1+z2)/2)
    m.rotation.x = -Math.PI/2; m.rotation.z = Math.atan2(x2-x1, z2-z1); g.add(m)
  })
  buildCPU(g, s)
  const capm = new THREE.MeshPhysicalMaterial({ color: 0x886644, roughness: 0.6, metalness: 0.2 });
  [[-0.9,-.5],[.9,-.5],[-0.9,.5],[.9,.5],[-1.2,-1.1],[1.2,-1.1],[-1.2,1.1],[1.2,1.1],[-0.4,-1.2],[.4,-1.2],[-0.4,1.2],[.4,1.2]
  ].forEach(([x,z]) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.12,14), capm.clone()); c.position.set(x, BY+0.06, z); g.add(c)
  })
  const resm = new THREE.MeshPhysicalMaterial({ color: 0x443322, roughness: 0.8 });
  [[-1.4,0],[1.4,0],[0,-1.55],[0,1.55],[-1,.8],[1,.8],[-1,-.8],[1,-.8],[-1.3,-.4],[1.3,-.4],[-1.3,.4],[1.3,.4]
  ].forEach(([x,z]) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.03,0.035), resm.clone())
    r.position.set(x, BY+0.015, z); r.rotation.y = Math.random()*Math.PI; g.add(r)
  })
  const icm = new THREE.MeshPhysicalMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 });
  [[-1,-1.2],[1,-1.2],[-1,1.2],[1,1.2]].forEach(([x,z]) => {
    const ic = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.05,0.18), icm.clone()); ic.position.set(x, BY+0.025, z); g.add(ic)
  });
  [['#00cc44'],['#ff4400'],['#0055ee']].forEach(([c],i) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.035,10,10), new THREE.MeshBasicMaterial({ color: c }))
    l.position.set(-1.55, BY+0.04, -1.3+(i*0.2)); g.add(l)
    s.glows.push({ m: l, type: 'led', col: c, ph: i*1.2 })
  })
  const vm = new THREE.MeshPhysicalMaterial({ color: 0xd4a017, roughness: 0.3, metalness: 0.9 });
  [[-1.6,-1.4],[-1.6,0],[-1.6,1.4],[1.6,-1.4],[1.6,0],[1.6,1.4],[0,-1.4],[0,1.4],[.5,-1.4],[-.5,-1.4]
  ].forEach(([x,z]) => {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.017,0.017,0.15,8), vm.clone()); v.position.set(x, 0, z); g.add(v)
  })
  const usm = new THREE.MeshPhysicalMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.95 });
  [[-.5,BD/2],[0,BD/2],[.5,BD/2]].forEach(([x,z]) => {
    const u = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.1,0.1), usm.clone()); u.position.set(x, BY+0.05, z-0.05); g.add(u)
  })
  const eth = new THREE.Mesh(new THREE.BoxGeometry(0.44,0.22,0.28), new THREE.MeshPhysicalMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 }))
  eth.position.set(-1.2, BY+0.11, BD/2-0.11); g.add(eth)
  g.rotation.x = -0.05
}

function buildCPU(parent: THREE.Group, s: any) {
  const cg = new THREE.Group()
  cg.add(new THREE.Mesh(new THREE.BoxGeometry(0.68,0.075,0.68),
    new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.7, emissive: 0x000615, emissiveIntensity: 0.1 })))
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.58,0.01,0.58),
    new THREE.MeshPhysicalMaterial({ color: 0x222222, roughness: 0.1, metalness: 0.95, emissive: 0x001225, emissiveIntensity: 0.14 }))
  top.position.y = 0.043; cg.add(top)
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.003,20),
    new THREE.MeshBasicMaterial({ color: 0x0090bb, transparent: true, opacity: 0.12 }))
  core.position.y = 0.049; cg.add(core); s.glows.push({ m: core, type: 'core' })
  const bm = new THREE.MeshPhysicalMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.9 })
  for (let xi = -3; xi <= 3; xi++) for (let zi = -3; zi <= 3; zi++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.013,6,6), bm); b.position.set(xi*0.09,-0.046,zi*0.09); cg.add(b)
  }
  cg.position.set(0, BY+0.038, 0); parent.add(cg)
}

function buildParticles(scene: THREE.Scene, s: any) {
  const N = 100
  s.ppos = new Float32Array(N*3); s.pcol = new Float32Array(N*3); s.psz = new Float32Array(N)
  const pal = [new THREE.Color(0x00a8cc), new THREE.Color(0x0055bb), new THREE.Color(0x5533aa), new THREE.Color(0x00aa55)]
  const pd = [
    [{x:0,y:BY+.08,z:0},{x:0,y:BY+.08,z:-1.4},{x:-1.6,y:BY+.08,z:-1}],
    [{x:0,y:BY+.08,z:0},{x:0,y:BY+.08,z:1.4},{x:1.6,y:BY+.08,z:1}],
    [{x:-1.6,y:BY+.08,z:-1},{x:0,y:BY+.08,z:-1},{x:1.6,y:BY+.08,z:-1}],
    [{x:-1.6,y:BY+.08,z:1},{x:0,y:BY+.08,z:1},{x:1.6,y:BY+.08,z:1}],
    [{x:-1.6,y:BY+.08,z:-1.4},{x:-1.6,y:BY+.08,z:0},{x:-1.6,y:BY+.08,z:1.4}],
    [{x:1.6,y:BY+.08,z:-1.4},{x:1.6,y:BY+.08,z:0},{x:1.6,y:BY+.08,z:1.4}],
  ]
  s.paths = pd.map((pts: any[]) => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y, p.z))))
  s.particles = Array.from({ length: N }, () => ({
    pi: Math.floor(Math.random() * s.paths.length),
    t: Math.random(), spd: 0.04 + Math.random()*0.09,
    col: pal[Math.floor(Math.random()*4)].clone(), sz: 1.5 + Math.random()*3
  }))
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(s.ppos, 3))
  geo.setAttribute('aColor', new THREE.BufferAttribute(s.pcol, 3))
  geo.setAttribute('size', new THREE.BufferAttribute(s.psz, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `attribute float size;attribute vec3 aColor;varying vec3 vC;void main(){vC=aColor;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*(220./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec3 vC;void main(){vec2 uv=gl_PointCoord-.5;float d=length(uv);if(d>.5)discard;float a=pow(1.-smoothstep(0.,.5,d),1.5);gl_FragColor=vec4(vC,a*.65);}`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  })
  s.pts = new THREE.Points(geo, mat); scene.add(s.pts)
}

function updateParticles(dt: number, s: any) {
  if (!s.particles || !s.pts) return
  const pal = [new THREE.Color(0x00a8cc), new THREE.Color(0x0055bb), new THREE.Color(0x5533aa), new THREE.Color(0x00aa55)]
  s.particles.forEach((p: any, i: number) => {
    p.t += p.spd * dt
    if (p.t >= 1) {
      s.particles[i] = { pi: Math.floor(Math.random()*s.paths.length), t: 0, spd: 0.04+Math.random()*0.09, col: pal[Math.floor(Math.random()*4)].clone(), sz: 1.5+Math.random()*3 }
      p = s.particles[i]
    }
    const pt = s.paths[p.pi].getPoint(Math.min(p.t, 1))
    s.ppos[i*3]=pt.x; s.ppos[i*3+1]=pt.y; s.ppos[i*3+2]=pt.z
    s.pcol[i*3]=p.col.r; s.pcol[i*3+1]=p.col.g; s.pcol[i*3+2]=p.col.b
    s.psz[i]=p.sz
  })
  s.pts.geometry.attributes.position.needsUpdate = true
  s.pts.geometry.attributes.aColor.needsUpdate = true
  s.pts.geometry.attributes.size.needsUpdate = true
}
