import { useState, useEffect, useCallback, useRef } from 'react'
import PCBViewer from './PCBViewer'
import './App.css'

// ─────────────────────────────────────────────────────────
// TOTAL SLIDES: 16
// [S1new, S2, S3, S4c, S4, ScTA1, S5, S6, S7, S8, S9, S10, Scase1, Scase2, Sdiagnosis, S11new]
// ─────────────────────────────────────────────────────────
const TOTAL = 16
const LABELS = [
  'INTRO','PAIN','TRADE-OFF','DESIGN-CONFLICT','PROBLEM',
  'CTA','RESULT','SOLUTION','DESIGN','ROLE',
  'EFFECT','FIELDS','CASES-IOT','CASES-MOBILITY','DIAGNOSIS','CLOSE'
]

type Dir = 'fwd' | 'bwd'
interface SlideState {
  cur: number
  prev: number | null
  dir: Dir
  busy: boolean
}

// ══════════════════════════════════════════════════════════
// SLIDE 1 — NEW FIRSTVIEW (問いかけ型)
// 暗転 → 光のライン交差 → 「T²は成立ラインを設計する」
// ══════════════════════════════════════════════════════════
function S1() {
  return (
    <>
      <div className="s1-bg">
        {/* 光ラインエフェクト */}
        <div className="s1-light-h" />
        <div className="s1-light-v" />
        <div className="s1-light-h2" />
        <div className="s1-glow" />
        <div className="s1-grid" />
      </div>
      <div className="s1-content">
        <div className="s1-eyebrow r">T²LABORATORY — EDGE COMPUTER DESIGN SERVICE</div>
        {/* 問いかけ型 firstview */}
        <div className="s1-question-wrap">
          <div className="s1-q1 r">
            <span className="s1-q-quote">「</span>仕様が固まらない…<span className="s1-q-quote">」</span>
          </div>
          <div className="s1-q2 r">
            <span className="s1-q-quote">「</span>制約が衝突する設計、どう抜けるか？<span className="s1-q-quote">」</span>
          </div>
        </div>
        <div className="s1-divider r">
          <div className="s1-divider-line" />
          <div className="s1-divider-dot" />
          <div className="s1-divider-line" />
        </div>
        <div className="s1-answer r">
          T²は<span className="acc">成立ラインを設計</span>する
        </div>
        <div className="s1-tags r">
          <span className="s1-tag">AI</span>
          <span className="s1-tag">IoT</span>
          <span className="s1-tag">モビリティ</span>
          <span className="s1-tag">組込み</span>
        </div>
        <div className="s1-hint r">
          <span className="s1-hint-dot" />キー / スワイプ / タップで進む
        </div>
      </div>
    </>
  )
}

// ══════════════════════════════════════════════════════════
// SLIDE 2 — PAIN
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// SLIDE 3 — TRADE-OFF
// ══════════════════════════════════════════════════════════
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
            <polygon points="200,52 38,316 362,316"
              fill="none" stroke="url(#tg1)" strokeWidth="20" opacity=".04" />
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

