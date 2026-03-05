import { useState, useEffect, useCallback, useRef } from 'react'
import PCBViewer from './PCBViewer'
import './App.css'

const TOTAL = 14
const LABELS = ['INTRO','PAIN','TRADE-OFF','DESIGN-CONFLICT','PROBLEM','RESULT','SOLUTION','DESIGN','ROLE','EFFECT','FIELDS','CASES-IOT','CASES-MOBILITY','CLOSE']

type Dir = 'fwd' | 'bwd'
interface SlideState {
  cur: number
  prev: number | null
  dir: Dir
  busy: boolean
}

// ── individual slides ──────────────────────────────────────

function S1() {
  return (
    <>
      <div className="s1-bg">
        <div className="s1-slash" />
        <div className="s1-slash2" />
        <div className="s1-big r">止まる</div>
      </div>
      <div className="s1-content">
        <div className="s1-eyebrow r">T²LABORATORY — EDGE COMPUTER DESIGN SERVICE</div>
        <div className="s1-line1 r">製品開発が</div>
        <div className="s1-line2 r">止まる</div>
        <div className="s1-line3 r">瞬間</div>
        <div className="s1-tags r">
          <span className="s1-tag">AI</span>
          <span className="s1-tag">IoT</span>
          <span className="s1-tag">モビリティ</span>
        </div>
        <p className="s1-sub r">機能が増えるほど<br /><strong>設計は難しくなる</strong></p>
        <div className="s1-hint r">
          <span className="s1-hint-dot" />キー / スワイプ / タップで進む
        </div>
      </div>
    </>
  )
}

function S2() {
  return (
    <div className="s2-inner">
      <div className="s2-label r">PAIN</div>
      <div className="s2-qs">
        {[
          ['📐','「このサイズに','入りますか？」'],
          ['⚡','「3W以内でAIは','動きますか？」'],
          ['📡','「通信帯域','足りますか？」'],
          ['🌡️','「放熱どう','しますか？」'],
        ].map(([icon, l1, l2], i) => (
          <div className="s2-q r" key={i}>
            <div className="s2-q-icon">{icon}</div>
            <div className="s2-q-text">{l1}<br /><strong>{l2}</strong></div>
          </div>
        ))}
      </div>
      <div className="s2-conclusion r">
        <div className="s2-c-tag">── 結論 ──</div>
        <div className="s2-c-main">誰も答えを出せず、設計が<span className="blink">止まる</span></div>
      </div>
    </div>
  )
}

function S3() {
  return (
    <div className="s3-inner">
      <div className="s3-left">
        <div className="lbl r">TRADE-OFF</div>
        <h2 className="s3-h r">問題の<br /><span className="acc">正体</span></h2>
        <p className="s3-desc r">
          AIエッジ機器の設計には<br /><strong>3つの競合制約</strong>が常に存在する。<br /><br />
          この3つは<strong>根本的にトレードオフ</strong>であり、<br />1つを最大化すると必ず他が犠牲になる。
        </p>
      </div>
      <div className="s3-right r">
        <div className="tri-wrap">
          <svg className="tri-svg" viewBox="0 0 400 360" fill="none">
            <defs>
              <linearGradient id="tg1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e8000f" />
                <stop offset="50%" stopColor="#ff6600" />
                <stop offset="100%" stopColor="#e8000f" />
              </linearGradient>
            </defs>
            <polygon points="200,52 38,316 362,316"
              fill="rgba(232,0,15,0.03)" stroke="url(#tg1)" strokeWidth="1.5" strokeDasharray="7,5">
              <animateTransform attributeName="transform" type="rotate"
                from="0 200 184" to="360 200 184" dur="90s" repeatCount="indefinite" />
            </polygon>
            <polygon points="200,52 38,316 362,316" fill="none" stroke="url(#tg1)" strokeWidth="20" opacity=".04" />
          </svg>
          <div className="tri-n top"><div className="tri-n-icon">🏎️</div><div className="tri-n-name">高性能</div><div className="tri-n-en">HIGH PERF</div></div>
          <div className="tri-n bl"><div className="tri-n-icon">📦</div><div className="tri-n-name">小型</div><div className="tri-n-en">COMPACT</div></div>
          <div className="tri-n br"><div className="tri-n-icon">🔋</div><div className="tri-n-name">低電力</div><div className="tri-n-en">LOW POWER</div></div>
          <div className="tri-center">TRADE<br />OFF</div>
        </div>
      </div>
    </div>
  )
}

