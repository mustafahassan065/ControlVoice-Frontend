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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchPrograms(token);
  }, []);

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
    setAssigning(programId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/assign/${programId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
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

              return (
                <div
                  key={program.id}
                  className={`${styles.programCard} ${isActive ? styles.programCardActive : ''}`}
                  style={isActive ? { borderColor: meta.color } : {}}
                >
                  {/* ACTIVE BADGE */}
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

                  {/* FOCUS TAGS */}
                  <div className={styles.tagRow}>
                    {meta.tags.map((tag, i) => (
                      <span key={i} className={styles.tag}>{tag}</span>
                    ))}
                  </div>

                  {/* DURATION */}
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

                  {/* PROGRESS (if enrolled) */}
                  {up && (
                    <div className={styles.progressSection}>
                      <div className={styles.progressHeader}>
                        <span className={styles.progressDay}>
                          Day {up.current_day} of {program.duration_days}
                        </span>
                        <span className={styles.progressPercent} style={{ color: meta.color }}>
                          {progress}%
                        </span>
                      </div>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${progress}%`, background: meta.color }}
                        />
                      </div>
                      {isPaused && (
                        <p className={styles.pausedText}>⏸ Paused — start a new program to resume</p>
                      )}
                    </div>
                  )}

                  {/* ACTION BUTTON */}
                  <div className={styles.cardActions}>
                    {!up && (
                      <button
                        className={styles.btnPrimary}
                        style={{ background: meta.color }}
                        onClick={() => assignProgram(program.id)}
                        disabled={assigning === program.id}
                      >
                        {assigning === program.id ? 'Starting...' : 'Start Program'}
                      </button>
                    )}
                    {isActive && (
                      <>
                        <button
                          className={styles.btnPrimary}
                          style={{ background: meta.color }}
                          onClick={() => markDayComplete(up.id)}
                        >
                          ✓ Complete Day {up.current_day}
                        </button>
                        <button
                          className={styles.btnGhost}
                          onClick={() => router.push('/exercises')}
                        >
                          Today's Exercise
                        </button>
                      </>
                    )}
                    {isCompleted && (
                      <button
                        className={styles.btnGhost}
                        onClick={() => assignProgram(program.id)}
                      >
                        Restart Program
                      </button>
                    )}
                    {isPaused && (
                      <button
                        className={styles.btnGhost}
                        onClick={() => assignProgram(program.id)}
                        disabled={assigning === program.id}
                      >
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