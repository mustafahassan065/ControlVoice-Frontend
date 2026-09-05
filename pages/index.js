import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Home.module.css';

// ── Waveform ────────────────────────────────────────────────
function Waveform({ active = false, bars = 12, color = '#C9A84C', size = 'md' }) {
  return (
    <div className={`${styles.waveform} ${styles[`waveform_${size}`]}`} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i}
          className={active ? styles.waveBarActive : styles.waveBar}
          style={{ '--i': i, '--bars': bars, '--wcolor': color }} />
      ))}
    </div>
  );
}

// ── Scroll fade ─────────────────────────────────────────────
function useScrollReveal(ref, options = {}) {
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        e.target.classList.add(styles.visible);
        if (options.once !== false) obs.unobserve(e.target);
      }
    }, { threshold: options.threshold || 0.08, ...options });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
}

function FadeSection({ children, className = '', delay = 0, direction = 'up' }) {
  const ref = useRef(null);
  useScrollReveal(ref);
  return (
    <div ref={ref}
      className={`${styles.fadeSection} ${styles[`fade_${direction}`]} ${className}`}
      style={{ '--fade-delay': `${delay}s` }}>
      {children}
    </div>
  );
}

// ── Counter ─────────────────────────────────────────────────
function Counter({ from, to, active, suffix = '' }) {
  const [val, setVal] = useState(from);
  useEffect(() => {
    if (!active) { setVal(from); return; }
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1600, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, from, to]);
  return <span>{val}{suffix}</span>;
}

// ── Stories ─────────────────────────────────────────────────
const STORIES = [
  { id: 'interview', tag: 'Job Interview', problem: 'Fails every interview. Speaks too fast, loses confidence under pressure.', problemIcon: '😰', result: 'Lands the role. Walks in composed, speaks with authority.', resultIcon: '🏆', metric: 'Authority', before: 42, after: 89 },
  { id: 'ielts', tag: 'IELTS Speaking', problem: 'IELTS band 5.5. Struggles with fluency and natural pace.', problemIcon: '📉', result: 'Achieves band 7.5. Clear, confident, naturally fluent.', resultIcon: '🎓', metric: 'Fluency', before: 55, after: 88 },
  { id: 'leadership', tag: 'Leadership', problem: 'Ideas get ignored in meetings. No presence or authority.', problemIcon: '🤐', result: 'Commands the room. Every sentence lands with conviction.', resultIcon: '💼', metric: 'Presence', before: 38, after: 92 },
  { id: 'presentations', tag: 'Presentations', problem: 'Nervous on stage. Rushes through slides, loses the audience.', problemIcon: '😓', result: 'Delivers with calm authority. Audience stays engaged.', resultIcon: '🎯', metric: 'Confidence', before: 45, after: 86 },
];

// ── Live session script ─────────────────────────────────────
const SESSION_STEPS = [
  { speaker: 'user', text: 'I have a job interview tomorrow morning.' },
  { speaker: 'rina', text: 'Give me your opening answer — how you would introduce yourself.' },
  { speaker: 'user', text: 'Hi, I am Sarah, I have five years in marketing and I—' },
  { speaker: 'system', text: 'Analyzing pace · pauses · emphasis', isAnalysis: true },
  { speaker: 'metrics', data: [{ label: 'Pace', val: 68, color: '#F87171' }, { label: 'Pause', val: 32, color: '#F87171' }, { label: 'Emphasis', val: 74, color: '#C9A84C' }] },
  { speaker: 'rina', text: 'You sped up in the middle. Pause after "five years" — let it land. Try again.' },
  { speaker: 'user', text: 'Hi, I am Sarah. I have five years in marketing... and I lead growth campaigns.' },
  { speaker: 'metrics', data: [{ label: 'Pace', val: 82, color: '#4ADE80' }, { label: 'Pause', val: 78, color: '#4ADE80' }, { label: 'Emphasis', val: 85, color: '#4ADE80' }] },
  { speaker: 'rina', text: 'That is your interview voice. The pause made it land.' },
];

const STEP_DELAYS = [0, 900, 1900, 3000, 3500, 4800, 6200, 7600, 8800];

