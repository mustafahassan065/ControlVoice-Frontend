import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/LiveCoach.module.css';

export default function LiveCoach() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [conversationUrl, setConversationUrl] = useState(null);
  const [error, setError] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));

    setLoading(false);
  }, []);

  async function startSession() {
    setSessionLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/live-coach/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start session');
      setConversationUrl(data.conversation_url);
      setSessionActive(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSessionLoading(false);
    }
  }

  async function endSession() {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/live-coach/end-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('End session error:', err);
    }
    setConversationUrl(null);
    setSessionActive(false);
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
                  <div className={styles.featureItem}>
                    <span>🎯</span>
                    <span>Personalized to your actual voice scores</span>
                  </div>
                  <div className={styles.featureItem}>
                    <span>🎙️</span>
                    <span>Speak freely — coach listens and responds live</span>
                  </div>
                  <div className={styles.featureItem}>
                    <span>📊</span>
                    <span>Coach knows your Authority Score, weaknesses, and progress</span>
                  </div>
                  <div className={styles.featureItem}>
                    <span>💡</span>
                    <span>Get specific exercises based on your data</span>
                  </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <button
                  className={styles.startBtn}
                  onClick={startSession}
                  disabled={sessionLoading}
                >
                  {sessionLoading ? (
                    <><div className={styles.spinnerSmall}></div> Starting Session...</>
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
              <p className={styles.sessionSub}>Your AI Voice Coach is ready — speak naturally</p>
            </div>

            <div className={styles.iframeWrap}>
              <iframe
                ref={iframeRef}
                src={conversationUrl}
                allow="camera; microphone; fullscreen; display-capture"
                className={styles.coachIframe}
                title="AI Voice Coach"
              />
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