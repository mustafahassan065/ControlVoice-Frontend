import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Home.module.css';

// ── Scroll reveal ────────────────────────────────────────────
function useReveal(ref, threshold = 0.1) {
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { e.target.classList.add(styles.revealed); obs.unobserve(e.target); }
    }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
}
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  useReveal(ref);
  return (
    <div ref={ref} className={`${styles.reveal} ${className}`} style={{ '--d': `${delay}s` }}>
      {children}
    </div>
  );
}

// ── Animated waveform ────────────────────────────────────────
function Waveform({ bars = 16, color = '#C9A84C', height = 40 }) {
  return (
    <div className={styles.waveformRow} style={{ height }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className={styles.waveformBar}
          style={{ '--i': i, '--c': color, '--bars': bars }} />
      ))}
    </div>
  );
}

// ── Pitch contour SVG ────────────────────────────────────────
function PitchContour() {
  return (
    <svg viewBox="0 0 600 120" className={styles.pitchSvg} preserveAspectRatio="none">
      <path
        d="M0,90 C60,90 80,30 140,35 C200,40 220,80 280,45 C340,10 360,60 420,40 C480,20 520,70 600,55"
        fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round"
        className={styles.pitchPath}
      />
      <circle cx="280" cy="45" r="5" fill="#C9A84C" className={styles.pitchDot} />
    </svg>
  );
}

// ── Sound sculpture SVG ──────────────────────────────────────
function SoundSculpture() {
  return (
    <svg viewBox="0 0 400 200" className={styles.sculptSvg}>
      {[0,1,2,3,4,5,6,7,8].map(i => (
        <ellipse key={i}
          cx="200" cy="100"
          rx={20 + i * 20} ry={8 + i * 8}
          fill="none" stroke="#C9A84C"
          strokeWidth={0.8 - i * 0.07}
          opacity={1 - i * 0.1}
          className={styles.sculptRing}
          style={{ '--ri': i }}
        />
      ))}
      <circle cx="200" cy="100" r="6" fill="#C9A84C" />
    </svg>
  );
}

