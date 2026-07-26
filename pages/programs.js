import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Programs.module.css';

const PROGRAM_META = {
  "Authority Foundation": {
    icon: "🎯",
    color: "var(--gold)",
    tags: ["Pause Control", "Strong Endings", "Pace Control"],
  },
  "Executive Presence": {
    icon: "💼",
    color: "var(--purple)",
    tags: ["Pitch Movement", "Strong Endings", "Pause Control"],
  },
  "Public Speaking": {
    icon: "🎤",
    color: "var(--teal)",
    tags: ["Pitch Movement", "Pace Control", "Strong Endings"],
  },
  "Interview Confidence": {
    icon: "✅",
    color: "var(--green)",
    tags: ["Pace Control", "Pause Control", "Strong Endings"],
  },
};

export default function Programs() {
  const router = useRouter();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [userPlan, setUserPlan] = useState('free');
  const [toast, setToast] = useState(null); // sticky upgrade toast

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const userData = localStorage.getItem('user');
    if (userData) {
      const u = JSON.parse(userData);
      setUserPlan(u.plan || 'free');
    }
    fetchPrograms(token);
  }, []);

  // Auto dismiss toast after 6s but keep it visible until dismissed
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function fetchPrograms(token) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setPrograms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function assignProgram(programId) {
    // Free plan check
    if (userPlan === 'free') {
      setToast({
        type: 'upgrade',
        message: 'Training programs are available on Pro and Executive plans.',
        action: 'Upgrade Now',
      });
      return;
    }

    setAssigning(programId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/assign/${programId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      // Handle 403 from backend too
      if (res.status === 403) {
        setToast({
          type: 'upgrade',
          message: data.detail?.message || 'Upgrade your plan to access training programs.',
          action: 'Upgrade Now',
        });
        return;
      }

      if (res.ok) fetchPrograms(token);
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(null);
    }
  }

  async function markDayComplete(userProgramId) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/progress/${userProgramId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchPrograms(token);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className={styles.page}>

      {/* STICKY UPGRADE TOAST */}
      {toast && (
        <div className={styles.toastOverlay}>
          <div className={`${styles.toast} ${toast.type === 'upgrade' ? styles.toastUpgrade : ''}`}>
            <div className={styles.toastContent}>
              <span className={styles.toastIcon}>🔒</span>
              <div>
                <p className={styles.toastTitle}>Upgrade Required</p>
                <p className={styles.toastMessage}>{toast.message}</p>
              </div>
            </div>
            <div className={styles.toastActions}>
              <button
                className={styles.toastBtn}
                onClick={() => router.push('/pricing')}
              >
                {toast.action}
              </button>
              <button
                className={styles.toastClose}
                onClick={() => setToast(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

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
            <button className={styles.btnGhost} onClick={() => router.push('/record')}>Record</button>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Training Programs</p>
          <h1 className={styles.heading}>Choose Your Program</h1>
          <p className={styles.sub}>Each program is 30 days. One daily exercise. Real improvement.</p>
        </div>

        {/* FREE PLAN BANNER */}
        {userPlan === 'free' && (
          <div className={styles.freeBanner}>
            <div className={styles.freeBannerLeft}>
              <span className={styles.freeBannerIcon}>🔒</span>
              <div>
                <p className={styles.freeBannerTitle}>Training Programs require a paid plan</p>
                <p className={styles.freeBannerSub}>Upgrade to Pro to unlock all 4 programs and start your 30-day journey.</p>
              </div>
            </div>
            <button className={styles.freeBannerBtn} onClick={() => router.push('/pricing')}>
              Upgrade to Pro
            </button>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingBox}>
            <div className={styles.spinner}></div>
            <p>Loading programs...</p>
          </div>
        ) : (
          <div className={styles.programsGrid}>
            {programs.map((program) => {
              const meta = PROGRAM_META[program.title] || { icon: '🎯', color: 'var(--gold)', tags: [] };
              const up = program.user_program;
              const isActive = up?.status === 'active';
              const isCompleted = up?.status === 'completed';
              const isPaused = up?.status === 'paused';
              const progress = up ? Math.round((up.current_day / program.duration_days) * 100) : 0;
              const isLocked = userPlan === 'free';

              return (
                <div
                  key={program.id}
                  className={`${styles.programCard} ${isActive ? styles.programCardActive : ''} ${isLocked ? styles.programCardLocked : ''}`}
                  style={isActive ? { borderColor: meta.color } : {}}
                >
                  {/* LOCK OVERLAY for free users */}
                  {isLocked && (
                    <div className={styles.lockBadge}>🔒 Pro</div>
                  )}

                  {isActive && (
                    <div className={styles.activeBadge} style={{ background: `${meta.color}22`, color: meta.color, borderColor: `${meta.color}44` }}>
                      Active Program
                    </div>
                  )}
                  {isCompleted && (
                    <div className={styles.activeBadge} style={{ background: 'rgba(74,222,128,0.1)', color: 'var(--green)', borderColor: 'rgba(74,222,128,0.3)' }}>
                      ✅ Completed
                    </div>
                  )}

                  <div className={styles.programIcon} style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}33` }}>
                    <span>{meta.icon}</span>
                  </div>

                  <h2 className={styles.programTitle}>{program.title}</h2>
                  <p className={styles.programDesc}>{program.description}</p>

                  <div className={styles.tagRow}>
                    {meta.tags.map((tag, i) => (
                      <span key={i} className={styles.tag}>{tag}</span>
                    ))}
                  </div>

                  <div className={styles.durationRow}>
                    <span className={styles.durationText}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {program.duration_days} Days
                    </span>
                    <span className={styles.durationText}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 20V10M12 20V4M6 20v-6"/>
                      </svg>
                      Daily Exercise
                    </span>
                  </div>

                  {up && (
                    <div className={styles.progressSection}>
                      <div className={styles.progressHeader}>
                        <span className={styles.progressDay}>Day {up.current_day} of {program.duration_days}</span>
                        <span className={styles.progressPercent} style={{ color: meta.color }}>{progress}%</span>
                      </div>
                      <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${progress}%`, background: meta.color }} />
                      </div>
                      {isPaused && <p className={styles.pausedText}>⏸ Paused — start a new program to resume</p>}
                    </div>
                  )}

                  <div className={styles.cardActions}>
                    {!up && (
                      <button
                        className={styles.btnPrimary}
                        style={{ background: isLocked ? 'rgba(255,255,255,0.1)' : meta.color }}
                        onClick={() => assignProgram(program.id)}
                        disabled={assigning === program.id}
                      >
                        {assigning === program.id ? 'Starting...' : isLocked ? '🔒 Upgrade to Start' : 'Start Program'}
                      </button>
                    )}
                    {isActive && (
                      <>
                        <button className={styles.btnPrimary} style={{ background: meta.color }} onClick={() => markDayComplete(up.id)}>
                          ✓ Complete Day {up.current_day}
                        </button>
                        <button className={styles.btnGhost} onClick={() => router.push('/exercises')}>Today's Exercise</button>
                      </>
                    )}
                    {isCompleted && (
                      <button className={styles.btnGhost} onClick={() => assignProgram(program.id)}>Restart Program</button>
                    )}
                    {isPaused && (
                      <button className={styles.btnGhost} onClick={() => assignProgram(program.id)} disabled={assigning === program.id}>
                        {assigning === program.id ? 'Starting...' : 'Switch to This Program'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}