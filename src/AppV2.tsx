import { useState, useEffect, useRef, useCallback } from 'react'
import BgCanvas from './BgCanvas'
import './AppV2.css'

// ── GSAP dynamic import ───────────────────────────────────────
// gsap + ScrollTrigger は動的 import で読み込む
// （vite の tree-shaking に優しく、SSR 非依存）
let gsapReady = false
let gsap: typeof import('gsap')['gsap'] | null = null
let ScrollTrigger: typeof import('gsap/ScrollTrigger')['ScrollTrigger'] | null = null

async function loadGSAP() {
  if (gsapReady) return
  try {
    const mod = await import('gsap')
    const st  = await import('gsap/ScrollTrigger')
    gsap = mod.gsap
    ScrollTrigger = st.ScrollTrigger
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    gsap!.registerPlugin(ScrollTrigger)
    gsapReady = true
  } catch (_) {
    // gsap が未インストールの場合はフォールバック
  }
}

// ── Intersection-based fallback reveal ───────────────────────
function useRevealFallback() {
  useEffect(() => {
    const els = document.querySelectorAll('.gs-up, .gs-fade, .gs-left, .gs-right, .gs-scale')
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement
            el.style.transition = 'opacity 0.72s ease, transform 0.72s ease'
            el.style.opacity = '1'
            el.style.transform = 'none'
            obs.unobserve(el)
          }
        })
      },
      { threshold: 0.1 }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  })
}

// ── Counter hook ──────────────────────────────────────────────
function useCounter(target: number, run: boolean, duration = 1800) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run) return
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - (1 - t) ** 3
      setVal(Math.round(ease * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, target, duration])
  return val
}

// ── Triangle SVG ──────────────────────────────────────────────
function TriangleSvg({ active }: { active: number }) {
  const verts = [
    { x: 200, y: 20,  label: 'SIZE',  dx: 0,   dy: -18 },
    { x: 30,  y: 295, label: 'POWER', dx: -22, dy: 16  },
    { x: 370, y: 295, label: 'PERF',  dx: 20,  dy: 16  },
  ]
  return (
    <svg viewBox="0 0 400 330" className="v2-tri-svg">
      {/* Edges */}
      {[[0,1],[1,2],[2,0]].map(([a,b], i) => (
        <line key={i}
          x1={verts[a].x} y1={verts[a].y}
          x2={verts[b].x} y2={verts[b].y}
          stroke={i === active ? '#00e5ff' : 'rgba(0,229,255,0.14)'}
          strokeWidth={i === active ? 2.2 : 1}
          style={{ transition: 'all 0.45s' }}
        />
      ))}
      {/* Inner triangle fill */}
      <polygon
        points={verts.map(v => `${v.x},${v.y}`).join(' ')}
        fill="rgba(0,229,255,0.025)"
        stroke="none"
      />
      {/* Center */}
      <circle cx={200} cy={205} r={7}  fill="rgba(0,229,255,0.2)" />
      <circle cx={200} cy={205} r={3}  fill="#00e5ff" />
      {/* Center-to-vertex dashes */}
      {verts.map((v, i) => (
        <line key={i} x1={200} y1={205} x2={v.x} y2={v.y}
          stroke="rgba(0,229,255,0.1)" strokeWidth="1" strokeDasharray="5 5" />
      ))}
      {/* Vertices */}
      {verts.map((v, i) => (
        <g key={i}>
          <circle cx={v.x} cy={v.y}
            r={i === active ? 11 : 7}
            fill={i === active ? 'rgba(0,229,255,0.22)' : 'rgba(0,229,255,0.06)'}
            stroke={i === active ? '#00e5ff' : 'rgba(0,229,255,0.28)'}
            strokeWidth="1.5"
            style={{ transition: 'all 0.45s' }}
          />
          <text
            x={v.x + v.dx} y={v.y + v.dy}
            textAnchor="middle"
            fill={i === active ? '#00e5ff' : 'rgba(232,244,248,0.38)'}
            fontSize="11" fontFamily="'Courier New',monospace" letterSpacing="0.2em"
            style={{ transition: 'fill 0.45s' }}
          >{v.label}</text>
        </g>
      ))}
      <text x={200} y={196} textAnchor="middle"
        fill="rgba(0,255,157,0.55)" fontSize="8.5"
        fontFamily="'Courier New',monospace" letterSpacing="0.18em">
        TENSION FIELD
      </text>
    </svg>
  )
}