// ── Voice energy ─────────────────────────────────────────────
function VoiceEnergy() {
  return (
    <div className={styles.energyWrap}>
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className={styles.energyBar}
          style={{ '--ei': i, '--eh': `${20 + Math.sin(i * 0.7) * 40 + Math.cos(i * 0.3) * 20}px` }} />
      ))}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.page}>

      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navLogo} onClick={() => router.push('/')}>
            Voice<span>Control</span> AI
          </div>
          <div className={styles.navLinks}>
            <a href="#product">How It Works</a>
            <a href="/pricing">Pricing</a>
            <a href="/login">Sign In</a>
          </div>
          <button className={styles.navCta} onClick={() => router.push('/signup')}>
            Start Free
          </button>
          <button className={styles.burger} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className={styles.mobileNav}>
            <a href="#product" onClick={() => setMenuOpen(false)}>How It Works</a>
            <a href="/pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <a href="/login" onClick={() => setMenuOpen(false)}>Sign In</a>
            <a href="/signup" onClick={() => setMenuOpen(false)}>Start Free</a>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════════
          1. HERO — FULL WIDTH VIDEO
      ══════════════════════════════════════════════════════ */}
      <section className={styles.hero}>
        {/* VIDEO PLACEHOLDER — replace /public/hero-video.mp4 with AI generated cinematic video
            Prompt: professional woman speaking → nervous → AI analysis → confident transformation */}
        {/* HERO VIDEO — replace with AI generated video when ready */}
        <video
          className={styles.heroBgVideo}
          autoPlay muted loop playsInline
        >
          
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>VOICE CONTROL</p>
          <h1 className={styles.heroHeading}>
            Change how the world<br />hears you.
          </h1>
          <p className={styles.heroCaps}>
            Pronunciation · Intonation · Fluency · Presence
          </p>
          <button className={styles.heroBtn} onClick={() => router.push('/signup')}>
            EXPERIENCE VOICE CONTROL →
          </button>
        </div>
        <div className={styles.heroWave}>
          <Waveform bars={32} color="rgba(201,168,76,0.4)" height={48} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          2. TECHNOLOGY VISUALS — IVORY BACKGROUND
      ══════════════════════════════════════════════════════ */}
      <section className={styles.techSection}>
        <Reveal>
          <p className={styles.techTagline}>Your voice. Revealed.</p>
        </Reveal>
        <div className={styles.techGrid}>

          <Reveal delay={0}>
            <div className={styles.techCard}>
              <SoundSculpture />
              <p className={styles.techLabel}>PRONUNCIATION</p>
              <p className={styles.techDesc}>
                Every sound shaped with precision. AI hears what others miss.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className={styles.techCard}>
              <PitchContour />
              <p className={styles.techLabel}>INTONATION</p>
              <p className={styles.techDesc}>
                Your pitch contour mapped in real time. Rise and fall with intention.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className={styles.techCard}>
              <VoiceEnergy />
              <p className={styles.techLabel}>PRESENCE</p>
              <p className={styles.techDesc}>
                Voice energy visualized. Command attention before you finish a sentence.
              </p>
            </div>
          </Reveal>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3. EDITORIAL IMAGES — FULL WIDTH PORTRAITS
      ══════════════════════════════════════════════════════ */}
      <section className={styles.editorialSection}>

        <Reveal className={styles.editorialRow}>
          <div className={styles.editorialImg}>
            {/* IMAGE PLACEHOLDER — replace with professional woman preparing for interview */}
            <img
              src="https://unsplash.com/photos/two-women-taking-to-each-other-while-holding-pens-4PU-OC8sW98"
              alt="Professional preparing for interview"
              className={styles.editorialImgEl}
            />
            <div className={styles.editorialOverlay} />
          </div>
          <div className={styles.editorialCopy} style={{ textAlign: 'left' }}>
            <p className={styles.editorialWord}>Speak clearly.</p>
            <p className={styles.editorialSub}>
              From your first word to your last — every sound lands with intention.
            </p>
          </div>
        </Reveal>

        <Reveal className={`${styles.editorialRow} ${styles.editorialRowReverse}`}>
          <div className={styles.editorialImg}>
            {/* IMAGE PLACEHOLDER — replace with person speaking in a meeting */}
            <img
              src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1400&q=90&fit=crop"
              alt="Professional speaking in meeting"
              className={styles.editorialImgEl}
            />
            <div className={styles.editorialOverlay} />
          </div>
          <div className={styles.editorialCopy} style={{ textAlign: 'right' }}>
            <p className={styles.editorialWord}>Sound powerful.</p>
            <p className={styles.editorialSub}>
              Authority is not volume. It is rhythm, pause, and the weight of your words.
            </p>
          </div>
        </Reveal>

        <Reveal className={styles.editorialRow}>
          <div className={styles.editorialImg}>
            {/* IMAGE PLACEHOLDER — replace with public speaker on stage */}
            <img
              src="https://unsplash.com/photos/a-woman-with-blue-hair-standing-in-front-of-an-audience-GkWP64truqg"
              alt="Public speaker on stage"
              className={styles.editorialImgEl}
            />
            <div className={styles.editorialOverlay} />
          </div>
          <div className={styles.editorialCopy} style={{ textAlign: 'left' }}>
            <p className={styles.editorialWord}>Be remembered.</p>
            <p className={styles.editorialSub}>
              The voices people remember are trained. Yours can be one of them.
            </p>
          </div>
        </Reveal>

      </section>

      {/* ══════════════════════════════════════════════════════
          4. REAL PRODUCT VIDEO — MOST IMPORTANT
      ══════════════════════════════════════════════════════ */}
      <section className={styles.productSection} id="product">
        <Reveal>
          <p className={styles.productEyebrow}>The Technology</p>
          <h2 className={styles.productHeading}>IT HEARS WHAT YOU CAN'T.</h2>
          <p className={styles.productSub}>Then it trains you to change it.</p>
        </Reveal>

        <Reveal delay={0.1} className={styles.productVideoWrap}>
          {/* VIDEO PLACEHOLDER — replace /public/product-demo.mp4 with actual screen recording
              Sequence: person speaks → Rina listens → transcript appears → issue detected
              → Rina gives one correction → user repeats → visible improvement */}
          <div className={styles.productVideoBox}>
            {/* PRODUCT VIDEO — replace with real screen recording when ready */}
            <video
              className={styles.productVideo}
              autoPlay muted loop playsInline
            >
              <source src="/hero-video.mp4" type="video/mp4" />
            </video>
            {/* Fallback overlay shown when no video */}
            <div className={styles.productVideoFallback}>
              <div className={styles.productDemoAnim}>
                <div className={styles.demoRow}>
                  <span className={styles.demoLabel}>You</span>
                  <span className={styles.demoText}>"I have five years in marketing and I—"</span>
                </div>
                <div className={styles.demoAnalyze}>
                  <Waveform bars={20} color="#C9A84C" height={32} />
                  <span className={styles.demoAnalyzeText}>Analyzing pace · pauses · intonation</span>
                </div>
                <div className={styles.demoRow} style={{ marginTop: '8px' }}>
                  <span className={styles.demoLabel} style={{ color: '#C9A84C' }}>Rina</span>
                  <span className={styles.demoText}>"Pause after 'five years'. Let it land."</span>
                </div>
                <div className={styles.demoMetrics}>
                  {[{ l: 'Pace', before: 42, after: 82 }, { l: 'Pause', before: 28, after: 76 }, { l: 'Intonation', before: 55, after: 88 }].map((m, i) => (
                    <div key={i} className={styles.demoMetric}>
                      <span className={styles.demoMetricLabel}>{m.l}</span>
                      <div className={styles.demoMetricBar}>
                        <div className={styles.demoMetricFill} style={{ '--mw': `${m.after}%` }} />
                      </div>
                      <span className={styles.demoMetricVal} style={{ color: '#4ADE80' }}>{m.after}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.2} className={styles.productCtaRow}>
          <button className={styles.productWatchBtn} onClick={() => router.push('/signup')}>
            WATCH A REAL SESSION →
          </button>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════════════
          5. TRANSFORMATION VISUALS
      ══════════════════════════════════════════════════════ */}
      <section className={styles.transformSection}>
        <Reveal>
          <p className={styles.transformTagline}>The difference is audible.</p>
          <p className={styles.transformNote}>* Metrics shown are representative examples, not verified customer results.</p>
        </Reveal>

        <div className={styles.transformGrid}>
          {[
            {
              label: 'INTERVIEW',
              img: '/transform-interview.jpg',
              before: 'Rushed. Nervous. Trailing sentences.',
              after: 'Calm. Composed. Every word lands.',
              scoreB: 44, scoreA: 87,
            },
            {
              label: 'PRONUNCIATION',
              img: '/transform-pronunciation.jpg',
              before: 'Unclear consonants. Inconsistent vowels.',
              after: 'Crisp, precise, naturally confident.',
              scoreB: 51, scoreA: 89,
            },
            {
              label: 'LEADERSHIP',
              img: '/transform-leadership.jpg',
              before: 'Low energy. No authority. Easily ignored.',
              after: 'Executive presence. Room listens.',
              scoreB: 38, scoreA: 92,
            },
          ].map((t, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className={styles.transformCard}>
                <div className={styles.transformImgWrap}>
                  {/* IMAGE PLACEHOLDER — replace with real before/after portrait */}
                  <img
                    src={t.img}
                    alt={t.label}
                    className={styles.transformImg}
                    onError={e => { e.target.src = `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80`; }}
                  />
                  <div className={styles.transformImgOverlay} />
                  <p className={styles.transformCardLabel}>{t.label}</p>
                </div>
                <div className={styles.transformBody}>
                  <div className={styles.transformCompare}>
                    <div className={styles.transformBefore}>
                      <span className={styles.transformTag} style={{ color: '#F87171' }}>BEFORE</span>
                      <p>{t.before}</p>
                      <div className={styles.transformScore} style={{ color: '#F87171' }}>{t.scoreB}<span>/100</span></div>
                    </div>
                    <div className={styles.transformArrow}>→</div>
                    <div className={styles.transformAfter}>
                      <span className={styles.transformTag} style={{ color: '#4ADE80' }}>AFTER</span>
                      <p>{t.after}</p>
                      <div className={styles.transformScore} style={{ color: '#4ADE80' }}>{t.scoreA}<span>/100</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          6. FINAL FULL-WIDTH VIDEO
      ══════════════════════════════════════════════════════ */}
      <section className={styles.finalSection}>
        {/* VIDEO PLACEHOLDER — replace /public/final-video.mp4 with cinematic montage
            Sequence: interview → meeting → presentation → international speaker
            → close-up of confident speaking → waveform → AI analysis → final confident delivery */}
        {/* FINAL VIDEO — replace with cinematic montage when ready */}
        <video
          className={styles.finalVideo}
          autoPlay muted loop playsInline
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div className={styles.finalOverlay} />
        <div className={styles.finalContent}>
          <Reveal>
            <h2 className={styles.finalHeading}>
              YOUR VOICE<br />CAN CHANGE.
            </h2>
            <p className={styles.finalSub}>30 seconds. Hear where you can go.</p>
            <button className={styles.finalBtn} onClick={() => router.push('/signup')}>
              START SPEAKING →
            </button>
          </Reveal>
        </div>
        <div className={styles.finalWave}>
          <Waveform bars={40} color="rgba(201,168,76,0.35)" height={56} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          7. FOOTER — MINIMAL
      ══════════════════════════════════════════════════════ */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>Voice<span>Control</span> AI</div>
          <div className={styles.footerCols}>
            <div className={styles.footerCol}>
              <p className={styles.footerColHead}>Product</p>
              <a href="#product">How It Works</a>
              <a href="/pricing">Pricing</a>
              <a href="#">Voice Control Method</a>
            </div>
            <div className={styles.footerCol}>
              <p className={styles.footerColHead}>Company</p>
              <a href="#">About</a>
              <a href="/login">Sign In</a>
              <a href="/signup">Start Free</a>
            </div>
            <div className={styles.footerCol}>
              <p className={styles.footerColHead}>Follow</p>
              <a href="#">Instagram</a>
              <a href="#">YouTube</a>
              <a href="#">LinkedIn</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>© 2025 Voice Control AI</p>
            <div className={styles.footerLegal}>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}