// ── S4c DESIGN CONFLICT ────────────────────────────────────
function S4c() {
  const cases = [
    {
      num: '01',
      title: '性能を上げる',
      steps: ['GPUを搭載', '消費電力が設計上限を超える'],
      result: '冷却設計が成立しない',
    },
    {
      num: '02',
      title: '省電力化',
      steps: ['CPUクロックを下げる', 'AI推論速度が不足'],
      result: '要求性能を満たせない',
    },
    {
      num: '03',
      title: '小型化',
      steps: ['筐体サイズを縮小', '放熱スペース不足'],
      result: '熱設計が成立しない',
    },
  ]
  return (
    <div className="s4c-inner">
      <div>
        <div className="lbl r">DESIGN CONFLICT</div>
        <h2 className="s4c-h r">
          設計は<br />
          <span className="acc">「成立ライン」</span>を<br />
          探す作業
        </h2>
        <p className="s4c-sub r">多くの開発は性能・電力・サイズの衝突で止まる</p>
      </div>

      <div className="conflict-grid r">
        {cases.map((c, i) => (
          <div className="conflict-card" key={i}>
            <div className="conflict-case-num">CASE {c.num}</div>
            <div className="conflict-title">{c.title}</div>
            <div className="conflict-flow">
              {c.steps.map((step, j) => (
                <div key={j} className="conflict-step-wrap">
                  <div className="conflict-step">{step}</div>
                  {j < c.steps.length - 1 && <div className="conflict-arrow">↓</div>}
                </div>
              ))}
            </div>
            <div className="conflict-result">→ {c.result}</div>
          </div>
        ))}
      </div>

      <div className="s4c-footer r">
        <div className="s4c-msg">
          設計はスペックを上げる作業ではない<br />
          <strong>成立するラインを見つける作業</strong>
        </div>
        <div className="s4c-cta">
          その成立ラインを設計するのが<span className="acc">　T²</span>
        </div>
      </div>
    </div>
  )
}

function S4() {
  const [open, setOpen] = useState<number | null>(null)
  const items = [
    { num:'01', want:'🤖　AIを入れたい', prob:'⚡ 電力不足', detail:<>AIチップは一般的に<strong>5W以上の電力</strong>を要求する。バッテリー駆動や小型筐体では即アウト。T²はNPU活用とアーキテクチャ最適化で<strong>1W以下の推論</strong>を実現する。</> },
    { num:'02', want:'📡　センサを増やしたい', prob:'📶 通信帯域不足', detail:<>センサ数が増えるほどデータ量が爆発する。標準的なI2C/SPI帯域では<strong>処理落ちが発生</strong>。T²は高速インターフェイス設計とFPGAによる並列処理で解消する。</> },
    { num:'03', want:'📦　小型化したい', prob:'🌡️ 放熱問題', detail:<>小型化で表面積が減り、熱密度が上昇する。<strong>熱が逃げない</strong>ため性能を絞らざるを得ない。T²は基板レイアウト段階から熱設計を組み込み、放熱と小型化を両立させる。</> },
  ]
  return (
    <div className="s4-inner">
      <div>
        <div className="lbl r">PROBLEM</div>
        <h2 className="s4-h r">典型的な<span className="acc">設計詰まり</span></h2>
      </div>
      <div className="bn-list">
        {items.map((it, i) => (
          <div className={`bn r${open === i ? ' open' : ''}`} key={i} onClick={() => setOpen(open === i ? null : i)}>
            <div className="bn-row">
              <div className="bn-num">{it.num}</div>
              <div className="bn-want">{it.want}</div>
              <div className="bn-arr">▸</div>
              <div className="bn-prob">{it.prob}</div>
            </div>
            <div className="bn-detail">{it.detail}</div>
          </div>
        ))}
      </div>
      <div className="bn-hint r">▸ 各行をクリックで詳細確認</div>
    </div>
  )
}

function S5() {
  const items = [
    { num:'01', icon:'🔄', text:'試作の繰り返し' },
    { num:'02', icon:'📅', text:'開発遅延' },
    { num:'03', icon:'💸', text:'コスト増加' },
    { num:'04', icon:'🛑', text:'プロジェクト停滞' },
  ]
  return (
    <div className="s5-inner">
      <div className="lbl r">RESULT</div>
      <h2 className="s5-h r">その<span className="acc">結果</span>...</h2>
      <div className="casc-list">
        {items.map((it, i) => (
          <div className="cc r" key={i}>
            <div className="cc-num">{it.num}</div>
            <div className="cc-icon">{it.icon}</div>
            <div className="cc-text">{it.text}</div>
          </div>
        ))}
      </div>
      {/* 修正2: T²の立場を明確にする1文 */}
      <div className="s5-partner r">
        だから<span className="acc">　設計の成立ラインを決める　</span>設計パートナーが必要になる
      </div>
    </div>
  )
}