function LiveSessionDemo() {
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { setRunning(true); setStep(0); }
    }, { threshold: 0.25 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [running]);

  useEffect(() => {
    if (step < 0 || step >= SESSION_STEPS.length) return;
    const nextDelay = step < SESSION_STEPS.length - 1
      ? STEP_DELAYS[step + 1] - STEP_DELAYS[step]
      : 2000;
    timerRef.current = setTimeout(() => setStep(s => s + 1), nextDelay);
    return () => clearTimeout(timerRef.current);
  }, [step]);

  function replay() { setStep(0); setRunning(true); }

  return (
    <div className={styles.liveDemo} ref={ref}>
      <div className={styles.liveDemoHeader}>
        <div className={styles.liveDemoBadge}>
          <span className={styles.liveDot} />LIVE SESSION
        </div>
        <Waveform active={step >= 0 && step < SESSION_STEPS.length} bars={8} size="sm" />
      </div>
      <div className={styles.liveDemoMessages}>
        {SESSION_STEPS.map((s, i) => (
          <div key={i}
            className={`${styles.liveDemoMsg} ${i <= step ? styles.liveDemoMsgVisible : ''}`}
            style={{ transitionDelay: `${i * 0.04}s` }}>
            {s.speaker === 'user' && (
              <div className={styles.msgUser}>
                <div className={styles.msgAvatar} style={{ background: 'rgba(255,255,255,0.1)' }}>S</div>
                <div className={styles.msgBubble} style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <span className={styles.msgLabel}>Sarah</span>
                  <p>{s.text}</p>
                </div>
              </div>
            )}
            {s.speaker === 'rina' && (
              <div className={styles.msgRina}>
                <div className={styles.msgBubble} style={{ background: 'rgba(201,168,76,0.08)', borderColor: 'rgba(201,168,76,0.25)' }}>
                  <span className={styles.msgLabel} style={{ color: '#C9A84C' }}>Rina</span>
                  <p>{s.text}</p>
                </div>
                <div className={styles.msgAvatarRina}>
                  <img src="/Reha.jpeg" alt="Rina" />
                </div>
              </div>
            )}
            {s.speaker === 'system' && (
              <div className={styles.msgSystem}>
                <Waveform active bars={10} color="#C9A84C" size="sm" />
                <span>{s.text}</span>
              </div>
            )}
            {s.speaker === 'metrics' && (
              <div className={styles.msgMetrics}>
                {s.data.map((m, j) => (
                  <div key={j} className={styles.metricItem}>
                    <span className={styles.metricLabel}>{m.label}</span>
                    <div className={styles.metricBar}>
                      <div className={styles.metricFill}
                        style={{ width: i <= step ? `${m.val}%` : '0%', background: m.color,
                          transition: `width 0.9s ease ${j * 0.15}s` }} />
                    </div>
                    <span className={styles.metricVal} style={{ color: m.color }}>{m.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {step >= SESSION_STEPS.length && (
        <button className={styles.replayBtn} onClick={replay}>↺ Watch again</button>
      )}
    </div>
  );
}

// ── Story Section ───────────────────────────────────────────
function StorySection({ onSignup }) {
  const [active, setActive] = useState(0);
  const [counting, setCounting] = useState(false);
  const story = STORIES[active];

  useEffect(() => {
    const t = setInterval(() => { setActive(p => (p + 1) % STORIES.length); setCounting(false); }, 4500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { const t = setTimeout(() => setCounting(true), 500); return () => clearTimeout(t); }, [active]);

  return (
    <section className={styles.storySection}>
      <FadeSection className={styles.sectionWrap}>
        <p className={styles.eyebrow}>Real Results</p>
        <h2 className={styles.sectionHeading}>The transformation is real.</h2>
        <div className={styles.storyTabs}>
          {STORIES.map((s, i) => (
            <button key={s.id}
              className={`${styles.storyTab} ${i === active ? styles.storyTabActive : ''}`}
              onClick={() => { setActive(i); setCounting(false); }}>{s.tag}</button>
          ))}
        </div>
        <div className={styles.storyGrid}>
          <div className={`${styles.storyCard} ${styles.storyCardProblem}`} key={`prob-${active}`}>
            <div className={styles.storyCardTag} style={{ color: '#F87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>THE PROBLEM</div>
            <div className={styles.storyEmoji}>{story.problemIcon}</div>
            <p className={styles.storyTag}>{story.tag}</p>
            <p className={styles.storyText}>{story.problem}</p>
            <div className={styles.storyScoreRow}>
              <div className={styles.storyScoreCircle} style={{ borderColor: 'rgba(248,113,113,0.4)' }}>
                <span style={{ color: '#F87171', fontSize: '22px', fontWeight: '700' }}>{story.before}</span>
                <span style={{ color: 'rgba(248,113,113,0.6)', fontSize: '10px' }}>/100</span>
              </div>
              <span style={{ color: 'rgba(248,113,113,0.7)', fontSize: '12px' }}>{story.metric}</span>
            </div>
          </div>

          <div className={styles.storyCenterCol}>
            <div className={styles.storyFlowArrow}>
              <div className={styles.storyFlowLine} />
              <span>→</span>
            </div>
            <div className={styles.storyCenter}>
              <div className={styles.storyCenterGlow} />
              <div className={styles.storyCenterAvatar}>
                <div className={styles.storyCenterAvatarRing} />
                <div className={styles.storyCenterAvatarRing2} />
                <img src="/Reha.jpeg" alt="Rina"
                  style={{ width: '76px', height: '76px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '2px solid rgba(201,168,76,0.5)', position: 'relative', zIndex: 1 }} />
              </div>
              <p className={styles.storyCenterLabel}>Voice Control AI</p>
              <Waveform active bars={8} size="sm" />
              <p className={styles.storyCenterSub}>Analyzing · Coaching · Adapting</p>
              <button className={styles.storyCenterCta} onClick={onSignup}>Talk to Rina →</button>
            </div>
            <div className={styles.storyFlowArrow}>
              <span>→</span>
              <div className={styles.storyFlowLine} />
            </div>
          </div>

          <div className={`${styles.storyCard} ${styles.storyCardResult}`} key={`res-${active}`}>
            <div className={styles.storyCardTag} style={{ color: '#4ADE80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' }}>THE RESULT</div>
            <div className={styles.storyEmoji}>{story.resultIcon}</div>
            <p className={styles.storyTag}>{story.tag}</p>
            <p className={styles.storyText}>{story.result}</p>
            <div className={styles.storyScoreRow}>
              <div className={styles.storyScoreCircle} style={{ borderColor: 'rgba(74,222,128,0.4)' }}>
                <span style={{ color: '#4ADE80', fontSize: '22px', fontWeight: '700' }}>
                  <Counter from={story.before} to={story.after} active={counting} />
                </span>
                <span style={{ color: 'rgba(74,222,128,0.6)', fontSize: '10px' }}>/100</span>
              </div>
              <span style={{ color: 'rgba(74,222,128,0.7)', fontSize: '12px' }}>{story.metric}</span>
            </div>
          </div>
        </div>
        <div className={styles.storyProgress}>
          {STORIES.map((_, i) => (
            <div key={i} className={`${styles.storyDot} ${i === active ? styles.storyDotActive : ''}`}
              onClick={() => { setActive(i); setCounting(false); }} />
          ))}
        </div>
        <button className={styles.heroCta} onClick={onSignup} style={{ marginTop: '40px' }}>
          <span className={styles.heroCtaGlow} />Start My Transformation
        </button>
      </FadeSection>
    </section>
  );
}

// ── Progress Timeline ───────────────────────────────────────
function ProgressTimeline() {
  const [active, setActive] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const days = [
    { day: 'Day 1', authority: 42, pace: 55, pauses: 30, note: 'Baseline set. Rina hears your voice for the first time.' },
    { day: 'Day 7', authority: 61, pace: 70, pauses: 58, note: 'Pace is improving. Deliberate pauses begin to appear.' },
    { day: 'Day 21', authority: 84, pace: 88, pauses: 82, note: 'Authority up 42 points. Rina moves to your next challenge.' },
  ];

  return (
    <div className={styles.progressTimeline} ref={ref}>
      {days.map((d, i) => (
        <div key={i} className={`${styles.progressDay} ${active ? styles.progressDayActive : ''}`}
          style={{ '--pd-delay': `${i * 0.25}s` }}>
          <div className={styles.progressDayLabelWrap}>
            <div className={styles.progressDayDot} />
            <span className={styles.progressDayLabel}>{d.day}</span>
          </div>
          <div className={styles.progressBars}>
            {[{ label: 'Authority', val: d.authority, color: '#C9A84C' },
              { label: 'Pace', val: d.pace, color: '#2DD4BF' },
              { label: 'Pauses', val: d.pauses, color: '#A78BFA' }].map((bar, j) => (
              <div key={j} className={styles.progressBarRow}>
                <span className={styles.progressBarLabel}>{bar.label}</span>
                <div className={styles.progressBarTrack}>
                  <div className={styles.progressBarFill}
                    style={{ width: active ? `${bar.val}%` : '0%', background: bar.color,
                      transition: `width 1.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.3 + j * 0.1}s` }} />
                </div>
                <span className={styles.progressBarVal} style={{ color: bar.color }}>
                  <Counter from={0} to={bar.val} active={active} />
                </span>
              </div>
            ))}
          </div>
          <p className={styles.progressDayNote}>{d.note}</p>
          {i < days.length - 1 && <div className={styles.progressConnector} />}
        </div>
      ))}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────
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
  const [heroStep, setHeroStep] = useState(0);
  const [heroRunning, setHeroRunning] = useState(true);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const demoRef = useRef(null);

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
    job: 'Better. Your pace was more controlled. The key points landed clearly.',
    leadership: 'Stronger ending. Your last sentence held its energy — that\'s the difference.',
    ielts: 'Much more consistent. Your transitions are smoother now.',
    presentations: 'Good. Fewer fillers in the second half. Keep that discipline.',
    clear: 'Your pauses now sound deliberate. That changes how people hear you.',
    confidence: 'Your pitch stayed level. That confidence reads immediately.',
  };

  const heroConvo = [
    { who: 'user', text: 'I have a job interview tomorrow morning.' },
    { who: 'rina', text: 'Give me your opening answer.' },
    { who: 'user', text: 'Hi, I\'m Sarah, I have five years in marketing and—' },
    { who: 'analyzing', text: 'Pace · Pauses · Emphasis' },
    { who: 'rina', text: 'Pause after "five years". Let it land.' },
    { who: 'result', text: '↑ Pace   ↑ Pauses   ↑ Confidence' },
  ];

  const heroDelays = [0, 700, 1500, 2400, 3200, 4200];

  // Hero loop
  useEffect(() => {
    if (!heroRunning) return;
    const timers = heroDelays.map((d, i) => setTimeout(() => setHeroStep(i + 1), d));
    const resetTimer = setTimeout(() => {
      setHeroStep(0);
      setTimeout(() => setHeroStep(1), 300);
    }, 6000);
    const loop = setInterval(() => {
      setHeroStep(0);
      heroDelays.forEach((d, i) => setTimeout(() => setHeroStep(i + 1), d + 400));
    }, 7000);
    return () => { timers.forEach(clearTimeout); clearTimeout(resetTimer); clearInterval(loop); };
  }, [heroRunning]);

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
      setTimeout(() => { mr.stop(); setRecording(false); setRecorded(true); }, 5000);
    } catch { setRecorded(true); }
  }

  function analyzeRecording() {
    setAnalyzing(true);
    setTimeout(() => { setAnalyzing(false); setInsight(insights[goal] || insights.confidence); }, 2200);
  }

  function startRetry() {
    setRetrying(true); setRecording(true);
    setTimeout(() => { setRecording(false); setRetryRecorded(true); }, 5000);
  }

  function analyzeRetry() {
    setAnalyzing(true);
    setTimeout(() => { setAnalyzing(false); setRetryFeedback(retryFeedbacks[goal] || retryFeedbacks.confidence); }, 1800);
  }

  return (
    <div className={styles.page}>

      {/* NAV */}
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
            <a href="#demo">Free Demo</a>
            <a href="#how">How It Works</a>
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
            <a href="#demo" onClick={() => setMobileMenuOpen(false)}>Free Demo</a>
            <a href="#how" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="/pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <button onClick={() => router.push('/login')}>Sign in</button>
            <button className={styles.btnPrimary} onClick={() => router.push('/signup')}>Start Free</button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.videoBg}>
          {/* VIDEO PLACEHOLDER — replace src with AI generated video when ready */}
          <video autoPlay muted loop playsInline className={styles.heroVideo}>
            <source src="/hero-placeholder.mp4" type="video/mp4" />
          </video>
          {/* Fallback bg image while no video */}
          <div className={styles.heroBgFallback} />
          <div className={styles.videoOverlay} />
        </div>

        <div className={styles.heroInner}>
          {/* Left — live convo animation */}
          <div className={styles.heroLeft}>
            <div className={styles.heroConvoCard}>
              <div className={styles.heroConvoBadge}>
                <span className={styles.liveDot} />LIVE SESSION — RIGHT NOW
              </div>
              <div className={styles.heroConvo}>
                {heroConvo.map((msg, i) => (
                  <div key={i}
                    className={`${styles.heroMsg} ${i < heroStep ? styles.heroMsgVisible : ''}`}>
                    {msg.who === 'user' && (
                      <div className={styles.heroMsgRow} style={{ justifyContent: 'flex-start' }}>
                        <div className={styles.heroMsgAvatar}>S</div>
                        <div className={styles.heroMsgBubble} style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}>
                          <span className={styles.heroMsgWho}>Sarah</span>
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    )}
                    {msg.who === 'rina' && (
                      <div className={styles.heroMsgRow} style={{ justifyContent: 'flex-end' }}>
                        <div className={styles.heroMsgBubble} style={{ background: 'rgba(201,168,76,0.1)', borderColor: 'rgba(201,168,76,0.28)' }}>
                          <span className={styles.heroMsgWho} style={{ color: '#C9A84C' }}>Rina</span>
                          <p>{msg.text}</p>
                        </div>
                        <div className={styles.heroMsgAvatarRina}>
                          <img src="/Reha.jpeg" alt="Rina" />
                        </div>
                      </div>
                    )}
                    {msg.who === 'analyzing' && (
                      <div className={styles.heroMsgAnalyzing}>
                        <Waveform active bars={12} color="#C9A84C" size="sm" />
                        <span>{msg.text}</span>
                      </div>
                    )}
                    {msg.who === 'result' && (
                      <div className={styles.heroMsgResult}>{msg.text}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — headline */}
          <div className={styles.heroRight}>
            <span className={styles.pill}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
              </svg>
              AI Voice Coaching
            </span>
            <h1 className={styles.heroHeading}>
              Your voice.<br />
              <span className={styles.heroAccent}>An AI coach</span><br />
              that actually listens.
            </h1>
            <p className={styles.heroSub}>
              Personalized coaching built around your voice and your goals.<br />
              Just 3 minutes a day.
            </p>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}><span className={styles.heroStatNum}>16</span><span className={styles.heroStatLabel}>Focus Areas</span></div>
              <div className={styles.heroStatDiv} />
              <div className={styles.heroStat}><span className={styles.heroStatNum}>3 min</span><span className={styles.heroStatLabel}>Per Day</span></div>
              <div className={styles.heroStatDiv} />
              <div className={styles.heroStat}><span className={styles.heroStatNum}>∞</span><span className={styles.heroStatLabel}>Personalized</span></div>
            </div>
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
          </div>
        </div>

        <div className={styles.heroConnector}>
          <div className={styles.heroConnectorWave}>
            <Waveform active bars={24} color="rgba(201,168,76,0.5)" />
          </div>
          <div className={styles.scrollArrow}>↓</div>
        </div>
      </section>

      {/* ── LIVE SESSION SHOWCASE ── */}
      <section className={styles.showcaseSection}>
        {/* BG image */}
        <div className={styles.sectionBg} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1400&q=80')" }} />
        <FadeSection className={styles.sectionWrap}>
          <p className={styles.eyebrow}>Watch It Happen</p>
          <h2 className={styles.sectionHeading}>A real coaching session. Unscripted.</h2>
          <p className={styles.sectionSub}>Rina listens, analyzes your voice in real time, and gives one specific correction. Watch the metrics change.</p>
          <LiveSessionDemo />
        </FadeSection>
        <div className={styles.sectionConnector}><div className={styles.connectorPulse} /></div>
      </section>

      {/* ── BEFORE → AFTER ── */}
      <section className={styles.beforeAfterSection}>
        <div className={styles.sectionBg} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&q=80')" }} />
        <FadeSection className={styles.sectionWrap}>
          <p className={styles.eyebrow}>The Transformation</p>
          <h2 className={styles.sectionHeading}>Before Rina → After Rina</h2>
          <div className={styles.beforeAfterGrid}>
            <div className={styles.beforeCard}>
              <p className={styles.beforeAfterLabel} style={{ color: '#F87171' }}>BEFORE</p>
              <div className={styles.videoPlaceholder}>
                <div className={styles.videoPlaceholderInner}>
                  <span className={styles.videoPlaceholderIcon}>▶</span>
                  <p className={styles.videoPlaceholderText}>[VIDEO: Rushed delivery, nervous pace]</p>
                  <p className={styles.videoPlaceholderNote}>Client video goes here</p>
                </div>
              </div>
              <div className={styles.beforeAfterWave}>
                {[18,32,8,40,12,36,6,42,14,28,10,38,8,34,16,30].map((h, i) => (
                  <div key={i} className={styles.waveBarStatic} style={{ height: `${h}px`, background: 'rgba(248,113,113,0.55)' }} />
                ))}
              </div>
              <div className={styles.beforeAfterScore} style={{ color: '#F87171' }}>Authority: 45/100</div>
            </div>

            <div className={styles.coachingCenter}>
              <div className={styles.coachingLine} />
              <div className={styles.coachingCenterInner}>
                <img src="/Reha.jpeg" alt="Rina" className={styles.coachingAvatar} />
                <div className={styles.coachingQuote}>&ldquo;Pause after your key point. Let it land.&rdquo;</div>
                <Waveform active bars={6} size="sm" />
              </div>
              <div className={styles.coachingLine} />
            </div>

            <div className={styles.afterCard}>
              <p className={styles.beforeAfterLabel} style={{ color: '#4ADE80' }}>AFTER</p>
              <div className={styles.videoPlaceholder}>
                <div className={styles.videoPlaceholderInner}>
                  <span className={styles.videoPlaceholderIcon}>▶</span>
                  <p className={styles.videoPlaceholderText}>[VIDEO: Calm, confident delivery]</p>
                  <p className={styles.videoPlaceholderNote}>Client video goes here</p>
                </div>
              </div>
              <div className={styles.beforeAfterWave}>
                {[20,26,22,28,24,30,20,26,24,28,22,26,24,28,22,26].map((h, i) => (
                  <div key={i} className={styles.waveBarStatic} style={{ height: `${h}px`, background: 'rgba(74,222,128,0.55)' }} />
                ))}
              </div>
              <div className={styles.beforeAfterScore} style={{ color: '#4ADE80' }}>Authority: 86/100</div>
            </div>
          </div>
        </FadeSection>
        <div className={styles.sectionConnector}><div className={styles.connectorPulse} /></div>
      </section>

      {/* ── FREE DEMO ── */}
      <section className={styles.demoSection} id="demo" ref={demoRef}>
        <div className={styles.sectionBg} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1589561253898-768105ca91a8?w=1400&q=80')", opacity: 0.06 }} />
        {!demoOpen ? (
          <FadeSection className={styles.demoTeaser}>
            <p className={styles.eyebrow}>Free Interactive Demo</p>
            <h2 className={styles.sectionHeading}>Hear what your voice sounds like to others.</h2>
            <p className={styles.sectionSub}>30 seconds. No account. Real AI coaching insight.</p>
            <button className={styles.heroCta} onClick={openDemo}>
              <span className={styles.heroCtaGlow} />TRY YOUR COACH FREE
            </button>
          </FadeSection>
        ) : (
          <div className={styles.demoBox}>
            {!goal && (
              <FadeSection>
                <p className={styles.demoQuestion}>What do you want your voice to help you achieve?</p>
                <div className={styles.goalGrid}>
                  {goals.map(g => (
                    <button key={g.id} className={styles.goalBtn} onClick={() => setGoal(g.id)}>
                      <span className={styles.goalBtnIcon}>{g.icon}</span>{g.label}
                    </button>
                  ))}
                </div>
              </FadeSection>
            )}
            {goal && !recorded && !insight && (
              <FadeSection>
                <p className={styles.demoQuestion}>Speak for 30 seconds — introduce yourself or talk about your goal.</p>
                <div className={styles.recordArea}>
                  <Waveform active={recording} bars={18} />
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
                    <div className={styles.recordingIndicator}><span className={styles.recDot} />Listening to your voice...</div>
                  )}
                </div>
              </FadeSection>
            )}
            {recorded && !insight && !analyzing && (
              <FadeSection>
                <p className={styles.demoQuestion}>Recording complete. Ready for your insight?</p>
                <button className={styles.heroCta} onClick={analyzeRecording}><span className={styles.heroCtaGlow} />Analyze My Voice</button>
              </FadeSection>
            )}
            {analyzing && (
              <div className={styles.analyzingBox}>
                <Waveform active bars={22} />
                <p className={styles.analyzingText}>Rina is listening...</p>
              </div>
            )}
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
                      Now try again — slow down before your most important point.
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
                {retrying && recording && <div className={styles.recordingIndicator}><Waveform active bars={16} /><span className={styles.recDot} />Listening...</div>}
                {retryRecorded && !retryFeedback && !analyzing && (
                  <button className={styles.heroCta} onClick={analyzeRetry} style={{ marginTop: '20px' }}>
                    <span className={styles.heroCtaGlow} />COACH ME
                  </button>
                )}
              </FadeSection>
            )}
            {retryFeedback && !converted && (
              <FadeSection>
                <div className={styles.retryBox}><p className={styles.retryFeedback}>{retryFeedback}</p></div>
                <button className={styles.heroCta} onClick={() => setConverted(true)} style={{ marginTop: '24px' }}>
                  <span className={styles.heroCtaGlow} />See What 30 Days Can Do
                </button>
              </FadeSection>
            )}
            {converted && (
              <FadeSection>
                <div className={styles.conversionBox}>
                  <p className={styles.conversionHeading}>YOU JUST MET YOUR VOICE COACH.</p>
                  <p className={styles.conversionSub}>Imagine what it could learn about your voice in 30 days.<br />3 minutes a day. Personalized to you.</p>
                  <button className={styles.heroCta} onClick={() => router.push('/signup')} style={{ marginTop: '28px' }}>
                    <span className={styles.heroCtaGlow} />START MY PERSONAL PROGRAM
                  </button>
                </div>
              </FadeSection>
            )}
          </div>
        )}
        <div className={styles.sectionConnector}><div className={styles.connectorPulse} /></div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={styles.howSection} id="how">
        <div className={styles.sectionBg} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400&q=80')" }} />
        <FadeSection className={styles.sectionWrap}>
          <p className={styles.eyebrow}>The Process</p>
          <h2 className={styles.sectionHeading}>I have a problem → Rina hears it → trains me → I improve</h2>
          <div className={styles.stepsGrid}>
            {[
              { icon: '🎙️', label: 'SPEAK', title: 'Record 30 seconds', desc: 'Speak naturally. No script needed. Rina hears everything.', delay: 0 },
              { icon: '🧠', label: 'LISTEN', title: 'Rina Listens', desc: 'Real-time analysis of pace, pitch, pauses, emphasis, confidence.', delay: 1 },
              { icon: '🎓', label: 'COACH', title: 'One Specific Correction', desc: 'One insight. One sentence. One exercise. Every session.', delay: 2 },
              { icon: '📈', label: 'ADAPT', title: 'Rina Remembers', desc: 'Authority Score improves. Rina adapts your training every session.', delay: 3 },
            ].map((step, i) => (
              <FadeSection key={i} delay={step.delay * 0.12}>
                <div className={styles.stepCard}>
                  <div className={styles.stepLabel}>{step.label}</div>
                  <div className={styles.stepIconWrap}>{step.icon}</div>
                  <h4 className={styles.stepTitle}>{step.title}</h4>
                  <p className={styles.stepDesc}>{step.desc}</p>
                  {i < 3 && <div className={styles.stepArrow}>→</div>}
                </div>
              </FadeSection>
            ))}
          </div>
        </FadeSection>
        <div className={styles.sectionConnector}><div className={styles.connectorPulse} /></div>
      </section>

      {/* ── STORY SECTION ── */}
      <StorySection onSignup={() => router.push('/signup')} />

      {/* ── PROGRESS TIMELINE ── */}
      <section className={styles.timelineSection}>
        <div className={styles.sectionBg} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80')" }} />
        <FadeSection className={styles.sectionWrap}>
          <p className={styles.eyebrow}>Rina Remembers</p>
          <h2 className={styles.sectionHeading}>Day 1 → Day 7 → Day 21. Watch real progress.</h2>
          <p className={styles.sectionSub}>Rina tracks every session. Your coaching adapts as you grow.</p>
          <ProgressTimeline />
        </FadeSection>
        <div className={styles.sectionConnector}><div className={styles.connectorPulse} /></div>
      </section>

      {/* ── GOALS ── */}
      <section className={styles.goalsSection}>
        <FadeSection className={styles.sectionWrap}>
          <p className={styles.eyebrow}>Different People. Different Goals.</p>
          <h2 className={styles.sectionHeading}>Rina coaches everyone differently.</h2>
          <div className={styles.goalsGrid}>
            {[
              { goal: 'Job Interview', desc: 'Confident delivery under pressure.', color: '#C9A84C', ph: '[VIDEO: Candidate answering confidently]', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80' },
              { goal: 'Leadership', desc: 'Executive presence and authority.', color: '#A78BFA', ph: '[VIDEO: Manager speaking with authority]', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80' },
              { goal: 'IELTS', desc: 'Fluency, pace, natural delivery.', color: '#2DD4BF', ph: '[VIDEO: Student completing IELTS test]', img: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&q=80' },
              { goal: 'Presentations', desc: 'Calm, engaging delivery on stage.', color: '#4ADE80', ph: '[VIDEO: Presenter delivering to a room]', img: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&q=80' },
            ].map((g, i) => (
              <FadeSection key={i} delay={i * 0.1}>
                <div className={styles.goalCard}>
                  <div className={styles.goalCardImg}>
                    <img src={g.img} alt={g.goal} className={styles.goalCardImgEl} />
                    <div className={styles.goalCardImgOverlay} />
                    <div className={styles.videoPlaceholderBadge}>
                      <span>▶</span> {g.ph}
                    </div>
                  </div>
                  <p className={styles.goalCardTitle} style={{ color: g.color }}>{g.goal}</p>
                  <p className={styles.goalCardDesc}>{g.desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </FadeSection>
        <div className={styles.sectionConnector}><div className={styles.connectorPulse} /></div>
      </section>

      {/* ── PRODUCT ── */}
      <section className={styles.productSection}>
        <FadeSection className={styles.sectionWrap}>
          <p className={styles.eyebrow}>What You Get</p>
          <h2 className={styles.sectionHeading}>Everything your voice needs to improve</h2>
          <div className={styles.productGrid}>
            {[
              { icon: '📊', title: 'Authority Score', desc: 'A single number tracking your voice confidence across every session.' },
              { icon: '🎓', title: 'Live AI Coach — Rina', desc: 'Talk to Rina face-to-face. She knows your history and adapts in real time.' },
              { icon: '🎧', title: 'Voice Shadowing', desc: 'Listen to model sentences. Record yourself. Hear the difference.' },
              { icon: '📧', title: 'Daily Coaching Email', desc: 'One email a day, written by Rina from your latest session data.' },
              { icon: '📈', title: '7 & 30 Day Challenges', desc: 'Structured programs that build your voice systematically.' },
              { icon: '🎯', title: 'Personalized Curriculum', desc: 'Exercises chosen by Rina based on your weakest area, updated every session.' },
            ].map((f, i) => (
              <FadeSection key={i} delay={i * 0.08}>
                <div className={styles.productCard}>
                  <span className={styles.productIcon}>{f.icon}</span>
                  <h4 className={styles.productTitle}>{f.title}</h4>
                  <p className={styles.productDesc}>{f.desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </FadeSection>
      </section>

      {/* ── FINAL CTA ── */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaGlow} />
        <FadeSection className={styles.finalCtaInner}>
          <p className={styles.eyebrow} style={{ color: 'rgba(255,255,255,0.5)' }}>Start Today</p>
          <h2 className={styles.finalCtaHeading}>3 minutes a day.<br />A voice that opens doors.</h2>
          <Waveform active bars={16} />
          <button className={styles.heroCta} onClick={() => router.push('/signup')} style={{ fontSize: '16px', padding: '16px 40px' }}>
            <span className={styles.heroCtaGlow} />START MY 3 MINUTES
          </button>
        </FadeSection>
      </section>

      {/* FOOTER */}
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