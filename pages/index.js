import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

export default function Home() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12h2M6 8v8M10 5v14M14 9v6M18 7v10M22 12h-2"/>
              </svg>
            </div>
            <span className={styles.logoText}>Voice<span>Control</span> AI</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#how">How It Works</a>
            <a href="#programs">Programs</a>
           <a href="/pricing">Pricing</a>
          </div>
          <div className={styles.navCta}>
            <button className={styles.btnGhost} onClick={() => router.push('/login')}>Sign in</button>
            <button className={styles.btnPrimary} onClick={() => router.push('/signup')}>Start Free</button>
          </div>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.pill}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
            AI Voice Analysis
          </span>
          <h1>Sound Confident.<br /><span>Lead Every Room.</span></h1>
          <p>Record 60 seconds. Get your Authority Score. Start sounding like a leader — in 30 days.</p>
          <div className={styles.heroBtns}>
            <button className={styles.btnPrimaryLg} onClick={() => router.push('/signup')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
              </svg>
              Record Your Voice
            </button>
            <button className={styles.btnGhostLg} onClick={() => router.push('/login')}>Sign In</button>
          </div>
          <div className={styles.waveform} aria-hidden="true">
            {[12,24,38,44,32,40,20,30,44,16].map((h, i) => (
              <span key={i} style={{ '--h': `${h}px`, '--delay': `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.howSection} id="how">
        <div className={styles.sectionWrap}>
          <p className={styles.eyebrow}>The Process</p>
          <h2 className={styles.sectionHeading}>From Recording to Results</h2>
          <div className={styles.stepsGrid}>
            {[
              { icon: '👤', title: 'Sign Up', desc: 'Create your account in seconds', color: 'var(--gold)' },
              { icon: '🎙️', title: 'Record 60s', desc: 'Speak naturally — introduce yourself', color: 'var(--teal)' },
              { icon: '🧠', title: 'AI Analysis', desc: 'Whisper transcribes, AI measures your voice', color: 'var(--purple)' },
              { icon: '📊', title: 'Get Score', desc: 'Full Authority Report with your weaknesses', color: 'var(--green)' },
              { icon: '📧', title: 'Daily Training', desc: '3-minute exercise every morning at 8 AM', color: 'var(--gold)' },
            ].map((step, i) => (
              <div key={i} className={styles.stepCard}>
                <div className={styles.stepIcon} style={{ background: `${step.color}18`, border: `1px solid ${step.color}44` }}>
                  <span style={{ fontSize: '22px' }}>{step.icon}</span>
                </div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12h2M6 8v8M10 5v14M14 9v6M18 7v10M22 12h-2"/>
              </svg>
            </div>
            <span className={styles.logoText}>Voice<span>Control</span> AI</span>
          </div>
          <p className={styles.footerText}>© 2025 VoiceControl AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}