// ── Stat block ────────────────────────────────────────────────
function StatBlock({ label, target, unit, sub, color, run }: {
  label: string; target: number; unit: string; sub: string; color: string; run: boolean
}) {
  const val = useCounter(target, run)
  return (
    <div className="v2-stat gs-scale">
      <div className={`v2-stat-val ${color}`}>{val}<span className="v2-stat-unit">{unit}</span></div>
      <div className="v2-stat-label">{label}</div>
      <div className="v2-stat-sub">{sub}</div>
    </div>
  )
}

// ── Diagnostic tool ───────────────────────────────────────────
const STEPS = [
  {
    q: 'どの制約が衝突していますか？',
    sub: '現在の開発で最も詰まっている組み合わせを選んでください',
    opts: ['⚖️  サイズと性能のトレードオフ','⚡  消費電力と処理速度の限界','💰  コストとスペックの衝突','🕐  開発速度と品質の両立','🔥  複数の制約が同時に詰まっている'],
  },
  {
    q: '最も優先したい要件は？',
    sub: '1つ選んでください',
    opts: ['📦  小型化・軽量化','🔋  省電力化（バッテリー・熱設計）','🚀  高性能・高速AI処理','📉  コスト削減（量産BOM最適化）','⏱️  開発期間短縮'],
  },
  {
    q: '現在の開発フェーズは？',
    sub: '直近の状況を選んでください',
    opts: ['📋  要件定義・仕様策定中','🔌  回路設計・基板レイアウト中','🛠️  試作・評価・デバッグ中','🏭  量産準備・コスト最適化中','🔄  既存製品のリビジョン・刷新'],
  },
  {
    q: '社内リソースの状況は？',
    sub: 'チームの技術体制を教えてください',
    opts: ['❌  エッジAI・組込み専門家がいない','⚠️  専門家はいるが工数が全く足りない','🤔  技術はあるが設計判断に自信がない','🔍  外部パートナーを探している'],
  },
  {
    q: 'タイムラインは？',
    sub: '期間の目安を教えてください',
    opts: ['🔥  3ヶ月以内（緊急）','📅  6ヶ月以内','🗓️  1年以内','🔭  1年以上（長期計画）'],
  },
]

