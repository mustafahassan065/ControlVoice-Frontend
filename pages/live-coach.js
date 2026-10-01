import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/LiveCoach.module.css';

export default function LiveCoach() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [error, setError] = useState('');
  const [anamLoaded, setAnamLoaded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const clientRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    setLoading(false);

    // Load Anam SDK
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@anam-ai/js-sdk/dist/index.umd.js';
    script.async = true;
    script.onload = () => setAnamLoaded(true);
    script.onerror = () => setError('Failed to load avatar SDK. Please refresh.');
    document.head.appendChild(script);

    return () => {
      if (clientRef.current) {
        try { clientRef.current.stopStreaming(); } catch {}
      }
    };
  }, []);

  async function startSession() {
    if (!anamLoaded) {
      setError('Avatar SDK still loading. Please wait a moment.');
      return;
    }

    setSessionLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      // Get session token from backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/live-coach/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start session');

      const { session_token, persona_id } = data;

      // Initialize Anam client
      const AnamClient = window.AnamClient || window.Anam?.AnamClient;
      if (!AnamClient) throw new Error('Anam SDK not loaded properly. Please refresh.');

      const client = AnamClient.createClientWithSessionToken(session_token);
      clientRef.current = client;

      // Event listeners
      client.addListener('CONNECTION_ESTABLISHED', () => {
        setSessionActive(true);
        setSessionLoading(false);
      });

      client.addListener('AVATAR_STARTED_TALKING', () => setSpeaking(true));
      client.addListener('AVATAR_STOPPED_TALKING', () => setSpeaking(false));
      client.addListener('USER_START_TALKING', () => setListening(true));
      client.addListener('USER_STOP_TALKING', () => setListening(false));

      client.addListener('CONNECTION_CLOSED', () => {
        setSessionActive(false);
        setSpeaking(false);
        setListening(false);
      });

      client.addListener('ERROR', (err) => {
        console.error('Anam error:', err);
        setError('Session error. Please try again.');
        setSessionActive(false);
        setSessionLoading(false);
      });

      // Start streaming to video element
      await client.streamToVideoElement('rina-video');

    } catch (err) {
      console.error('Session error:', err);
      setError(err.message);
      setSessionLoading(false);
    }
  }

  async function endSession() {
    try {
      if (clientRef.current) {
        clientRef.current.stopStreaming();
        clientRef.current = null;
      }
    } catch {}

    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/live-coach/end-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}

    setSessionActive(false);
    setSpeaking(false);
    setListening(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
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
          <div className={styles.navRight}>
            <button className={styles.btnGhost} onClick={() => router.push('/dashboard')}>Dashboard</button>
            {sessionActive && (
              <button className={styles.btnEnd} onClick={endSession}>End Session</button>
            )}
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        {!sessionActive ? (
          <div className={styles.startScreen}>
            <div className={styles.startCard}>
              <div className={styles.avatarPreview}>
                <div className={styles.avatarRing}>
                  <div className={styles.avatarIcon}>🎓</div>
                </div>
                <div className={styles.avatarStatus}>
                  <span className={styles.statusDot}></span>
                  <span className={styles.statusText}>AI Voice Coach — Ready</span>
                </div>
              </div>

              <div className={styles.startInfo}>
                <p className={styles.eyebrow}>Live AI Voice Coach</p>
                <h1 className={styles.heading}>Talk to Your Coach</h1>
                <p className={styles.sub}>
                  Your AI Voice Coach knows your scores, your weakest areas, and your progress.
                  Start a live session and get personalized coaching — speak directly, get instant feedback.
                </p>

                <div className={styles.featureList}>
                  <div className={styles.featureItem}><span>🎯</span><span>Personalized to your actual voice scores</span></div>
                  <div className={styles.featureItem}><span>🎙️</span><span>Speak freely — coach listens and responds live</span></div>
                  <div className={styles.featureItem}><span>📊</span><span>Coach knows your Authority Score, weaknesses, and progress</span></div>
                  <div className={styles.featureItem}><span>💡</span><span>Get specific exercises based on your data</span></div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <button className={styles.startBtn} onClick={startSession} disabled={sessionLoading || !anamLoaded}>
                  {sessionLoading ? (
                    <><div className={styles.spinnerSmall}></div> Starting Session...</>
                  ) : !anamLoaded ? (
                    <>Loading...</>
                  ) : (
                    <>🎙️ Start Live Coaching Session</>
                  )}
                </button>
                <p className={styles.hint}>Allow microphone access when prompted</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.sessionScreen}>
            <div className={styles.sessionHeader}>
              <div className={styles.sessionLive}>
                <span className={styles.liveDot}></span>
                <span>Live Session Active</span>
              </div>
              <p className={styles.sessionSub}>
                {speaking ? '🎓 Rina is speaking...' : listening ? '👂 Rina is listening...' : 'Speak naturally'}
              </p>
            </div>

            {/* Anam Avatar Video */}
            <div className={styles.anamVideoWrap}>
              <video
                id="rina-video"
                ref={videoRef}
                autoPlay
                playsInline
                className={styles.anamVideo}
              />
              <div className={`${styles.speakingIndicator} ${speaking ? styles.speakingActive : ''}`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className={styles.speakBar} style={{ '--si': i }} />
                ))}
              </div>
            </div>

            <div className={styles.sessionTips}>
              <p>💡 Tips: Speak clearly · Ask about your scores · Request specific exercises · Say "analyze my voice"</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}