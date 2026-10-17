import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Home.module.css';

function useAutoUnmute(ref) {
  useEffect(() => {
    if (!ref.current) return;
    const video = ref.current;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= 0.6) {
          video.muted = false;
          video.play().catch(() => { video.muted = true; video.play(); });
        } else {
          video.muted = true;
        }
      },
      { threshold: 0.6 }
    );
    obs.observe(video);
    return () => obs.disconnect();
  }, []);
}

function AutoUnmuteVideo({ src, className }) {
  const ref = useRef(null);
  useAutoUnmute(ref);
  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      loop
      playsInline
    >
      <source src={src} type="video/mp4" />
    </video>
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
            <a href="/pricing">Pricing</a>
            <a href="/programs">Programs</a>
            <a href="/login">Sign In</a>
          </div>
          <button className={styles.navCtaGold} onClick={() => router.push('/signup')}>
            Start Free
          </button>
          <button className={styles.burger} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className={styles.mobileNav}>
            <a href="/pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <a href="/programs" onClick={() => setMenuOpen(false)}>Programs</a>
            <a href="/login" onClick={() => setMenuOpen(false)}>Sign In</a>
            <a href="/signup" onClick={() => setMenuOpen(false)}>Start Free</a>
          </div>
        )}
      </nav>

      {/* ── HERO — UNTOUCHED ── */}
      <section className={styles.hero}>
        <video className={styles.heroBgVideo} autoPlay muted loop playsInline>
          <source src="/hero4.mp4" type="video/mp4" />
        </video>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.08) 60%, transparent 100%)',
          zIndex: 1,
        }} />
        <div className={styles.heroContent} style={{ paddingTop: '515px', position: 'relative', zIndex: 2 }}>
          <p style={{
            fontSize: '13px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: '#E8C97A',
            fontWeight: '700',
            marginBottom: '20px',
            textShadow: '0 1px 8px rgba(0,0,0,0.4)',
          }}>
            VOICE CONTROL
          </p>
          <button
            onClick={() => router.push('/signup')}
            style={{
              background: 'transparent',
              border: '2px solid rgba(255,255,255,0.9)',
              color: '#FFFFFF',
              padding: '16px 40px',
              fontSize: '14px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: '600',
              transition: 'all 0.3s',
              textShadow: '0 1px 6px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; }}
          >
            MEET RINA, YOUR AI VOICE COACH →
          </button>
        </div>
      </section>

      {/* ── PROBLEM & SOLUTION SECTION ── */}
      <section className={styles.statementSection} style={{ height: 'auto', padding: '120px 40px' }}>
        <p className={styles.statementText}>
          Master Your Voice.<br />
          <span>Command Any Room.</span>
        </p>

        <p style={{
          maxWidth: '720px',
          margin: '24px auto 0',
          color: 'var(--muted)',
          fontSize: '18px',
          lineHeight: '1.7',
          textAlign: 'center',
          fontWeight: '400'
        }}>
          Public speaking anxiety, filler words, shaky pitch, and weak delivery silent your true potential. 
          <strong> VoiceControl AI</strong> is your 24/7 personal speech coach—giving you real-time AI feedback 
          to refine your tone, eliminate vocal flaws, and help you speak with undeniable authority.
        </p>

        {/* 3 Key Benefits Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '32px',
          maxWidth: '1100px',
          width: '100%',
          marginTop: '60px'
        }}>
          <div style={{ padding: '24px', textAlign: 'center', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-display)', marginBottom: '12px', color: 'var(--text)' }}>
              Real-Time AI Feedback
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>
              Practice speeches, presentations, or daily conversations while AI analyzes your pitch, pace, and vocal clarity instantly.
            </p>
          </div>

          <div style={{ padding: '24px', textAlign: 'center', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-display)', marginBottom: '12px', color: 'var(--text)' }}>
              Eliminate Filler Words
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>
              Say goodbye to &ldquo;umms,&rdquo; &ldquo;ahhs,&rdquo; and nervous pauses. Build smooth, persuasive speech habits effortlessly.
            </p>
          </div>

          <div style={{ padding: '24px', textAlign: 'center', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-display)', marginBottom: '12px', color: 'var(--text)' }}>
              Tailored Coaching Sessions
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>
              Work with <strong>Rina</strong>, your AI voice coach, through custom drills tailored to your specific communication goals.
            </p>
          </div>
        </div>

        <button className={styles.statementBtn} style={{ marginTop: '50px' }} onClick={() => router.push('/signup')}>
          START FREE TRAINING →
        </button>
      </section>

      {/* ── VIDEO 1 ── */}
      <section className={styles.videoFull}>
        <AutoUnmuteVideo src="/middle1.mp4" className={styles.videoFullEl} />
      </section>

      {/* ── HOW IT WORKS SECTION ── */}
      <section className={styles.textMoment} style={{ height: 'auto', padding: '120px 40px' }}>
        <p className={styles.textMomentLine}>How VoiceControl Works</p>
        <p className={styles.textMomentLineSub}><span>3 Steps to Vocal Excellence</span></p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '40px',
          maxWidth: '1100px',
          width: '100%',
          marginTop: '60px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', color: 'var(--gold)', fontWeight: '700', fontFamily: 'var(--font-display)', marginBottom: '12px' }}>01</div>
            <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>Record or Speak Live</h4>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6' }}>
              Speak naturally into your device during practice drills, meeting prep, or presentation rehearsals.
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', color: 'var(--gold)', fontWeight: '700', fontFamily: 'var(--font-display)', marginBottom: '12px' }}>02</div>
            <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>Instant AI Diagnostics</h4>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6' }}>
              Get detailed metrics on tone, projection, cadence, filler words, and audience engagement impact.
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', color: 'var(--gold)', fontWeight: '700', fontFamily: 'var(--font-display)', marginBottom: '12px' }}>03</div>
            <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>Transform &amp; Own The Room</h4>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6' }}>
              Apply AI insights to continuously refine your voice and deliver high-impact presentations every time.
            </p>
          </div>
        </div>
      </section>

      {/* ── VIDEO 2 ── */}
      <section className={styles.videoFull}>
        <AutoUnmuteVideo src="/last1.mp4" className={styles.videoFullEl} />
      </section>

      {/* ── FINAL CTA SECTION ── */}
      <section className={styles.ctaSection} style={{ height: 'auto', padding: '120px 40px' }}>
        <p className={styles.ctaLine}>Ready to elevate<br /><span>your voice?</span></p>
        <p style={{
          maxWidth: '600px',
          margin: '20px auto 0',
          color: 'var(--muted)',
          fontSize: '16px',
          lineHeight: '1.6',
          textAlign: 'center'
        }}>
          Join thousands of executives, creators, and public speakers using VoiceControl AI to turn their speech into their greatest asset.
        </p>
        <button className={styles.ctaBtn} onClick={() => router.push('/signup')}>
          BEGIN YOUR FREE JOURNEY →
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>Voice<span>Control</span> AI</div>
          <div className={styles.footerCols}>
            <div className={styles.footerCol}>
              <p className={styles.footerColHead}>Product</p>
              <a href="/pricing">Pricing</a>
              <a href="/programs">Programs</a>
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