function DiagTool() {
  const [step, setStep]     = useState(0)
  const [answers, setAns]   = useState<number[]>([])
  const [sel, setSel]       = useState<number | null>(null)
  const [done, setDone]     = useState(false)

  const result = useCallback(() => {
    const team     = answers[3] ?? 0
    const priority = answers[1] ?? 0
    const phase    = answers[2] ?? 0
    if (team >= 2) return { title: 'T²が最も力を発揮できる領域です', body: '設計判断の支援から実装まで、T²のフルスタック設計力を活用できます。仕様策定段階からの参加で「成立しない設計」を根本から防ぎます。', svc: '設計コンサルティング＋基板設計' }
    if (priority <= 1) return { title: '世界最小クラスの設計実績が直接活きます', body: '38mm×34mmの実績を持つT²が、サイズ・電力・性能を同時に成立させるラインを提案。試作回数を最小化します。', svc: 'AIエッジコンピュータ設計サービス' }
    if (phase >= 2) return { title: '試作フェーズの詰まりを最短で解決できます', body: '評価・デバッグ段階からでも対応可能。T²の設計資産とファームウェア知見で問題の根本原因を特定し、再設計コストを大幅削減します。', svc: '試作・評価サポート＋再設計' }
    return { title: 'T²の設計サービスが課題を解決できます', body: '制約のトレードオフを成立させる設計がT²の本質的な強みです。まず30分のヒアリングで課題を整理しましょう。', svc: '無料30分ヒアリング' }
  }, [answers])

  const next = () => {
    if (sel === null) return
    const next_ans = [...answers, sel]
    setAns(next_ans)
    setSel(null)
    if (step < STEPS.length - 1) setStep(step + 1)
    else setDone(true)
  }

  if (done) {
    const r = result()
    return (
      <div className="v2-diag-wrap">
        <div className="v2-diag-result">
          <div className="v2-diag-result-label">DIAGNOSIS COMPLETE</div>
          <div className="v2-diag-result-title">{r.title}</div>
          <div className="v2-diag-result-body">{r.body}</div>
          <div className="v2-diag-result-svc">推奨：{r.svc}</div>
          <div className="v2-diag-result-ctas">
            <a href="https://calendly.com" target="_blank" rel="noreferrer" className="v2-btn v2-btn-primary">30分Zoom相談を予約</a>
            <a href="mailto:info@t2-laboratory.com" className="v2-btn v2-btn-outline">メールで問い合わせ</a>
            <button className="v2-btn v2-btn-ghost" onClick={() => { setStep(0); setAns([]); setSel(null); setDone(false) }}>もう一度診断する</button>
          </div>
        </div>
      </div>
    )
  }

  const cur = STEPS[step]
  return (
    <div className="v2-diag-wrap">
      <div className="v2-diag-track">
        {STEPS.map((_, i) => (
          <div key={i} className={`v2-diag-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
        ))}
      </div>
      <div className="v2-diag-q">{cur.q}</div>
      <div className="v2-diag-qsub">{cur.sub}</div>
      <div className="v2-diag-opts">
        {cur.opts.map((opt, i) => (
          <button key={i} className={`v2-diag-opt ${sel === i ? 'sel' : ''}`} onClick={() => setSel(i)}>
            <span className="v2-diag-check">✓</span>{opt}
          </button>
        ))}
      </div>
      <div className="v2-diag-nav">
        <span className="v2-diag-counter">STEP {String(step+1).padStart(2,'0')} / {String(STEPS.length).padStart(2,'0')}</span>
        <button className="v2-btn v2-btn-primary" onClick={next} disabled={sel === null} style={{ opacity: sel === null ? 0.4 : 1 }}>
          {step < STEPS.length - 1 ? 'NEXT →' : '診断結果を見る'}
        </button>
      </div>
    </div>
  )
}

// ── Main AppV2 ────────────────────────────────────────────────
export default function AppV2() {
  useRevealFallback()

  const [triActive, setTriActive]   = useState(0)
  const [statsRun,  setStatsRun]    = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  const heroTitleRef = useRef<HTMLDivElement>(null)

  // Triangle auto-rotate
  useEffect(() => {
    const t = setInterval(() => setTriActive(n => (n + 1) % 3), 2400)
    return () => clearInterval(t)
  }, [])

  // Stats trigger
  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsRun(true); obs.disconnect() } }, { threshold: 0.25 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Scroll state
  useEffect(() => {
    const h = () => {
      setShowSticky(window.scrollY > 500)
      setNavScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  // GSAP ScrollTrigger animations
  useEffect(() => {
    loadGSAP().then(() => {
      if (!gsap || !ScrollTrigger) return
      const g = gsap
      const ST = ScrollTrigger

      // Hero entrance
      g.timeline({ delay: 0.15 })
        .from('.v2-hero-eyebrow', { duration: 0.6, opacity: 0, y: 16, ease: 'power2.out' })
        .from('.v2-hero-pain-line', { duration: 0.55, opacity: 0, y: 18, stagger: 0.15, ease: 'power2.out' }, '-=0.3')
        .to('.v2-hero-divider', { duration: 0.5, width: 48, ease: 'power2.out' }, '-=0.1')
        .from('.v2-hero-title', { duration: 0.7, opacity: 0, y: 28, ease: 'power3.out' }, '-=0.2')
        .from('.v2-hero-desc', { duration: 0.55, opacity: 0, y: 16, ease: 'power2.out' }, '-=0.3')
        .from('.v2-hero-ctas .v2-btn', { duration: 0.45, opacity: 0, y: 12, stagger: 0.1, ease: 'power2.out' }, '-=0.2')
        .from('.v2-scroll-ind', { duration: 0.5, opacity: 0, ease: 'power2.out' }, '-=0.1')

      // Section labels + titles
      g.utils.toArray<HTMLElement>('.v2-label').forEach(el => {
        g.from(el, {
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
          duration: 0.55, opacity: 0, x: -18, ease: 'power2.out'
        })
      })

      g.utils.toArray<HTMLElement>('.v2-sec-title').forEach(el => {
        g.from(el, {
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          duration: 0.7, opacity: 0, y: 28, ease: 'power3.out'
        })
      })

      // Pain cards — stagger
      g.from('.v2-pain-card', {
        scrollTrigger: { trigger: '.v2-pain-grid', start: 'top 82%' },
        duration: 0.65, opacity: 0, y: 36, stagger: 0.18, ease: 'power2.out'
      })

      // Triangle section
      g.from('.v2-tri-svg', {
        scrollTrigger: { trigger: '.v2-tri-wrap', start: 'top 80%' },
        duration: 0.8, opacity: 0, scale: 0.88, ease: 'power2.out'
      })
      g.from('.v2-tri-row', {
        scrollTrigger: { trigger: '.v2-tri-info', start: 'top 80%' },
        duration: 0.55, opacity: 0, x: 22, stagger: 0.16, ease: 'power2.out'
      })

      // Flow steps
      g.from('.v2-flow-step', {
        scrollTrigger: { trigger: '.v2-flow', start: 'top 82%' },
        duration: 0.6, opacity: 0, y: 28, stagger: 0.14, ease: 'power2.out'
      })

      // Case cards
      g.from('.v2-case-card', {
        scrollTrigger: { trigger: '.v2-cases-grid', start: 'top 82%' },
        duration: 0.6, opacity: 0, y: 24, stagger: 0.14, ease: 'power2.out'
      })

      // Footer CTA cards
      g.from('.v2-footer-cta-card', {
        scrollTrigger: { trigger: '.v2-footer-cta-grid', start: 'top 85%' },
        duration: 0.55, opacity: 0, y: 22, stagger: 0.12, ease: 'power2.out'
      })

      // Diagnostic section
      g.from('.v2-diag-wrap', {
        scrollTrigger: { trigger: '.v2-diag-wrap', start: 'top 82%' },
        duration: 0.7, opacity: 0, y: 32, ease: 'power2.out'
      })

      // Horizontal rule — wipe effect
      g.utils.toArray<HTMLElement>('.v2-footer').forEach(el => {
        g.from(el, {
          scrollTrigger: { trigger: el, start: 'top 88%' },
          duration: 0.8, opacity: 0, y: 20, ease: 'power2.out'
        })
      })
    })
  }, [])

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="v2">
      <BgCanvas />

      {/* Nav */}
      <nav className={`v2-nav ${navScrolled ? 'scrolled' : ''}`}>
        <span className="v2-nav-brand">T<sup>2</sup>Laboratory</span>
        <div className="v2-nav-links">
          {[['PAIN','pain'],['SOLUTION','solution'],['CASES','cases'],['DIAGNOSE','diag']].map(([l,id]) => (
            <span key={id} className="v2-nav-link" onClick={() => scrollTo(id)}>{l}</span>
          ))}
          <button className="v2-btn v2-btn-primary" style={{ padding: '8px 18px', fontSize: '9px' }} onClick={() => scrollTo('diag')}>
            制約を診断する
          </button>
        </div>
      </nav>

      {/* Version switcher */}
      <div className="v2-version-bar">
        <a href="/" className="v2-version-pill inact">V1 SLIDE</a>
        <span className="v2-version-pill act">V2 LP</span>
      </div>

      {/* Sticky CTA */}
      <div className={`v2-sticky-cta ${showSticky ? 'show' : ''}`}>
        <button className="v2-btn v2-btn-primary" onClick={() => scrollTo('diag')}>
          制約を診断する →
        </button>
      </div>

      <div className="v2-wrap">

        {/* ── 01 HERO ── */}
        <section className="v2-hero">
          <div className="v2-hero-eyebrow">T² LABORATORY — EDGE COMPUTER DESIGN</div>
          <div className="v2-hero-pain">
            <div className="v2-hero-pain-line">「仕様が固まらない…」</div>
            <div className="v2-hero-pain-line accent">「制約が衝突する設計、どう抜けるか？」</div>
            <div className="v2-hero-pain-line">「試作を繰り返すたびにコストが膨らむ」</div>
          </div>
          <div className="v2-hero-divider" ref={heroTitleRef} />
          <div className="v2-hero-title">
            T²は<span className="c">成立ライン</span>を<br />
            <span className="g">設計する</span>
          </div>
          <div className="v2-hero-desc">
            性能・電力・サイズが衝突する設計課題を、世界最小クラスの実績と最新Embedded Technologyで解決します。
          </div>
          <div className="v2-hero-ctas">
            <button className="v2-btn v2-btn-primary" onClick={() => scrollTo('diag')}>制約を診断する →</button>
            <button className="v2-btn v2-btn-outline" onClick={() => scrollTo('cases')}>開発事例を見る</button>
            <a href="mailto:info@t2-laboratory.com" className="v2-btn v2-btn-ghost">問い合わせ</a>
          </div>
          <div className="v2-scroll-ind">
            <div className="v2-scroll-line" />
            <span>SCROLL</span>
          </div>
        </section>

        {/* ── 02 PAIN ── */}
        <section id="pain" className="v2-sec v2-sec-alt">
          <div className="v2-label">DESIGN CONFLICTS</div>
          <div className="v2-sec-title">設計が<span className="hi">詰まる</span>3つの構造</div>
          <div className="v2-sec-sub">IOT・モビリティ・産業機器——どの領域でも同じパターンで設計が止まる</div>
          <div className="v2-pain-grid">
            {[
              { num:'01', icon:'⚡', title:'性能を上げると\n電力が破綻する', body:'GPUを搭載すれば推論速度は上がる。しかし消費電力が設計上限を超え、冷却設計が成立しない。', chain:['性能向上','電力増大','冷却不可','設計崩壊'] },
              { num:'02', icon:'📦', title:'小型化すると\n放熱できなくなる', body:'筐体を縮小すれば製品競争力は上がる。しかし放熱スペースが消え、熱設計が成立しない。', chain:['小型化','放熱面積減少','熱暴走リスク','量産不可'] },
              { num:'03', icon:'🎯', title:'3つ同時に\n成立させる設計者がいない', body:'性能・電力・サイズを同時に最適化できる専門家の不在。試作を繰り返すほどコストと時間が消える。', chain:['専門家不在','試作繰り返し','コスト膨張','上市遅延'] },
            ].map((c, i) => (
              <div className="v2-pain-card" key={i}>
                <div className="v2-pain-num">{c.num}</div>
                <div className="v2-pain-icon">{c.icon}</div>
                <div className="v2-pain-title">{c.title}</div>
                <div className="v2-pain-body">{c.body}</div>
                <div className="v2-pain-chain">
                  {c.chain.map((row, j) => <div key={j} className="v2-pain-chain-row">{row}</div>)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 03 TRADEOFF ── */}
        <section className="v2-sec">
          <div className="v2-label">TRADEOFF STRUCTURE</div>
          <div className="v2-sec-title">3点が<span className="hi">同時に成立する</span>ラインを見つける</div>
          <div className="v2-tri-wrap">
            <div style={{ display:'flex', justifyContent:'center' }}>
              <TriangleSvg active={triActive} />
            </div>
            <div className="v2-tri-info">
              {[
                { title:'SIZE — 世界最小クラス 38×34mm', body:'記念切手サイズを実現する高密度設計。機能の厳選とSOC選定で「必要な性能を最小面積で」を実現。' },
                { title:'POWER — 待機時2W / 動作時3W', body:'NPU搭載SOCと最適ファームウェアで競合比1/4の消費電力を達成。バッテリー駆動を可能にする。' },
                { title:'PERF — AI推論 104.5 FPS', body:'Raspberry Pi比5倍超の処理速度。ニューラルネットワークユニット搭載でクラウド不要のエッジAIを実現。' },
              ].map((r, i) => (
                <div key={i} className={`v2-tri-row ${triActive === i ? 'active' : ''}`} onMouseEnter={() => setTriActive(i)}>
                  <div className="v2-tri-row-title">{r.title}</div>
                  <div className="v2-tri-row-body">{r.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 04 SOLUTION ── */}
        <section id="solution" className="v2-sec v2-sec-dark">
          <div className="v2-label">T² PROCESS</div>
          <div className="v2-sec-title"><span className="hi">設計の詰まり</span>を解決するフロー</div>
          <div className="v2-flow">
            {[
              { n:'STEP 01', icon:'🔍', title:'制約整理\nヒアリング', body:'30分で課題の構造を整理。性能・電力・サイズの衝突ポイントを明確化する。' },
              { n:'STEP 02', icon:'⚖️', title:'成立ライン\n設計', body:'3点が同時に成立する設計ラインを提案。SOC選定・回路構成・ファームウェア方針まで。' },
              { n:'STEP 03', icon:'🛠️', title:'実装・試作\n一貫対応', body:'仕様設計から回路・レイアウト・試作・評価まで一気通貫でサポート。' },
              { n:'STEP 04', icon:'🚀', title:'量産・\n継続改善', body:'量産移行の最適化、EOL部品対応、次期リビジョン設計まで継続的にサポート。' },
            ].map((s, i) => (
              <div className="v2-flow-step" key={i}>
                <div className="v2-flow-n">{s.n}</div>
                <div className="v2-flow-dot">{s.icon}</div>
                <div className="v2-flow-title">{s.title}</div>
                <div className="v2-flow-body">{s.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 05 STATS ── */}
        <section className="v2-sec v2-sec-alt" ref={statsRef}>
          <div className="v2-label">TRACK RECORD</div>
          <div className="v2-sec-title">数値が証明する<span className="hig">設計力</span></div>
          <div className="v2-stats">
            <StatBlock label="AI INFERENCE SPEED" target={104} unit="FPS" sub="Raspberry Pi比 5倍以上" color="cyan"  run={statsRun} />
            <StatBlock label="POWER CONSUMPTION"  target={2}   unit="W"   sub="競合比 1/4 の低消費電力"  color="green" run={statsRun} />
            <StatBlock label="BOARD SIZE"          target={38}  unit="mm"  sub="世界最小クラス 38×34mm"  color="cyan"  run={statsRun} />
          </div>
        </section>

        {/* ── 06 CASES ── */}
        <section id="cases" className="v2-sec">
          <div className="v2-label">DEVELOPMENT CASES</div>
          <div className="v2-sec-title">制約を<span className="hi">成立させた</span>実績</div>
          <div className="v2-sec-sub">IOT・モビリティ・産業機器——実際に「詰まっていた」設計を解決した事例</div>
          <div className="v2-cases-grid">
            {[
              { tag:'事例 1-1 — IOT SMART EDGE', title:'ミニトマト品質検査 AIシステム',
                before:['クラウド依存で現場判定不可','AI精度が熟練者に届かない'],
                after:['エッジAI（DNN）で現場リアルタイム判定','熟練者クラスの高精度を実現'],
                metrics:['DNN','Edge','現場'] },
              { tag:'事例 1-3 — PRODUCTION MGMT', title:'精密部品 AI生産管理システム',
                before:['千個超の手動カウントでミス多発','計測速度がボトルネック'],
                after:['AIが自動カウント・ゼロミス','エッジ処理で高速化・省人化'],
                metrics:['1000+個/回','DNN','省人化'] },
              { tag:'事例 2-2 — MOBILITY', title:'エアモビリティ用 フライトコントローラ',
                before:['飛行制御の応答遅延リスク','小型機体に搭載できない重量'],
                after:['リアルタイム制御を140×104mmで実現','低消費電力でバッテリー効率向上'],
                metrics:['RT制御','140×104mm','低電力'] },
              { tag:'事例 2-3 — MOBILITY', title:'車載ネットワーク セントラルGW',
                before:['CAN/CAN-FD/Ethernetが混在で統合不可','複数GWで重量・コスト増加'],
                after:['1台で全通信規格を統合・変換','100Gbps Ethernet対応を実現'],
                metrics:['100G','3規格統合','1台化'] },
            ].map((c, i) => (
              <div className="v2-case-card" key={i}>
                <div className="v2-case-tag">{c.tag}</div>
                <div className="v2-case-title">{c.title}</div>
                <div className="v2-case-ba">
                  <div className="v2-case-before">{c.before.map((b,j) => <div key={j}>{b}</div>)}</div>
                  <div className="v2-case-arr">→</div>
                  <div className="v2-case-after">{c.after.map((a,j) => <div key={j}>{a}</div>)}</div>
                </div>
                <div className="v2-case-metrics">{c.metrics.map((m,j) => <span className="v2-case-metric" key={j}>{m}</span>)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 07 DIAGNOSE ── */}
        <section id="diag" className="v2-sec v2-sec-alt">
          <div className="v2-label">CONSTRAINT DIAGNOSIS</div>
          <div className="v2-sec-title">あなたの<span className="hi">設計の詰まり</span>を診断する</div>
          <div className="v2-sec-sub">5つの質問に答えるだけ。T²が最も力を発揮できるか即座に判定します</div>
          <DiagTool />
        </section>

        {/* ── 08 FOOTER ── */}
        <footer className="v2-footer">
          <div>
            <div className="v2-label">GET STARTED</div>
            <div className="v2-footer-title">設計を<span className="c">動かす</span><br />次の一手</div>
          </div>
          <div className="v2-footer-cta-grid">
            {[
              { icon:'📅', title:'30分Zoom相談', desc:'課題をヒアリングし、T²が解決できるかをその場で判断します。費用は一切かかりません。', btn:'予約する →', href:'https://calendly.com', primary:true },
              { icon:'✉️', title:'メールで問い合わせ', desc:'仕様書・スケッチ・要件メモ、どんな段階でも受け付けます。', btn:'メールを送る', href:'mailto:info@t2-laboratory.com', primary:false },
              { icon:'📄', title:'開発事例PDF', desc:'IOT・モビリティ・産業機器の詳細実績をまとめた資料をダウンロードできます。', btn:'ダウンロード', href:'http://t2-laboratory.com/', primary:false },
              { icon:'💬', title:'Slackで問い合わせ', desc:'T²のSlackチャンネルから技術的な質問をカジュアルに投げることができます。', btn:'Slackで話す', href:'http://t2-laboratory.com/', primary:false },
            ].map((c, i) => (
              <div className="v2-footer-cta-card" key={i}>
                <div className="v2-footer-cta-icon">{c.icon}</div>
                <div className="v2-footer-cta-title">{c.title}</div>
                <div className="v2-footer-cta-desc">{c.desc}</div>
                <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                   className={`v2-btn ${c.primary ? 'v2-btn-primary' : 'v2-btn-outline'}`}
                   style={{ marginTop:'auto', alignSelf:'flex-start' }}>
                  {c.btn}
                </a>
              </div>
            ))}
          </div>
          <div className="v2-footer-meta">
            <div className="v2-footer-brand">T²Laboratory</div>
            <div className="v2-footer-copy">© 2025 株式会社ティーツー・ラボラトリ — t2-laboratory.com</div>
          </div>
        </footer>

      </div>
    </div>
  )
}