function S6() {
  return (
    <div className="s6-inner">
      <div className="s6-info">
        <div className="lbl r">SOLUTION</div>
        {/* 修正1: 営業コピー → エンジニア向け制約条件型タイトル */}
        <h2 className="s6-h r">この条件で成立する<br /><span className="acc">AIエッジ設計</span></h2>
        <div className="s6-subtitle r">38×34mm　3W以内　100FPS AI推論</div>
        <div className="s6-specs r">
          {[
            { val:'38×34', unit:'mm', label:'記念切手サイズ' },
            { val:'2〜3', unit:'W', label:'低消費電力' },
            { val:'100', unit:'FPS', label:'AI物体認識' },
          ].map((s, i) => (
            <div className="s6-spec" key={i}>
              <div className="s6-spec-val">{s.val}<span className="s6-spec-unit">{s.unit}</span></div>
              <div className="s6-spec-label">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="s6-cmp r">
          <div className="s6-cmp-row mine">
            <span className="s6-cmp-name">当社</span>
            <div className="s6-cmp-track"><div className="s6-cmp-fill" style={{ width:'27%', background:'var(--red)' }} /></div>
            <span className="s6-cmp-size">1/3サイズ</span>
          </div>
          <div className="s6-cmp-row">
            <span className="s6-cmp-name">Pi 4B</span>
            <div className="s6-cmp-track"><div className="s6-cmp-fill" style={{ width:'100%', background:'#1a2840' }} /></div>
            <span className="s6-cmp-size">基準</span>
          </div>
          <div className="s6-cmp-row">
            <span className="s6-cmp-name">Jetson</span>
            <div className="s6-cmp-track"><div className="s6-cmp-fill" style={{ width:'100%', background:'#131e30' }} /></div>
            <span className="s6-cmp-size">1.68×</span>
          </div>
        </div>
        <div className="s6-hint r">← ドラッグで回転 ／ スクロールでズーム →</div>
      </div>
      <div className="s6-canvas">
        <PCBViewer />
        {/* 修正8: AI推論データフロー可視化テキスト */}
        <div className="s6-canvas-label">AI推論データフローを可視化</div>
      </div>
    </div>
  )
}

function S7() {
  const items = [
    { icon:'⚡', title:'電子回路設計', desc:'アナログ・デジタル回路、電源設計、ギガビット高速インターフェイス、基板レイアウト。EMC対策から熱設計まで量産を見据えた設計。', num:'01' },
    { icon:'🔧', title:'FPGA / SOC設計', desc:'SOC・FPGA機能設計、ロジック最適化、カスタムIPコア開発。並列処理・リアルタイム応答が必要な制御系に対応。', num:'02' },
    { icon:'💾', title:'組込みソフト開発', desc:'Embedded Software、RTOS、ファームウェア、デバイスドライバ。ハードウェアを最大限に活かすソフトウェア実装。', num:'03' },
    { icon:'🤖', title:'AIエッジ実装', desc:'NPU活用、ニューラルネット最適化、エッジAI推論エンジン。クラウドに依存しないリアルタイム推論。', num:'04' },
  ]
  return (
    <div className="s7-inner">
      <div>
        <div className="lbl r">DESIGN AREAS</div>
{/* 修正3: タイトル変更 */}
        <h2 className="s7-h r">T²が解決する<span className="acc">設計領域</span></h2>
      </div>
      <div className="da-rows">
        {items.map((it, i) => (
          <div className="da-row r" key={i}>
            <div className="da-icon">{it.icon}</div>
            <div>
              <div className="da-title">{it.title}</div>
              <div className="da-desc">{it.desc}</div>
            </div>
            <div className="da-num">{it.num}</div>
          </div>
        ))}
      </div>
      <div className="da-unity r">
        <span className="u-term">ハード</span>
        <span className="u-op">＋</span>
        <span className="u-term">ソフト</span>
        <span className="u-op">=</span>
        <span className="u-result">一気通貫設計</span>
      </div>
    </div>
  )
}

function S8() {
  return (
    <div className="s8-inner">
      <div className="s8-left">
        <div className="lbl r">ROLE</div>
        <h2 className="s8-h r">T²の<span className="acc">役割</span></h2>
{/* 修正4: コピー変更 */}
        <div className="s8-sub r">成立ラインを決める設計</div>
        <div className="s8-msg-main r">トレードオフを<br /><span>設計する</span></div>
        <div className="s8-msg-sub r">最適な成立ラインを、<br />経験と技術で導き出す</div>
      </div>
      <div className="s8-right r">
        <div className="role-diag">
          <svg className="role-svg" viewBox="0 0 500 440" fill="none">
            <line x1="250" y1="210" x2="250" y2="52" stroke="rgba(232,0,15,0.22)" strokeWidth="1.5" strokeDasharray="6,4" />
            <line x1="250" y1="210" x2="62" y2="390" stroke="rgba(232,0,15,0.22)" strokeWidth="1.5" strokeDasharray="6,4" />
            <line x1="250" y1="210" x2="438" y2="390" stroke="rgba(232,0,15,0.22)" strokeWidth="1.5" strokeDasharray="6,4" />
            <polygon points="250,40 48,408 452,408" fill="rgba(232,0,15,0.025)" stroke="rgba(232,0,15,0.12)" strokeWidth="1.5" />
          </svg>
          <div className="role-center">
            <div className="role-t2">T²</div>
            <div className="role-sub-label">BALANCE</div>
          </div>
          <div className="rn top"><div className="rn-icon">🏎️</div><div className="rn-label">性能</div></div>
          <div className="rn bl"><div className="rn-icon">📦</div><div className="rn-label">小型</div></div>
          <div className="rn br"><div className="rn-icon">🔋</div><div className="rn-label">電力</div></div>
        </div>
      </div>
    </div>
  )
}

function S9() {
  const bef = ['設計判断できない','試作を繰り返す','開発期間が伸びる','コストが膨らむ','専門人材不足']
  const aft = ['設計判断ができる','試作回数を削減','開発期間を短縮','コストを削減','専門人材も不要に']
  return (
    <div className="s9-inner">
      <div className="s9-top r">
        <div className="lbl">EFFECT</div>
        <h2 className="s9-h">T²を使うと<span className="acc">どう変わる？</span></h2>
      </div>
      <div className="s9-cols">
        <div className="s9-bef">
          <div className="s9-col-tag r">── BEFORE ──</div>
          <div className="s9-list">
            {bef.map((t, i) => (
              <div className="s9-row r" key={i}>
                <span className="s9-icon">✗</span>
                <span className="s9-text">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="s9-divider r">
          <div className="s9-div-arr">→</div>
          <div className="s9-div-lbl">T²</div>
        </div>
        <div className="s9-aft">
          <div className="s9-col-tag r">── AFTER ──</div>
          <div className="s9-list">
            {aft.map((t, i) => (
              <div className="s9-row r" key={i}>
                <span className="s9-icon">✓</span>
                <span className="s9-text">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function S10() {
  const fields = [
    { icon:'📡', name:'IoT', detail:'センサ端末 / ウェアラブル / 無線タグ' },
    { icon:'🚗', name:'モビリティ', detail:'自動車ECU / ドローン / エアモビリティ' },
    { icon:'🏭', name:'産業機械', detail:'PLC制御 / モータ制御 / 検査装置' },
    { icon:'⚗️', name:'半導体装置', detail:'製造プロセス / 流量制御 / 防塵装置' },
    { icon:'🏥', name:'医療機器', detail:'視力検査 / レントゲン制御 / 分析装置' },
  ]
  return (
    <div className="s10-inner">
      <div>
        <div className="lbl r">FIELDS</div>
        <h2 className="s10-h r">対象<span className="acc">分野</span></h2>
      </div>
      <div className="fields-grid">
        {fields.map((f, i) => (
          <div className="f-item r" key={i}>
            <div className="f-item-icon">{f.icon}</div>
            <div>
              <div className="f-item-name">{f.name}</div>
              <div className="f-item-detail">{f.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SVG: ミニトマト品質検査フロー ─────────────────────────
function SvgTomato({ run }: { run: boolean }) {
  return (
    <svg viewBox="0 0 220 110" className="scase-svg">
      {/* Camera node */}
      <rect x="4" y="38" width="44" height="34" rx="4"
        className={`svgn ${run ? 'svgn-on' : ''}`}
        style={{ animationDelay: '0.3s' }} />
      <text x="26" y="52" textAnchor="middle" className="svgt" style={{ animationDelay: '0.3s', opacity: run ? 1 : 0 }}>📷</text>
      <text x="26" y="65" textAnchor="middle" className="svgl" style={{ animationDelay: '0.3s', opacity: run ? 1 : 0 }}>Camera</text>
      {/* Arrow 1 */}
      <line x1="48" y1="55" x2="82" y2="55" stroke="#e8000f" strokeWidth="2"
        className={`svgarrow ${run ? 'svgarrow-on' : ''}`}
        style={{ animationDelay: '0.7s' }} />
      <polygon points="82,50 92,55 82,60" fill="#e8000f"
        className={`svgarrowhead ${run ? 'svgarrowhead-on' : ''}`}
        style={{ animationDelay: '0.9s' }} />
      {/* AI node */}
      <rect x="92" y="34" width="52" height="42" rx="4"
        className={`svgn svgn-ai ${run ? 'svgn-on' : ''}`}
        style={{ animationDelay: '1.0s' }} />
      <text x="118" y="52" textAnchor="middle" className="svgt" style={{ animationDelay: '1.0s', opacity: run ? 1 : 0 }}>AI</text>
      <text x="118" y="65" textAnchor="middle" className="svgl" style={{ animationDelay: '1.0s', opacity: run ? 1 : 0 }}>DNN推論</text>
      {/* Arrow 2 */}
      <line x1="144" y1="55" x2="160" y2="55" stroke="#e8000f" strokeWidth="2"
        className={`svgarrow ${run ? 'svgarrow-on' : ''}`}
        style={{ animationDelay: '1.4s' }} />
      <polygon points="160,50 170,55 160,60" fill="#e8000f"
        className={`svgarrowhead ${run ? 'svgarrowhead-on' : ''}`}
        style={{ animationDelay: '1.6s' }} />
      {/* OK node */}
      <rect x="170" y="26" width="46" height="26" rx="4"
        className={`svgn svgn-ok ${run ? 'svgn-on' : ''}`}
        style={{ animationDelay: '1.7s' }} />
      <text x="193" y="44" textAnchor="middle" className="svgt svgt-ok" style={{ animationDelay: '1.7s', opacity: run ? 1 : 0 }}>✓ OK</text>
      {/* NG node */}
      <rect x="170" y="60" width="46" height="26" rx="4"
        className={`svgn svgn-ng ${run ? 'svgn-on' : ''}`}
        style={{ animationDelay: '1.9s' }} />
      <text x="193" y="78" textAnchor="middle" className="svgt svgt-ng" style={{ animationDelay: '1.9s', opacity: run ? 1 : 0 }}>✗ NG</text>
      {/* split lines */}
      <line x1="170" y1="39" x2="167" y2="39" stroke="rgba(240,236,228,0.15)" strokeWidth="1.5" />
      <line x1="170" y1="73" x2="167" y2="73" stroke="rgba(240,236,228,0.15)" strokeWidth="1.5" />
    </svg>
  )
}

// ── SVG: 精密部品カウントアップ ───────────────────────────
function SvgCounter({ run }: { run: boolean }) {
  const [count, setCount] = useState(0)
  const [barW, setBarW] = useState(0)
  useEffect(() => {
    if (!run) { setCount(0); setBarW(0); return }
    const target = 1000
    const dur = 1800
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setCount(Math.round(ease * target))
      setBarW(ease * 100)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    const tid = setTimeout(() => { raf = requestAnimationFrame(tick) }, 400)
    return () => { clearTimeout(tid); cancelAnimationFrame(raf) }
  }, [run])
  return (
    <svg viewBox="0 0 220 110" className="scase-svg">
      <text x="110" y="30" textAnchor="middle" className="svgcountlabel">PARTS COUNTED</text>
      <text x="110" y="75" textAnchor="middle" className="svgcount">{count.toLocaleString()}</text>
      <text x="194" y="75" textAnchor="start" className="svgcountunit">個</text>
      {/* progress bar */}
      <rect x="20" y="88" width="180" height="6" rx="3" fill="rgba(240,236,228,0.08)" />
      <rect x="20" y="88" width={`${barW * 1.8}`} height="6" rx="3" fill="#e8000f" />
      <text x="110" y="106" textAnchor="middle" className="svgcountlabel">AI高精度カウント — DNN</text>
    </svg>
  )
}

// ── SVG: エアモビリティ センサ収束 ────────────────────────
function SvgAirMobility({ run }: { run: boolean }) {
  return (
    <svg viewBox="0 0 220 130" className="scase-svg">
      {/* Center board */}
      <rect x="80" y="45" width="60" height="40" rx="4"
        className={`svgn svgn-ai ${run ? 'svgn-on' : ''}`}
        style={{ animationDelay: '0.3s' }} />
      <text x="110" y="62" textAnchor="middle" className="svgt" style={{ opacity: run ? 1 : 0, animationDelay: '0.3s' }}>BOARD</text>
      <text x="110" y="76" textAnchor="middle" className="svgl" style={{ opacity: run ? 1 : 0, animationDelay: '0.3s' }}>T² Lab</text>
      {/* Sensor nodes */}
      {[
        { x: 14, y: 10,  label: '高度', delay: '0.6s' },
        { x: 14, y: 60,  label: '速度', delay: '0.9s' },
        { x: 14, y: 110, label: '姿勢', delay: '1.2s' },
      ].map(({ x, y, label, delay }, i) => (
        <g key={i}>
          <rect x={x} y={y} width="44" height="24" rx="4"
            className={`svgn ${run ? 'svgn-on' : ''}`}
            style={{ animationDelay: delay }} />
          <text x={x + 22} y={y + 16} textAnchor="middle" className="svgl"
            style={{ opacity: run ? 1 : 0 }}>{label}</text>
          {/* line from sensor to board */}
          <line x1={x + 44} y1={y + 12} x2="80" y2="65" stroke="#e8000f" strokeWidth="1.5"
            className={`svgline ${run ? 'svgline-on' : ''}`}
            style={{ animationDelay: delay, '--len': '80' } as React.CSSProperties} />
        </g>
      ))}
      {/* RT label */}
      <text x="110" y="106"  textAnchor="middle"
        className={`svgrtlabel ${run ? 'svgrtlabel-on' : ''}`}
        style={{ animationDelay: '1.8s' }}>REAL-TIME</text>
    </svg>
  )
}

// ── SVG: 車載ゲートウェイ 収束→出力 ─────────────────────
function SvgGateway({ run }: { run: boolean }) {
  const protocols = [
    { label: 'CAN',     y: 24,  color: '#e8000f', delay: '0.4s' },
    { label: 'CAN-FD',  y: 55,  color: '#ff6b35', delay: '0.7s' },
    { label: 'Ethernet',y: 86,  color: '#f0c040', delay: '1.0s' },
  ]
  return (
    <svg viewBox="0 0 220 120" className="scase-svg">
      {protocols.map(({ label, y, color, delay }, i) => (
        <g key={i}>
          {/* protocol label box */}
          <rect x="4" y={y} width="54" height="20" rx="3"
            className={`svgn ${run ? 'svgn-on' : ''}`}
            style={{ animationDelay: delay }} />
          <text x="31" y={y + 14} textAnchor="middle" className="svgl" style={{ fill: color, opacity: run ? 1 : 0 }}>{label}</text>
          {/* converging line to gateway */}
          <line x1="58" y1={y + 10} x2="106" y2="60" stroke={color} strokeWidth="1.8"
            className={`svgline ${run ? 'svgline-on' : ''}`}
            style={{ animationDelay: delay }} />
        </g>
      ))}
      {/* Gateway box */}
      <rect x="106" y="44" width="48" height="32" rx="4"
        className={`svgn svgn-ai ${run ? 'svgn-on' : ''}`}
        style={{ animationDelay: '1.2s' }} />
      <text x="130" y="58" textAnchor="middle" className="svgt" style={{ fontSize: '7px', opacity: run ? 1 : 0 }}>Gateway</text>
      <text x="130" y="70" textAnchor="middle" className="svgl" style={{ opacity: run ? 1 : 0 }}>変換</text>
      {/* Output arrow */}
      <line x1="154" y1="60" x2="178" y2="60" stroke="#e8000f" strokeWidth="2.5"
        className={`svgarrow ${run ? 'svgarrow-on' : ''}`}
        style={{ animationDelay: '1.6s' }} />
      <polygon points="178,55 190,60 178,65" fill="#e8000f"
        className={`svgarrowhead ${run ? 'svgarrowhead-on' : ''}`}
        style={{ animationDelay: '1.8s' }} />
      {/* 100G label */}
      <text x="196" y="52" textAnchor="middle"
        className={`svgrtlabel ${run ? 'svgrtlabel-on' : ''}`}
        style={{ animationDelay: '1.9s', fontSize: '11px' }}>100G</text>
      <text x="196" y="72" textAnchor="middle" className="svgl"
        style={{ opacity: run ? 1 : 0, animationDelay: '1.9s' }}>Ethernet</text>
    </svg>
  )
}

// ── Scase1: IOT smart edge ─────────────────────────────────
function Scase1() {
  const [run, setRun] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setRun(true), 300)
    return () => clearTimeout(t)
  }, [])

  const cards = [
    {
      tag: '事例 1-1',
      title: 'ミニトマト品質検査システム',
      sub: '協力：広島大学ナノデバイス研究所',
      visual: <SvgTomato run={run} />,
      points: ['農作物の良品・不良品を収穫現場でリアルタイム判定', 'AI（DNN）で熟練者クラスの検出精度を実現', '小型エッジ設計でウェアラブル連動も可能'],
    },
    {
      tag: '事例 1-3',
      title: '精密部品 AI生産管理',
      sub: '協力：（有）宮田精工',
      visual: <SvgCounter run={run} />,
      points: ['数百〜千個の精密部品を AI が自動カウント', 'DNN計測で人手ミスをゼロ化', 'エッジ処理で高速化・省人化を実現'],
    },
  ]

  return (
    <div className="scase-inner">
      <div>
        <div className="lbl r">CASES — IOT SMART EDGE</div>
        <h2 className="scase-h r">AIで<span className="acc">現場の問題</span>を解決した実績</h2>
      </div>
      <div className="scase-grid r">
        {cards.map((c, i) => (
          <div className="scase-card" key={i}>
            <div className="scase-card-tag">{c.tag}</div>
            <div className="scase-card-title">{c.title}</div>
            <div className="scase-card-partner">{c.sub}</div>
            <div className="scase-visual">{c.visual}</div>
            <ul className="scase-points">
              {c.points.map((p, j) => <li key={j}>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="scase-footer r">
        いずれも<span className="acc">　制約の中で成立するライン　</span>を設計した結果
      </div>
    </div>
  )
}

// ── Scase2: Mobility ───────────────────────────────────────
function Scase2() {
  const [run, setRun] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setRun(true), 300)
    return () => clearTimeout(t)
  }, [])

  const cards = [
    {
      tag: '事例 2-2',
      title: 'エアモビリティ用 フライトコントローラ',
      sub: '140 × 104 mm',
      visual: <SvgAirMobility run={run} />,
      points: ['飛行制御・高度・速度・姿勢をリアルタイム制御', '各種センサデータを高速取得・処理', '小型エアモビリティ搭載を想定した低消費電力設計'],
    },
    {
      tag: '事例 2-3',
      title: '車載ネットワーク セントラルゲートウェイ',
      sub: '140 × 120 mm',
      visual: <SvgGateway run={run} />,
      points: ['1台でCAN / CAN-FD / Ethernetを相互変換', '100Gbps Ethernet 対応の超高速通信', 'セントラルGWとして全車載NWを統合'],
    },
  ]

  return (
    <div className="scase-inner">
      <div>
        <div className="lbl r">CASES — MOBILITY</div>
        <h2 className="scase-h r">高難度領域の<span className="acc">設計実績</span></h2>
      </div>
      <div className="scase-grid r">
        {cards.map((c, i) => (
          <div className="scase-card" key={i}>
            <div className="scase-card-tag">{c.tag}</div>
            <div className="scase-card-title">{c.title}</div>
            <div className="scase-card-partner">{c.sub}</div>
            <div className="scase-visual">{c.visual}</div>
            <ul className="scase-points">
              {c.points.map((p, j) => <li key={j}>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="scase-footer r">
        性能・電力・サイズの<span className="acc">　成立ラインを設計　</span>した量産レベルの実績
      </div>
    </div>
  )
}

function S11() {
  return (
    <div className="s11-wrap">
      <div className="s11-problem r">問題の本質は ── 技術不足ではない</div>
      <div className="s11-main r">制約のトレードオフが<br />決まっていない</div>
      <div className="s11-div r" />
      <div className="s11-sol r">
        T²は<span className="acc">その成立ラインを<br />設計する</span>
      </div>
      <div className="s11-contact r">
        <div className="s11-clbl">お問い合わせ</div>
        <div className="s11-email"><a href="mailto:info@t2-laboratory.com">info@t2-laboratory.com</a></div>
        <div className="s11-url">t2-laboratory.com</div>
      </div>
      <div className="s11-footer r">
        <div className="s11-t2">T²</div>
        <div className="s11-tagline">AIをもっと身近に</div>
      </div>
    </div>
  )
}

const SLIDES = [S1, S2, S3, S4c, S4, S5, S6, S7, S8, S9, S10, Scase1, Scase2, S11]

// ── main App ──────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<SlideState>({ cur: 1, prev: null, dir: 'fwd', busy: false })
  const touchX = useRef(0)

  const go = useCallback((n: number) => {
    setState(s => {
      if (n < 1 || n > TOTAL || n === s.cur || s.busy) return s
      // 修正10: S5→S6遷移時に0.2秒ディレイで視覚的区切りを強調
      if (s.cur === 5 && n === 6) {
        setTimeout(() => {
          setState(prev => ({ ...prev, cur: 6, prev: 5, dir: 'fwd', busy: true }))
        }, 200)
        return s // 一旦据え置き、setTimeoutで遷移
      }
      return { cur: n, prev: s.cur, dir: n > s.cur ? 'fwd' : 'bwd', busy: true }
    })
  }, [])

  // clear busy after animation
  useEffect(() => {
    if (!state.busy) return
    const t = setTimeout(() => setState(s => ({ ...s, prev: null, busy: false })), 480)
    return () => clearTimeout(t)
  }, [state.busy, state.cur])

  // keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(state.cur + 1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(state.cur - 1) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [state.cur, go])

  // touch
  useEffect(() => {
    const ts = (e: TouchEvent) => { touchX.current = e.touches[0].clientX }
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchX.current
      if (Math.abs(dx) > 50) dx < 0 ? go(state.cur + 1) : go(state.cur - 1)
    }
    window.addEventListener('touchstart', ts, { passive: true })
    window.addEventListener('touchend', te, { passive: true })
    return () => { window.removeEventListener('touchstart', ts); window.removeEventListener('touchend', te) }
  }, [state.cur, go])

  // ── 全スライド共通：オーバーフロー検知 → 自動スクロール ──
  useEffect(() => {
    // トランジション完了後に実行
    const tStart = setTimeout(() => {
      const activeSlide = document.querySelector('.slide.active') as HTMLElement | null
      if (!activeSlide) return
      // スクロール位置をリセット（スライド切替時）
      activeSlide.scrollTop = 0
      const overflow = activeSlide.scrollHeight - activeSlide.clientHeight
      if (overflow <= 24) return // 有意なオーバーフローがなければスキップ
      // 1.2秒後にスクロールダウン開始
      const tDown = setTimeout(() => {
        activeSlide.scrollTo({ top: overflow, behavior: 'smooth' })
        // 3秒後にトップへ戻る
        const tUp = setTimeout(() => {
          activeSlide.scrollTo({ top: 0, behavior: 'smooth' })
        }, 3000)
        return () => clearTimeout(tUp)
      }, 1200)
      return () => clearTimeout(tDown)
    }, 550) // アニメーション完了（480ms）後
    return () => clearTimeout(tStart)
  }, [state.cur])

  const progress = (state.cur / TOTAL * 100).toFixed(1) + '%'

  return (
    <>
      {/* progress */}
      <div className="prog" style={{ width: progress }} />
      <div className="slabel">{LABELS[state.cur - 1]}</div>

      {/* slides */}
      <div className="sw">
        {SLIDES.map((Slide, i) => {
          const n = i + 1
          let cls = 'slide'
          if (n === state.cur) cls += state.prev !== null ? ` active enter-${state.dir}` : ' active'
          else if (n === state.prev) cls += ` exit-${state.dir}`
          return (
            <div className={cls} key={n}>
              <Slide />
            </div>
          )
        })}
      </div>

      {/* nav */}
      <nav className="nav">
        <button className="nav-btn" onClick={() => go(state.cur - 1)} disabled={state.cur === 1}>
          ◀ PREV
        </button>
        <div className="counter">
          <span className="counter-cur">{String(state.cur).padStart(2, '0')}</span>
          <span className="counter-tot">/ {TOTAL}</span>
        </div>
        <button className="nav-btn next" onClick={() => go(state.cur + 1)} disabled={state.cur === TOTAL}>
          NEXT ▶
        </button>
      </nav>
    </>
  )
}