// ══════════════════════════════════════════════════════════
// SLIDE 4c — DESIGN CONFLICT
// ══════════════════════════════════════════════════════════
function S4c() {
  const cases = [
    { num:'01', title:'性能を上げる', steps:['GPUを搭載','消費電力が設計上限を超える'], result:'冷却設計が成立しない' },
    { num:'02', title:'省電力化', steps:['CPUクロックを下げる','AI推論速度が不足'], result:'要求性能を満たせない' },
    { num:'03', title:'小型化', steps:['筐体サイズを縮小','放熱スペース不足'], result:'熱設計が成立しない' },
  ]
  return (
    <div className="s4c-inner">
      <div>
        <div className="lbl r">DESIGN CONFLICT</div>
        <h2 className="s4c-h r">設計は<br /><span className="acc">「成立ライン」</span>を<br />探す作業</h2>
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
        <div className="s4c-msg">設計はスペックを上げる作業ではない<br /><strong>成立するラインを見つける作業</strong></div>
        <div className="s4c-cta">その成立ラインを設計するのが<span className="acc">　T²</span></div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SLIDE 4 — PROBLEM (accordion)
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// SLIDE 5.5 — ScTA1 (CTA intercept #1)
// ══════════════════════════════════════════════════════════
function ScTA1() {
  return (
    <div className="scta-wrap">
      <div className="scta-bg-pulse" />
      <div className="scta-label r">— 設計の詰まりに覚えがありますか？ —</div>
      <h2 className="scta-h r">T²に制約を<span className="acc">診断</span>してもらう</h2>
      <p className="scta-sub r">5問で分かる、あなたの設計ボトルネック</p>
      <div className="scta-btns r">
        <a className="scta-btn-primary" href="mailto:info@t2-laboratory.com?subject=制約診断の依頼">
          <span>🔍</span> 制約診断ツール（5問・無料）
        </a>
        <a className="scta-btn-sec" href="https://calendly.com" target="_blank" rel="noreferrer">
          <span>📅</span> 30分Zoom無料相談
        </a>
        <a className="scta-btn-sec" href="https://slack.com" target="_blank" rel="noreferrer">
          <span>💬</span> Slackで問い合わせ
        </a>
      </div>
      <div className="scta-note r">※ 次のスライドから解決フローをご覧ください →</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SLIDE 5 — RESULT
// ══════════════════════════════════════════════════════════
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
      <div className="s5-partner r">
        だから<span className="acc">　設計の成立ラインを決める　</span>設計パートナーが必要になる
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SLIDE 6 — SOLUTION (PCBViewer)
// ══════════════════════════════════════════════════════════
function S6() {
  return (
    <div className="s6-inner">
      <div className="s6-info">
        <div className="lbl r">SOLUTION</div>
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
        <div className="s6-canvas-label">AI推論データフローを可視化</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SLIDE 7 — DESIGN AREAS
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// SLIDE 8 — ROLE
// ══════════════════════════════════════════════════════════
function S8() {
  return (
    <div className="s8-inner">
      <div className="s8-left">
        <div className="lbl r">ROLE</div>
        <h2 className="s8-h r">T²の<span className="acc">役割</span></h2>
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

// ══════════════════════════════════════════════════════════
// SLIDE 9 — EFFECT (Before/After)
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// SLIDE 10 — FIELDS
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// SVG helpers for case studies
// ══════════════════════════════════════════════════════════
function SvgTomato({ run }: { run: boolean }) {
  return (
    <svg viewBox="0 0 220 110" className="scase-svg">
      <rect x="4" y="38" width="44" height="34" rx="4"
        className={`svgn ${run ? 'svgn-on' : ''}`} style={{ animationDelay: '0.3s' }} />
      <text x="26" y="52" textAnchor="middle" className="svgt" style={{ animationDelay: '0.3s', opacity: run ? 1 : 0 }}>📷</text>
      <text x="26" y="65" textAnchor="middle" className="svgl" style={{ animationDelay: '0.3s', opacity: run ? 1 : 0 }}>Camera</text>
      <line x1="48" y1="55" x2="82" y2="55" stroke="#e8000f" strokeWidth="2"
        className={`svgarrow ${run ? 'svgarrow-on' : ''}`} style={{ animationDelay: '0.7s' }} />
      <polygon points="82,50 92,55 82,60" fill="#e8000f"
        style={{ opacity: run ? 1 : 0, animationDelay: '0.7s' }} />
      <rect x="92" y="34" width="52" height="42" rx="6"
        className={`svgn ${run ? 'svgn-on' : ''}`} style={{ animationDelay: '1.1s' }} />
      <text x="118" y="52" textAnchor="middle" className="svgt" style={{ animationDelay: '1.1s', opacity: run ? 1 : 0 }}>🤖</text>
      <text x="118" y="66" textAnchor="middle" className="svgl" style={{ animationDelay: '1.1s', opacity: run ? 1 : 0 }}>AI Edge</text>
      <line x1="144" y1="55" x2="178" y2="55" stroke="#00c864" strokeWidth="2"
        style={{ opacity: run ? 1 : 0, animationDelay: '1.5s' }} />
      <polygon points="178,50 188,55 178,60" fill="#00c864"
        style={{ opacity: run ? 1 : 0, animationDelay: '1.5s' }} />
      <rect x="188" y="38" width="28" height="34" rx="4"
        className={`svgn ${run ? 'svgn-on svgn-ok' : ''}`} style={{ animationDelay: '1.8s' }} />
      <text x="202" y="59" textAnchor="middle" className="svgl" style={{ animationDelay: '1.8s', opacity: run ? 1 : 0, fontSize: 9 }}>OK</text>
    </svg>
  )
}

function SvgMobility({ run }: { run: boolean }) {
  return (
    <svg viewBox="0 0 220 110" className="scase-svg">
      <rect x="4" y="36" width="44" height="38" rx="4"
        className={`svgn ${run ? 'svgn-on' : ''}`} style={{ animationDelay: '0.3s' }} />
      <text x="26" y="52" textAnchor="middle" className="svgt" style={{ animationDelay: '0.3s', opacity: run ? 1 : 0 }}>📡</text>
      <text x="26" y="67" textAnchor="middle" className="svgl" style={{ animationDelay: '0.3s', opacity: run ? 1 : 0 }}>Sensor</text>
      <line x1="48" y1="55" x2="82" y2="55" stroke="#e8000f" strokeWidth="2"
        style={{ opacity: run ? 1 : 0, animationDelay: '0.7s' }} />
      <rect x="82" y="32" width="56" height="46" rx="6"
        className={`svgn ${run ? 'svgn-on' : ''}`} style={{ animationDelay: '1.0s' }} />
      <text x="110" y="52" textAnchor="middle" className="svgt" style={{ animationDelay: '1.0s', opacity: run ? 1 : 0 }}>💾</text>
      <text x="110" y="67" textAnchor="middle" className="svgl" style={{ animationDelay: '1.0s', opacity: run ? 1 : 0 }}>FPGA</text>
      <line x1="138" y1="55" x2="172" y2="55" stroke="#00c864" strokeWidth="2"
        style={{ opacity: run ? 1 : 0, animationDelay: '1.4s' }} />
      <rect x="172" y="36" width="44" height="38" rx="4"
        className={`svgn ${run ? 'svgn-on svgn-ok' : ''}`} style={{ animationDelay: '1.7s' }} />
      <text x="194" y="52" textAnchor="middle" className="svgt" style={{ animationDelay: '1.7s', opacity: run ? 1 : 0 }}>🚗</text>
      <text x="194" y="67" textAnchor="middle" className="svgl" style={{ animationDelay: '1.7s', opacity: run ? 1 : 0 }}>Drive</text>
    </svg>
  )
}

// ══════════════════════════════════════════════════════════
// SLIDE 12 — CASE 1: IoT
// ══════════════════════════════════════════════════════════
function Scase1() {
  const [run, setRun] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setRun(true), 600)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="scase-wrap">
      <div className="scase-tag r">CASE 01 — IoT / 農業</div>
      <h2 className="scase-h r">ミニトマト品質検査<br /><span className="acc">AIビジョンシステム</span></h2>
      <div className="scase-cols r">
        <div className="scase-col scase-bef">
          <div className="scase-col-label">BEFORE</div>
          <ul className="scase-list">
            <li>目視検査で精度ばらつき</li>
            <li>夜間稼働できない</li>
            <li>熟練工への依存</li>
          </ul>
        </div>
        <div className="scase-arrow">→</div>
        <div className="scase-col scase-aft">
          <div className="scase-col-label">AFTER</div>
          <ul className="scase-list">
            <li>AI判定で<strong>精度98%</strong></li>
            <li>24時間連続稼働</li>
            <li><strong>1W以下</strong>・バッテリー駆動</li>
          </ul>
        </div>
      </div>
      <div className="scase-flow r">
        <SvgTomato run={run} />
      </div>
      <div className="scase-spec r">
        <span className="scase-spec-item">🔲 38×34mm</span>
        <span className="scase-spec-item">⚡ 0.8W駆動</span>
        <span className="scase-spec-item">🧠 100FPS推論</span>
        <span className="scase-spec-item">📐 量産対応</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SLIDE 13 — CASE 2: Mobility
// ══════════════════════════════════════════════════════════
function Scase2() {
  const [run, setRun] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setRun(true), 600)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="scase-wrap">
      <div className="scase-tag r">CASE 02 — モビリティ</div>
      <h2 className="scase-h r">自動車向け<br /><span className="acc">エッジAI制御ユニット</span></h2>
      <div className="scase-cols r">
        <div className="scase-col scase-bef">
          <div className="scase-col-label">BEFORE</div>
          <ul className="scase-list">
            <li>クラウド依存で遅延100ms超</li>
            <li>通信断絶でシステム停止</li>
            <li>消費電力の設計上限超過</li>
          </ul>
        </div>
        <div className="scase-arrow">→</div>
        <div className="scase-col scase-aft">
          <div className="scase-col-label">AFTER</div>
          <ul className="scase-list">
            <li>エッジ処理で<strong>遅延5ms以下</strong></li>
            <li>オフライン完全動作</li>
            <li><strong>2W以内</strong>・FPGA並列処理</li>
          </ul>
        </div>
      </div>
      <div className="scase-flow r">
        <SvgMobility run={run} />
      </div>
      <div className="scase-spec r">
        <span className="scase-spec-item">⚡ 2W以内</span>
        <span className="scase-spec-item">⏱️ 5ms以下</span>
        <span className="scase-spec-item">💾 FPGA制御</span>
        <span className="scase-spec-item">🛡️ オフライン対応</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SLIDE 14 — DIAGNOSIS (5-step interactive tool) CTA #2
// ══════════════════════════════════════════════════════════
function Sdiagnosis() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [done, setDone] = useState(false)

  const questions = [
    { q:'開発中の製品で最も困っている制約は？', opts:['電力・バッテリー', 'サイズ・小型化', '放熱・熱設計', '通信帯域・データ量'] },
    { q:'AIチップへの電力予算は？', opts:['1W未満', '1〜5W', '5〜15W', '制限なし / 未定'] },
    { q:'現在の開発フェーズは？', opts:['企画・コンセプト', '試作・PoC', '量産設計', '既存品の改良'] },
    { q:'チーム内の専門人材は？', opts:['ハード・ソフト両方いる', 'どちらか一方のみ', 'ほぼ外注依存', '人材が不足している'] },
    { q:'開発完了の目標期間は？', opts:['3ヶ月以内', '6ヶ月以内', '1年以内', '柔軟に対応したい'] },
  ]

  const select = (i: number) => {
    const newAnswers = [...answers, i]
    setAnswers(newAnswers)
    if (step < questions.length - 1) {
      setTimeout(() => setStep(step + 1), 200)
    } else {
      setTimeout(() => setDone(true), 300)
    }
  }

  const reset = () => { setStep(0); setAnswers([]); setDone(false) }

  if (done) {
    return (
      <div className="sdiag-wrap">
        <div className="sdiag-done-wrap">
          <div className="sdiag-done-icon r">✅</div>
          <div className="sdiag-done-title r">診断完了</div>
          <div className="sdiag-done-msg r">
            T²が最適な解決アプローチを提案します。<br />
            以下のいずれかから今すぐご相談ください。
          </div>
          <div className="sdiag-done-btns r">
            <a className="sdiag-cta sdiag-cta-primary"
              href={`mailto:info@t2-laboratory.com?subject=制約診断の結果について&body=診断結果：Q1=${answers[0]+1} Q2=${answers[1]+1} Q3=${answers[2]+1} Q4=${answers[3]+1} Q5=${answers[4]+1}`}>
              <span>📧</span> 診断結果を添えてメール相談
            </a>
            <a className="sdiag-cta sdiag-cta-zoom" href="https://calendly.com" target="_blank" rel="noreferrer">
              <span>📅</span> 30分Zoom相談を予約する
            </a>
            <a className="sdiag-cta sdiag-cta-slack" href="https://slack.com" target="_blank" rel="noreferrer">
              <span>💬</span> Slackでカジュアルに相談
            </a>
            <a className="sdiag-cta sdiag-cta-pdf" href="/case-studies.pdf" target="_blank" rel="noreferrer">
              <span>📄</span> 開発事例PDF をダウンロード
            </a>
          </div>
          <button className="sdiag-reset r" onClick={reset}>↩ もう一度診断する</button>
        </div>
      </div>
    )
  }

  return (
    <div className="sdiag-wrap">
      <div className="sdiag-label r">CONSTRAINT DIAGNOSIS</div>
      <h2 className="sdiag-h r">制約<span className="acc">診断</span>ツール</h2>
      <div className="sdiag-progress r">
        {questions.map((_, i) => (
          <div key={i} className={`sdiag-dot${i < step ? ' done' : i === step ? ' active' : ''}`} />
        ))}
        <span className="sdiag-prog-txt">STEP {step + 1} / {questions.length}</span>
      </div>
      <div className="sdiag-question r" key={step}>{questions[step].q}</div>
      <div className="sdiag-opts r">
        {questions[step].opts.map((opt, i) => (
          <button key={i} className="sdiag-opt" onClick={() => select(i)}>
            <span className="sdiag-opt-num">0{i + 1}</span>
            <span className="sdiag-opt-text">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SLIDE 15 — CLOSE / CTA #3 (updated S11)
// ══════════════════════════════════════════════════════════
function S11() {
  return (
    <div className="s11-wrap">
      <div className="s11-problem r">問題の本質は ── 技術不足ではない</div>
      <div className="s11-main r">制約のトレードオフが<br />決まっていない</div>
      <div className="s11-div r" />
      <div className="s11-sol r">
        T²は<span className="acc">その成立ラインを<br />設計する</span>
      </div>

      {/* ── CTA Grid (4 buttons) ── */}
      <div className="s11-cta-grid r">
        <a className="s11-cta-btn s11-cta-primary"
          href="mailto:info@t2-laboratory.com?subject=制約診断の依頼">
          <span className="s11-cta-icon">🔍</span>
          <div className="s11-cta-body">
            <div className="s11-cta-label">制約診断ツール</div>
            <div className="s11-cta-sub">5問で設計ボトルネックを可視化</div>
          </div>
        </a>
        <a className="s11-cta-btn s11-cta-slack"
          href="https://slack.com" target="_blank" rel="noreferrer">
          <span className="s11-cta-icon">💬</span>
          <div className="s11-cta-body">
            <div className="s11-cta-label">Slackで問い合わせ</div>
            <div className="s11-cta-sub">T²チームに直接相談</div>
          </div>
        </a>
        <a className="s11-cta-btn s11-cta-zoom"
          href="https://calendly.com" target="_blank" rel="noreferrer">
          <span className="s11-cta-icon">📅</span>
          <div className="s11-cta-body">
            <div className="s11-cta-label">30分Zoom相談</div>
            <div className="s11-cta-sub">Calendly で今すぐ予約</div>
          </div>
        </a>
        <a className="s11-cta-btn s11-cta-pdf"
          href="/case-studies.pdf" target="_blank" rel="noreferrer">
          <span className="s11-cta-icon">📄</span>
          <div className="s11-cta-body">
            <div className="s11-cta-label">開発事例を見る</div>
            <div className="s11-cta-sub">PDF ダウンロード（無料）</div>
          </div>
        </a>
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

// ══════════════════════════════════════════════════════════
// SLIDES ARRAY
// ══════════════════════════════════════════════════════════
const SLIDES = [S1, S2, S3, S4c, S4, ScTA1, S5, S6, S7, S8, S9, S10, Scase1, Scase2, Sdiagnosis, S11]

// ══════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════
export default function App() {
  const [state, setState] = useState<SlideState>({ cur: 1, prev: null, dir: 'fwd', busy: false })
  const touchX = useRef(0)

  const go = useCallback((n: number) => {
    setState(s => {
      if (n < 1 || n > TOTAL || n === s.cur || s.busy) return s
      return { cur: n, prev: s.cur, dir: n > s.cur ? 'fwd' : 'bwd', busy: true }
    })
  }, [])

  useEffect(() => {
    if (!state.busy) return
    const t = setTimeout(() => setState(s => ({ ...s, prev: null, busy: false })), 480)
    return () => clearTimeout(t)
  }, [state.busy, state.cur])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(state.cur + 1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(state.cur - 1) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [state.cur, go])

  useEffect(() => {
    const ts = (e: TouchEvent) => { touchX.current = e.touches[0].clientX }
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchX.current
      if (Math.abs(dx) > 50) dx < 0 ? go(state.cur + 1) : go(state.cur - 1)
    }
    window.addEventListener('touchstart', ts, { passive: true })
    window.addEventListener('touchend', te, { passive: true })
    return () => {
      window.removeEventListener('touchstart', ts)
      window.removeEventListener('touchend', te)
    }
  }, [state.cur, go])

  return (
    <div className="root">
      {/* ── Top Nav ── */}
      <nav className="nav">
        <div className="nav-logo">T²</div>
        <div className="nav-label">{LABELS[state.cur - 1]}</div>
        <div className="nav-btns">
          <button className="nav-btn" onClick={() => go(state.cur - 1)} disabled={state.cur <= 1}>PREV</button>
          <div className="counter">
            <span className="counter-cur">{String(state.cur).padStart(2,'0')}</span>
            <span className="counter-sep">/</span>
            <span className="counter-tot">{String(TOTAL).padStart(2,'0')}</span>
          </div>
          <button className="nav-btn" onClick={() => go(state.cur + 1)} disabled={state.cur >= TOTAL}>NEXT</button>
        </div>
      </nav>

      {/* ── Slide Wrapper ── */}
      <div className="sw">
        {SLIDES.map((Slide, i) => {
          const n = i + 1
          const isActive = n === state.cur
          const isExit = n === state.prev
          let cls = 'slide'
          if (isActive) cls += ' active'
          if (isExit) cls += state.dir === 'fwd' ? ' exit-fwd' : ' exit-bwd'
          if (isActive && !isExit) cls += state.dir === 'fwd' ? ' enter-fwd' : ' enter-bwd'
          return (
            <div className={cls} key={n} aria-hidden={!isActive}>
              <Slide />
            </div>
          )
        })}
      </div>

      {/* ── Slide indicator dots ── */}
      <div className="dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`dot${state.cur === i + 1 ? ' dot-active' : ''}`}
            onClick={() => go(i + 1)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
