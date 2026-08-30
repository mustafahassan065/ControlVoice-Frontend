import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Home.module.css';

// ── Animated waveform bars ──────────────────────────────────
function Waveform({ active = false, bars = 12 }) {
  return (
    <div className={styles.waveform} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={active ? styles.waveBarActive : styles.waveBar}
          style={{ '--i': i, '--bars': bars }}
        />
      ))}
    </div>
  );
}

// ── Scroll fade-in hook ─────────────────────────────────────
function useFadeIn(ref) {
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) e.target.classList.add(styles.visible); },
      { threshold: 0.12 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
}

function FadeSection({ children, className = '' }) {
  const ref = useRef(null);
  useFadeIn(ref);
  return <div ref={ref} className={`${styles.fadeSection} ${className}`}>{children}</div>;
}

// ── Main component ──────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [demoOpen, setDemoOpen] = useState(false);
  const [goal, setGoal] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [insight, setInsight] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [retryRecorded, setRetryRecorded] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState(null);
  const [converted, setConverted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mediaRef = useRef(null);
  const demoRef = useRef(null);
  const chunksRef = useRef([]);

  const goals = [
    { id: 'job', label: 'Get the Job', icon: '💼' },
    { id: 'leadership', label: 'Leadership', icon: '🎯' },
    { id: 'ielts', label: 'IELTS', icon: '🎓' },
    { id: 'presentations', label: 'Presentations', icon: '📊' },
    { id: 'clear', label: 'Speak Clearly', icon: '🗣️' },
    { id: 'confidence', label: 'Confidence', icon: '⚡' },
  ];

  const insights = {
    job: 'You speed up when you reach the most important part of your message. Let\'s work on that.',
    leadership: 'Your sentences lose energy at the end — they trail off instead of landing with authority.',
    ielts: 'Your pace is inconsistent. You rush through complex ideas and slow on simple ones.',
    presentations: 'You use filler words most when transitioning between points. We can fix that.',
    clear: 'Your pauses are hesitant, not intentional. Deliberate silence sounds very different.',
    confidence: 'Your pitch rises at the end of statements, making them sound like questions.',
  };

  const retryFeedbacks = {
    job: 'Better. Your pace was more controlled this time. The key points landed clearly.',
    leadership: 'Stronger ending. Your last sentence held its energy — that\'s the difference.',
    ielts: 'Much more consistent. Your transitions are smoother now.',
    presentations: 'Good. Fewer fillers in the second half. Keep that discipline.',
    clear: 'Your pauses now sound deliberate. That changes how people hear you.',
    confidence: 'Your pitch stayed level. That confidence reads immediately.',
  };

  function openDemo() {
    setDemoOpen(true);
    setTimeout(() => demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => stream.getTracks().forEach(t => t.stop());
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
      setTimeout(() => {
        mr.stop();
        setRecording(false);
        setRecorded(true);
      }, 5000); // 5s demo
    } catch {
      setRecorded(true); // allow flow even without mic
    }
  }

  function analyzeRecording() {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setInsight(insights[goal] || insights.confidence);
    }, 2200);
  }

  function startRetry() {
    setRetrying(true);
    setRecording(true);
    setTimeout(() => {
      setRecording(false);
      setRetryRecorded(true);
    }, 5000);
  }

  function analyzeRetry() {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setRetryFeedback(retryFeedbacks[goal] || retryFeedbacks.confidence);
    }, 1800);
  }

  return (
    <div className={styles.page}>

      {/* ── NAV ── */}
      <nav className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.logo} onClick={() => router.push('/')}>
            <div className={styles.logoIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12h2M6 8v8M10 5v14M14 9v6M18 7v10M22 12h-2"/>
              </svg>
            </div>
            <span className={styles.logoText}>Voice<span>Control</span> AI</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#how">How It Works</a>
            <a href="#demo">Free Demo</a>
            <a href="/pricing">Pricing</a>
          </div>
          <div className={styles.navCta}>
            <button className={styles.btnGhost} onClick={() => router.push('/login')}>Sign in</button>
            <button className={styles.btnPrimary} onClick={() => router.push('/signup')}>Start Free</button>
          </div>
          <button className={styles.hamburger} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <span /><span /><span />
          </button>
        </div>
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <a href="#how" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)}>Free Demo</a>
            <a href="/pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <button onClick={() => router.push('/login')}>Sign in</button>
            <button className={styles.btnPrimary} onClick={() => router.push('/signup')}>Start Free</button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        {/* Video background — replace src with AI generated video */}
        <div className={styles.videoBg}>
          <video
            autoPlay muted loop playsInline
            className={styles.heroVideo}
            poster="/hero-poster.jpg"
          >
            {/* Replace this with AI generated video when ready */}
            <source src="/hero-placeholder.mp4" type="video/mp4" />
          </video>
          <div className={styles.videoOverlay} />
        </div>

        <div className={styles.heroContent}>
          <span className={styles.pill}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
            AI Voice Coaching
          </span>

          <h1 className={styles.heroHeading}>
            BE HEARD.<br />
            <span className={styles.heroAccent}>GO FURTHER.</span>
          </h1>

          <p className={styles.heroSub}>
            Personalized AI voice coaching built around your voice and your goals.<br />
            Just 3 minutes a day.
          </p>

          <button className={styles.heroCta} onClick={openDemo}>
            <span className={styles.heroCtaGlow} />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
            TRY YOUR COACH FREE
          </button>

          <div className={styles.goalTags}>
            {['Interview', 'Leadership', 'IELTS', 'Presentations', 'Clear English', 'Confidence'].map(g => (
              <span key={g} className={styles.goalTag}>{g}</span>
            ))}
          </div>

          <Waveform bars={14} />
        </div>
      </section>

      {/* ── FREE DEMO ── */}
      <section className={styles.demoSection} id="demo" ref={demoRef}>
        {!demoOpen ? (
          <FadeSection className={styles.demoTeaser}>
            <p className={styles.eyebrow}>Free Interactive Demo</p>
            <h2 className={styles.sectionHeading}>Hear what your voice sounds like to others</h2>
            <p className={styles.sectionSub}>30 seconds. No account needed. Real AI coaching insight.</p>
            <button className={styles.heroCta} onClick={openDemo}>
              <span className={styles.heroCtaGlow} />
              TRY YOUR COACH FREE
            </button>
          </FadeSection>
        ) : (
          <div className={styles.demoBox}>

            {/* STEP 1 — Goal */}
            {!goal && (
              <FadeSection>
                <p className={styles.demoQuestion}>What do you want your voice to help you achieve?</p>
                <div className={styles.goalGrid}>
                  {goals.map(g => (
                    <button
                      key={g.id}
                      className={styles.goalBtn}
                      onClick={() => setGoal(g.id)}
                    >
                      <span className={styles.goalBtnIcon}>{g.icon}</span>
                      {g.label}
                    </button>
                  ))}
                </div>
              </FadeSection>
            )}

            {/* STEP 2 — Record */}
            {goal && !recorded && !insight && (
              <FadeSection>
                <p className={styles.demoQuestion}>
                  Speak for 30 seconds — introduce yourself or talk about your goal.
                </p>
                <div className={styles.recordArea}>
                  <Waveform active={recording} bars={16} />
                  {!recording ? (
                    <button className={styles.recordBtn} onClick={startRecording}>
                      <span className={styles.recordRing} />
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                      </svg>
                      Start Recording
                    </button>
                  ) : (
                    <div className={styles.recordingIndicator}>
                      <span className={styles.recDot} />
                      Listening...
                    </div>
                  )}
                </div>
              </FadeSection>
            )}

            {/* STEP 3 — Analyze */}
            {recorded && !insight && !analyzing && (
              <FadeSection>
                <p className={styles.demoQuestion}>Recording complete. Ready for your coaching insight?</p>
                <button className={styles.heroCta} onClick={analyzeRecording}>
                  <span className={styles.heroCtaGlow} />
                  Analyze My Voice
                </button>
              </FadeSection>
            )}

            {analyzing && (
              <div className={styles.analyzingBox}>
                <Waveform active bars={20} />
                <p className={styles.analyzingText}>AI is analyzing your voice...</p>
              </div>
            )}

            {/* STEP 4 — Insight */}
            {insight && !retryFeedback && (
              <FadeSection>
                <div className={styles.insightBox}>
                  <p className={styles.insightLabel}>Your coaching insight</p>
                  <p className={styles.insightText}>{insight}</p>
                  <p className={styles.insightSub}>Let&apos;s work on that.</p>
                </div>

                {!retrying && !retryRecorded && (
                  <>
                    <p className={styles.demoQuestion} style={{ marginTop: '24px' }}>
                      Now try again — this time, focus on your key point and slow down before it.
                    </p>
                    <button className={styles.recordBtn} onClick={startRetry} style={{ margin: '0 auto', display: 'flex' }}>
                      <span className={styles.recordRing} />
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                      </svg>
                      Record Again
                    </button>
                  </>
                )}

                {retrying && recording && (
                  <div className={styles.recordingIndicator}>
                    <Waveform active bars={16} />
                    <span className={styles.recDot} /> Listening...
                  </div>
                )}

                {retryRecorded && !retryFeedback && !analyzing && (
                  <button className={styles.heroCta} onClick={analyzeRetry} style={{ marginTop: '20px' }}>
                    <span className={styles.heroCtaGlow} />
                    COACH ME
                  </button>
                )}
              </FadeSection>
            )}

            {/* STEP 5 — Retry Feedback + Conversion */}
            {retryFeedback && !converted && (
              <FadeSection>
                <div className={styles.retryBox}>
                  <p className={styles.retryFeedback}>{retryFeedback}</p>
                </div>
                <button className={styles.heroCta} onClick={() => setConverted(true)} style={{ marginTop: '24px' }}>
                  <span className={styles.heroCtaGlow} />
                  See What 30 Days Can Do
                </button>
              </FadeSection>
            )}

            {/* STEP 6 — Conversion */}
            {converted && (
              <FadeSection>
                <div className={styles.conversionBox}>
                  <p className={styles.conversionHeading}>YOU JUST MET YOUR VOICE COACH.</p>
                  <p className={styles.conversionSub}>
                    Imagine what it could learn about your voice in 30 days.<br />
                    3 minutes a day. Personalized to you.
                  </p>
                  <button
                    className={styles.heroCta}
                    onClick={() => router.push('/signup')}
                    style={{ marginTop: '28px' }}
                  >
                    <span className={styles.heroCtaGlow} />
                    START MY PERSONAL PROGRAM
                  </button>
                </div>
              </FadeSection>
            )}

          </div>
        )}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={styles.howSection} id="how">
        <FadeSection className={styles.sectionWrap}>
          <p className={styles.eyebrow}>The Process</p>
          <h2 className={styles.sectionHeading}>Speak → AI Listens → AI Coaches → Practice → AI Adapts</h2>
          <div className={styles.stepsGrid}>
            {[
              { icon: '🎙️', label: 'SPEAK', title: 'Record 30 seconds', desc: 'Speak naturally. No script needed.', delay: 0 },
              { icon: '🧠', label: 'LISTEN', title: 'AI Listens', desc: 'Whisper transcribes. AI measures pace, pitch, pauses, endings.', delay: 1 },
              { icon: '🎓', label: 'COACH', title: 'Personal Coaching', desc: 'One specific insight. One targeted exercise. Every session.', delay: 2 },
              { icon: '📈', label: 'IMPROVE', title: 'Track Progress', desc: 'Authority Score improves. AI adapts to your growth.', delay: 3 },
            ].map((step, i) => (
              <div key={i} className={styles.stepCard} style={{ '--step-delay': `${step.delay * 0.15}s` }}>
                <div className={styles.stepLabel}>{step.label}</div>
                <div className={styles.stepIconWrap}>{step.icon}</div>
                <h4 className={styles.stepTitle}>{step.title}</h4>
                <p className={styles.stepDesc}>{step.desc}</p>
                {i < 3 && <div className={styles.stepArrow}>→</div>}
              </div>
            ))}
          </div>
        </FadeSection>
      </section>

      {/* ── PERSONALIZATION ── */}
      <section className={styles.personalSection}>
        <FadeSection className={styles.sectionWrap}>
          <p className={styles.eyebrow}>Built Around You</p>
          <h2 className={styles.sectionHeading}>Different goals. Different coaching.</h2>
          <div className={styles.personalGrid}>
            {[
              { goal: 'Job Interview', focus: 'Pace & Confidence', insight: 'You rush through your strongest points. We slow you down where it counts.' },
              { goal: 'IELTS Speaking', focus: 'Fluency & Clarity', insight: 'Your transitions are weak. We build linking phrases into muscle memory.' },
              { goal: 'Leadership', focus: 'Authority & Endings', insight: 'Your sentences trail off. We train you to land every statement with conviction.' },
            ].map((p, i) => (
              <div key={i} className={styles.personalCard}>
                <span className={styles.personalGoal}>{p.goal}</span>
                <p className={styles.personalFocus}>{p.focus}</p>
                <p className={styles.personalInsight}>&ldquo;{p.insight}&rdquo;</p>
              </div>
            ))}
          </div>
        </FadeSection>
      </section>

      {/* ── AVATAR CTA ── */}
      <section className={styles.avatarSection}>
        <FadeSection className={styles.avatarInner}>
          <div className={styles.avatarGlow} />
          <p className={styles.eyebrow} style={{ color: 'rgba(255,255,255,0.5)' }}>Live AI Voice Coach</p>
          <h2 className={styles.avatarHeading}>Talk to your coach. Right now.</h2>
          <p className={styles.avatarSub}>
            Your AI Voice Coach already knows your scores, your weaknesses, and your goals.
            Just speak — it listens, responds, and guides you live.
          </p>
          <div className={styles.avatarPulse}>
            <div className={styles.avatarRing} />
            <div className={styles.avatarRing2} />
            <div className={styles.avatarIcon}>🎓</div>
          </div>
          <button className={styles.heroCta} onClick={() => router.push('/signup')} style={{ marginTop: '32px' }}>
            <span className={styles.heroCtaGlow} />
            Meet Your AI Coach
          </button>
        </FadeSection>
      </section>

      {/* ── PRODUCT PREVIEW ── */}
      <section className={styles.productSection}>
        <FadeSection className={styles.sectionWrap}>
          <p className={styles.eyebrow}>What You Get</p>
          <h2 className={styles.sectionHeading}>Everything your voice needs to improve</h2>
          <div className={styles.productGrid}>
            {[
              { icon: '📊', title: 'Authority Score', desc: 'A single number that tracks your voice confidence across every session.' },
              { icon: '🎓', title: 'Live AI Coach', desc: 'Talk to your coach face-to-face. It knows your history and adapts in real time.' },
              { icon: '🎧', title: 'Voice Shadowing', desc: 'Listen to model sentences. Record yourself. Hear the difference.' },
              { icon: '📧', title: 'Daily Coaching Emails', desc: 'Morning, afternoon, and evening — each one personalized by your latest data.' },
              { icon: '📈', title: '7 & 30 Day Challenges', desc: 'Structured programs that build your voice systematically over time.' },
              { icon: '🎯', title: 'Personalized Curriculum', desc: 'Exercises chosen by AI based on your weakest area, updated every session.' },
            ].map((f, i) => (
              <div key={i} className={styles.productCard}>
                <span className={styles.productIcon}>{f.icon}</span>
                <h4 className={styles.productTitle}>{f.title}</h4>
                <p className={styles.productDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </FadeSection>
      </section>

      {/* ── FINAL CTA ── */}
      <section className={styles.finalCta}>
        <FadeSection className={styles.finalCtaInner}>
          <p className={styles.eyebrow} style={{ color: 'rgba(255,255,255,0.5)' }}>Start Today</p>
          <h2 className={styles.finalCtaHeading}>3 minutes a day.<br />A voice that opens doors.</h2>
          <button className={styles.heroCta} onClick={() => router.push('/signup')} style={{ fontSize: '16px', padding: '16px 40px' }}>
            <span className={styles.heroCtaGlow} />
            START MY 3 MINUTES
          </button>
        </FadeSection>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12h2M6 8v8M10 5v14M14 9v6M18 7v10M22 12h-2"/>
              </svg>
            </div>
            <span className={styles.logoText}>Voice<span>Control</span> AI</span>
          </div>
          <p className={styles.footerText}>© 2025 Voice Control AI. All rights reserved.</p>
          <div className={styles.footerLinks}>
            <a href="/pricing">Pricing</a>
            <a href="/login">Sign In</a>
            <a href="/signup">Start Free</a>
          </div>
        </div>
      </footer>

    </div>
  );
}