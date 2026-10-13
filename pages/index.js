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

      {/* ── STATEMENT SECTION ── */}
      <section className={styles.statementSection}>
        <p className={styles.statementText}>
          Your voice is<br />
          <span>your power.</span>
        </p>
        <button className={styles.statementBtn} onClick={() => router.push('/signup')}>
          START TRAINING →
        </button>
      </section>

      {/* ── VIDEO 1 ── */}
      <section className={styles.videoFull}>
        <AutoUnmuteVideo src="/middle.mp4" className={styles.videoFullEl} />
      </section>

      {/* ── TEXT MOMENT ── */}
      <section className={styles.textMoment}>
        <p className={styles.textMomentLine}>Train your voice.</p>
        <p className={styles.textMomentLineSub}><span>Own the room.</span></p>
      </section>

      {/* ── VIDEO 2 ── */}
      <section className={styles.videoFull}>
        <AutoUnmuteVideo src="/last.mp4" className={styles.videoFullEl} />
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <p className={styles.ctaLine}>Your voice.<br /><span>Elevated.</span></p>
        <button className={styles.ctaBtn} onClick={() => router.push('/signup')}>
          BEGIN YOUR JOURNEY →
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