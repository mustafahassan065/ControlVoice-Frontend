import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import styles from '../styles/Dashboard.module.css';

const CHART_LINES = {
  authority:  { key: 'authority_score',  color: '#C9A84C', label: 'Authority' },
  confidence: { key: 'confidence_score', color: '#2DD4BF', label: 'Confidence' },
  presence:   { key: 'presence_score',   color: '#A78BFA', label: 'Presence' },
  leadership: { key: 'leadership_score', color: '#4ADE80', label: 'Leadership' },
};

function getWeakestCategory(progress) {
  if (!progress?.latest_authority) return null;
  const scores = {
    pause_control:  progress.latest_pause   || 50,
    strong_endings: progress.latest_ending  || 50,
    pitch_movement: progress.latest_pitch   || 50,
    pace_control:   progress.latest_pace    || 50,
  };
  return Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0];
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('authority');
  const [chartDays, setChartDays] = useState(30);
  const [chartData, setChartData] = useState([]);
  const [showVoiceData, setShowVoiceData] = useState(false);

  // Phase 2A
  const [todayChallenge, setTodayChallenge] = useState(null);
  const [streak, setStreak] = useState(null);
  const [xpData, setXpData] = useState(null);

  // Phase 2B
  const [comparison, setComparison] = useState(null);
  const [personalBests, setPersonalBests] = useState([]);

  // Phase 3A
  const [todaySessions, setTodaySessions] = useState([]);
  const [weakestCategory, setWeakestCategory] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(freshUser => {
      localStorage.setItem('user', JSON.stringify(freshUser));
      setUser(freshUser);
      // Onboarding redirect
      if (freshUser.onboarding_completed === 0) {
        router.push('/onboarding');
        return;
      }
    });

    const u = JSON.parse(localStorage.getItem('user') || '{}');

    Promise.all([
      fetchProgress(token, u.id),
      fetchRecordings(token),
      fetchTodayChallenge(token),
      fetchStreak(token),
      fetchXP(token),
      fetchChartData(token, u.id, 30),
      fetchComparison(token, u.id),
      fetchPersonalBests(token, u.id),
      fetchTodaySessions(token),
    ]).finally(() => setLoading(false));
  }, [router.query]);

  async function fetchProgress(token, userId) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) { setProgress(data); setWeakestCategory(getWeakestCategory(data)); }
    } catch (err) { console.error(err); }
  }

  async function fetchRecordings(token) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/audio/my-recordings`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setRecordings(data);
    } catch (err) { console.error(err); }
  }

  async function fetchTodayChallenge(token) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/challenges/today`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setTodayChallenge(data);
    } catch (err) { console.error(err); }
  }

  async function fetchStreak(token) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/challenges/streak`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setStreak(data);
    } catch (err) { console.error(err); }
  }

  async function fetchXP(token) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/challenges/xp`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setXpData(data);
    } catch (err) { console.error(err); }
  }

  async function fetchChartData(token, userId, days) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/chart/${userId}?days=${days}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setChartData(data.chart_data || []);
    } catch (err) { console.error(err); }
  }

  async function fetchComparison(token, userId) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/comparison/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.has_comparison) setComparison(data);
    } catch (err) { console.error(err); }
  }

  async function fetchPersonalBests(token, userId) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/personal-bests/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setPersonalBests(data);
    } catch (err) { console.error(err); }
  }

  async function fetchTodaySessions(token) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/training/today`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setTodaySessions(data.sessions || []);
    } catch (err) { console.error(err); }
  }

  function startSession(session) {
    const prompt = session.exercise?.practice_template || session.exercise?.instruction || '';
    router.push(`/record?session_type=${session.session_type}&exercise_id=${session.exercise?.id || ''}&prompt=${encodeURIComponent(prompt)}`);
  }

  function startChallenge() {
    if (!todayChallenge) return;
    router.push(`/record?challenge_id=${todayChallenge.id}&prompt=${encodeURIComponent(todayChallenge.prompt)}`);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          {payload.map((p, i) => <p key={i} style={{ color: p.color, margin: '2px 0', fontSize: '13px' }}>{p.name}: <strong>{p.value}</strong></p>)}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

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
          <div className={styles.navLinks}>
            <button className={styles.navLink} onClick={() => router.push('/record')}>Record</button>
            <button className={styles.navLink} onClick={() => router.push('/exercises')}>Exercises</button>
            <button className={styles.navLink} onClick={() => router.push('/coach')}>AI Coach</button>
            <button className={styles.navLink} onClick={() => router.push('/programs')}>Programs</button>
            <button className={styles.navLink} onClick={() => router.push('/pricing')}>Pricing</button>
            <button className={styles.navLink} onClick={() => router.push('/settings')}>Settings</button>
          </div>
          <div className={styles.navRight}>
            {user && <span className={styles.userName}>{user.name}</span>}
            <button className={styles.btnGhost} onClick={logout}>Sign out</button>
          </div>
        </div>
      </nav>

      <main className={styles.main}>

        {/* WELCOME */}
        <div className={styles.welcomeRow}>
          <div>
            <p className={styles.eyebrow}>Dashboard</p>
            <h1 className={styles.heading}>{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
            <p className={styles.sub}>{progress?.user_level || 'Speaker'} · {progress?.total_recordings || 0} sessions completed</p>
          </div>
          <button className={styles.btnPrimary} onClick={() => router.push('/record')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
            New Recording
          </button>
        </div>

        {/* XP BAR */}
        {xpData && (
          <div className={styles.xpCard}>
            <div className={styles.xpHeader}>
              <div>
                <p className={styles.xpLevel}>Level {xpData.level} — {xpData.name}</p>
                <p className={styles.xpPoints}>{xpData.xp} XP{xpData.next_level && ` · ${xpData.next_xp - xpData.xp} XP to ${xpData.next_level}`}</p>
              </div>
              <span className={styles.xpBadge}>⭐ {xpData.xp} XP</span>
            </div>
            <div className={styles.xpTrack}>
              <div className={styles.xpFill} style={{ width: `${xpData.progress}%` }} />
            </div>
          </div>
        )}
        {/* LIVE AI COACH BUTTON */}
<div className={styles.liveCoachCard} onClick={() => router.push('/live-coach')}>
  {/* LIVE Badge */}
  <div className={styles.liveCoachBadge}>
    <span className={styles.liveCoachBadgeDot}></span>
    <span className={styles.liveCoachBadgeText}>LIVE VIDEO CALL</span>
  </div>

  {/* Dominant Image */}
  <div className={styles.liveCoachImageWrap}>
    <img 
      src="/Reha.jpeg" 
      alt="AI Voice Coach" 
      className={styles.liveCoachImage}
    />
    <div className={styles.liveCoachImageOverlay}></div>
  </div>

  {/* Button Content */}
  <div className={styles.liveCoachCardBody}>
    <div className={styles.liveCoachBtnText}>
      <span className={styles.liveCoachBtnTitle}>Talk to Your AI Voice Coach</span>
      <span className={styles.liveCoachBtnSub}>
        Live session — coach knows your scores and weaknesses
      </span>
    </div>
    <span className={styles.liveCoachBtnArrow}>→</span>
  </div>
</div>

        {/* ═══ PRIMARY: WHAT SHOULD I TRAIN TODAY? ═══ */}
        <div className={styles.trainTodaySection}>
          <div className={styles.trainTodayHeader}>
            <div>
              <p className={styles.eyebrow}>Today's Training</p>
              <h2 className={styles.trainTodayTitle}>What should I train today?</h2>
            </div>
            {streak && (
              <div className={styles.streakBadge}>
                🔥 {streak.current_streak} day streak
              </div>
            )}
          </div>

          {/* SESSION CARDS */}
          {todaySessions.length > 0 ? (
            <div className={styles.sessionsGrid}>
              {todaySessions.map((session, i) => (
                <div key={i} className={`${styles.sessionCard} ${session.completed ? styles.sessionCardDone : ''}`}>
                  <div className={styles.sessionCardTop}>
                    <div className={styles.sessionIconWrap}>{session.icon}</div>
                    <div className={styles.sessionInfo}>
                      <p className={styles.sessionTitle}>{session.title}</p>
                      <p className={styles.sessionFocus}>{session.focus}</p>
                    </div>
                    {session.completed && <span className={styles.sessionDoneBadge}>✓ Done</span>}
                  </div>

                  <p className={styles.sessionDesc}>{session.description}</p>

                  {session.exercise && (
                    <div className={styles.sessionExercisePreview}>
                      <p className={styles.sessionExerciseLabel}>Today's exercise</p>
                      <p className={styles.sessionExerciseName}>{session.exercise.title}</p>
                    </div>
                  )}

                  {/* Retry comparison */}
                  {session.score_attempt1 && session.score_attempt2 && (
                    <div className={styles.retryComparison}>
                      <div className={styles.retryAttempt}>
                        <span className={styles.retryLabel}>Attempt 1</span>
                        <span className={styles.retryScore}>{session.score_attempt1}</span>
                      </div>
                      <span className={styles.retryArrow}>→</span>
                      <div className={styles.retryAttempt}>
                        <span className={styles.retryLabel}>Attempt 2</span>
                        <span className={styles.retryScore} style={{ color: 'var(--green)' }}>{session.score_attempt2}</span>
                      </div>
                      {session.improvement > 0 && (
                        <span className={styles.retryImprovement}>+{session.improvement}</span>
                      )}
                    </div>
                  )}

                  {!session.completed && (
                    <button className={styles.startSessionBtn} onClick={() => startSession(session)}>
                      Start {session.title} →
                    </button>
                  )}

                  {session.completed && !session.score_attempt2 && (
                    <button className={styles.retryBtn} onClick={() => startSession(session)}>
                      Try Again to Improve
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noSessionsCard}>
              <p>No sessions configured yet.</p>
              <button className={styles.btnPrimary} onClick={() => router.push('/record')}>Record Now</button>
            </div>
          )}

          {/* DAILY CHALLENGE */}
          {todayChallenge && (
            <div className={styles.challengeCard}>
              <div className={styles.challengeHeader}>
                <div>
                  <p className={styles.eyebrow}>Today's Voice Challenge</p>
                  <p className={styles.challengePrompt}>"{todayChallenge.prompt}"</p>
                </div>
                {todayChallenge.completed && <span className={styles.challengeDone}>✅ Done</span>}
              </div>
              <div className={styles.challengeMeta}>
                <span className={styles.challengeMetaItem}>⏱ {todayChallenge.duration}</span>
                <span className={styles.challengeMetaItem}>+{todayChallenge.xp_reward} XP</span>
              </div>
              {!todayChallenge.completed && (
                <button className={styles.btnPrimary} onClick={startChallenge}>Start Challenge →</button>
              )}
            </div>
          )}
        </div>

        {/* STREAK CALENDAR */}
        {streak && (
          <div className={styles.streakCard}>
            <div className={styles.streakHeader}>
              <div>
                <p className={styles.eyebrow}>Practice Streak</p>
                <p className={styles.streakCount}>🔥 {streak.current_streak} Day{streak.current_streak !== 1 ? 's' : ''}</p>
              </div>
              <p className={styles.streakTotal}>{streak.total_days} total practice days</p>
            </div>
            <div className={styles.weekCalendar}>
              {streak.weekly_calendar.map((day, i) => (
                <div key={i} className={`${styles.calDay} ${day.completed ? styles.calDayDone : ''} ${day.is_today ? styles.calDayToday : ''}`}>
                  <span className={styles.calDayName}>{day.day}</span>
                  <span className={styles.calDayDate}>{day.date.slice(5).replace('-', '/')}</span>
                  <span className={styles.calDayIcon}>{day.completed ? '✓' : day.is_today ? '·' : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PERSONAL BESTS */}
        {personalBests.length > 0 && (
          <div className={styles.pbCard}>
            <p className={styles.eyebrow}>Personal Bests 🏆</p>
            <div className={styles.pbGrid}>
              {personalBests.map((pb, i) => (
                <div key={i} className={styles.pbItem}>
                  <p className={styles.pbMetric}>{pb.metric.charAt(0).toUpperCase() + pb.metric.slice(1)}</p>
                  <p className={styles.pbScore}>{pb.best_score}</p>
                  <p className={styles.pbDate}>{pb.achieved_at}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ VIEW MY VOICE DATA BUTTON ═══ */}
        <div className={styles.voiceDataBtnWrap}>
          <button
            className={styles.voiceDataBtn}
            onClick={() => setShowVoiceData(!showVoiceData)}
          >
            <span className={styles.voiceDataBtnIcon}>📊</span>
            <div className={styles.voiceDataBtnText}>
              <span className={styles.voiceDataBtnTitle}>
                {showVoiceData ? 'Hide Voice Data ↑' : 'View My Voice Data ↓'}
              </span>
              <span className={styles.voiceDataBtnSub}>Detailed analysis — charts, score breakdown, before & after comparison</span>
            </div>
          </button>
        </div>

        {/* ═══ SECONDARY: DETAILED VOICE DATA (hidden by default) ═══ */}
        {showVoiceData && (
          <div className={styles.voiceDataContent}>

            {/* STAT CARDS */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Plan</p>
                <p className={styles.statValue} style={{ color: user?.plan === 'executive' ? 'var(--purple)' : user?.plan === 'pro' ? 'var(--gold)' : 'var(--text-muted)', textTransform: 'capitalize', fontSize: '20px' }}>
                  {user?.plan === 'executive' ? '⭐ Executive' : user?.plan === 'pro' ? '✨ Pro' : 'Free'}
                </p>
                {user?.plan === 'free' && <p className={styles.statChange} style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => router.push('/pricing')}>Upgrade →</p>}
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Authority Score</p>
                <p className={styles.statValue} style={{ color: 'var(--gold)' }}>{progress?.latest_authority || '—'}</p>
                {progress?.prev_authority && (
                  <p className={styles.statChange} style={{ color: progress.latest_authority >= progress.prev_authority ? 'var(--green)' : 'var(--red)' }}>
                    {progress.latest_authority >= progress.prev_authority ? '↑' : '↓'} vs last recording
                  </p>
                )}
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>7-Day Improvement</p>
                <p className={styles.statValue} style={{ color: (progress?.seven_day_improvement || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {(progress?.seven_day_improvement || 0) >= 0 ? '+' : ''}{progress?.seven_day_improvement || 0}
                </p>
                <p className={styles.statChange}>points gained</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>30-Day Improvement</p>
                <p className={styles.statValue} style={{ color: (progress?.thirty_day_improvement || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {(progress?.thirty_day_improvement || 0) >= 0 ? '+' : ''}{progress?.thirty_day_improvement || 0}
                </p>
                <p className={styles.statChange}>points gained</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Best Score</p>
                <p className={styles.statValue} style={{ color: 'var(--gold)' }}>{progress?.best_authority || '—'}</p>
                <p className={styles.statChange}>all time</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Recordings</p>
                <p className={styles.statValue}>{progress?.total_recordings || 0}</p>
                <p className={styles.statChange}>submitted</p>
              </div>
            </div>

            {/* TARGET PROGRESS */}
            {progress?.latest_authority > 0 && (
              <div className={styles.targetCard}>
                <div className={styles.targetLeft}>
                  <p className={styles.eyebrow}>Current Target</p>
                  <div className={styles.targetScores}>
                    <span className={styles.targetCurrent} style={{ color: 'var(--gold)' }}>{progress.latest_authority}</span>
                    <span className={styles.targetArrow}>→</span>
                    <span className={styles.targetGoal}>{progress.target_score}</span>
                  </div>
                  <p className={styles.targetLevel}>{progress.user_level}</p>
                </div>
                <div className={styles.targetRight}>
                  <div className={styles.targetPercent} style={{ color: 'var(--green)' }}>{progress.progress_to_target}%</div>
                  <p className={styles.targetPercentLabel}>to target</p>
                  <div className={styles.targetTrack}>
                    <div className={styles.targetFill} style={{ width: `${progress.progress_to_target}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* BEFORE & AFTER */}
            {comparison && (
              <div className={styles.comparisonCard}>
                <p className={styles.eyebrow}>Before & After</p>
                <h2 className={styles.comparisonTitle}>Your Voice Journey</h2>
                <div className={styles.comparisonGrid}>
                  <div className={styles.comparisonCol}>
                    <div className={styles.comparisonHeading}>
                      <span className={styles.comparisonHeadingBefore}>BEFORE</span>
                      <p className={styles.comparisonColDate}>{comparison.first.date}</p>
                    </div>
                    <p className={styles.comparisonLevel}>{comparison.first.user_level}</p>
                    {[
                      { label: 'Authority',  score: comparison.first.authority_score,  color: 'var(--gold)' },
                      { label: 'Confidence', score: comparison.first.confidence_score, color: 'var(--teal)' },
                      { label: 'Presence',   score: comparison.first.presence_score,   color: 'var(--purple)' },
                      { label: 'Leadership', score: comparison.first.leadership_score, color: 'var(--green)' },
                    ].map((item, i) => (
                      <div key={i} className={styles.comparisonRow}>
                        <span className={styles.comparisonRowLabel}>{item.label}</span>
                        <div className={styles.comparisonBarTrack}>
                          <div className={styles.comparisonBarFill} style={{ width: `${item.score}%`, background: item.color, opacity: 0.45 }} />
                        </div>
                        <span className={styles.comparisonRowScore} style={{ color: item.color }}>{item.score}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.comparisonDivider}><div className={styles.comparisonArrow}>→</div></div>
                  <div className={styles.comparisonCol}>
                    <div className={styles.comparisonHeading}>
                      <span className={styles.comparisonHeadingAfter}>AFTER</span>
                      <p className={styles.comparisonColDate}>{comparison.latest.date}</p>
                    </div>
                    <p className={styles.comparisonLevel}>{comparison.latest.user_level}</p>
                    {[
                      { label: 'Authority',  score: comparison.latest.authority_score,  imp: comparison.improvements.authority,  color: 'var(--gold)' },
                      { label: 'Confidence', score: comparison.latest.confidence_score, imp: comparison.improvements.confidence, color: 'var(--teal)' },
                      { label: 'Presence',   score: comparison.latest.presence_score,   imp: comparison.improvements.presence,   color: 'var(--purple)' },
                      { label: 'Leadership', score: comparison.latest.leadership_score, imp: comparison.improvements.leadership, color: 'var(--green)' },
                    ].map((item, i) => (
                      <div key={i} className={styles.comparisonRow}>
                        <span className={styles.comparisonRowLabel}>{item.label}</span>
                        <div className={styles.comparisonBarTrack}>
                          <div className={styles.comparisonBarFill} style={{ width: `${item.score}%`, background: item.color }} />
                        </div>
                        <span className={styles.comparisonRowScore} style={{ color: item.color }}>
                          {item.score}
                          {item.imp !== 0 && <span style={{ fontSize: '10px', marginLeft: '5px', color: item.imp > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{item.imp > 0 ? `+${item.imp}` : item.imp}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.comparisonSummary}>
                  {Object.entries(comparison.improvements).map(([key, val]) => val !== 0 && (
                    <div key={key} className={styles.comparisonSummaryItem}>
                      <span className={styles.comparisonSummaryLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                      <span className={styles.comparisonSummaryVal} style={{ color: val > 0 ? 'var(--green)' : 'var(--red)' }}>{val > 0 ? `+${val}` : val} points</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PROGRESS CHART */}
            {chartData?.length > 1 && (
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div>
                    <p className={styles.eyebrow}>Score History</p>
                    <h2 className={styles.chartTitle}>Progress Over Time</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <div className={styles.chartTabs}>
                      {[{ label: '7 Days', value: 7 }, { label: '30 Days', value: 30 }, { label: 'All Time', value: 0 }].map(opt => (
                        <button key={opt.value}
                          className={`${styles.chartTab} ${chartDays === opt.value ? styles.chartTabActive : ''}`}
                          style={chartDays === opt.value ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}
                          onClick={() => {
                            setChartDays(opt.value);
                            const token = localStorage.getItem('token');
                            const u = JSON.parse(localStorage.getItem('user'));
                            fetchChartData(token, u.id, opt.value);
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className={styles.chartTabs}>
                      {Object.entries(CHART_LINES).map(([key, val]) => (
                        <button key={key}
                          className={`${styles.chartTab} ${activeChart === key ? styles.chartTabActive : ''}`}
                          style={activeChart === key ? { borderColor: val.color, color: val.color } : {}}
                          onClick={() => setActiveChart(key)}>
                          {val.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey={CHART_LINES[activeChart].key} name={CHART_LINES[activeChart].label}
                        stroke={CHART_LINES[activeChart].color} strokeWidth={2.5}
                        dot={{ fill: CHART_LINES[activeChart].color, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* SCORE BREAKDOWN */}
            {progress?.latest_authority > 0 && (
              <div className={styles.scoresCard}>
                <p className={styles.eyebrow}>Latest Scores</p>
                <h2 className={styles.sectionTitle}>Score Breakdown</h2>
                <div className={styles.scoresGrid}>
                  {[
                    { label: 'Authority',  score: progress.latest_authority,  color: 'var(--gold)' },
                    { label: 'Confidence', score: progress.latest_confidence, color: 'var(--teal)' },
                    { label: 'Presence',   score: progress.latest_presence,   color: 'var(--purple)' },
                    { label: 'Leadership', score: progress.latest_leadership, color: 'var(--green)' },
                  ].map((item, i) => (
                    <div key={i} className={styles.scoreItem}>
                      <div className={styles.scoreItemHeader}>
                        <span className={styles.scoreItemLabel}>{item.label}</span>
                        <span className={styles.scoreItemValue} style={{ color: item.color }}>{item.score}</span>
                      </div>
                      <div className={styles.scoreTrack}>
                        <div className={styles.scoreFill} style={{ width: `${item.score}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RECORDINGS LIST */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Your Recordings</h2>
                {recordings.length > 0 && <button className={styles.btnGhost} onClick={() => router.push('/record')}>+ New Recording</button>}
              </div>
              {recordings.length === 0 ? (
                <div className={styles.emptyState}>
                  <span>🎙️</span>
                  <p>No recordings yet</p>
                  <button className={styles.btnPrimary} onClick={() => router.push('/record')}>Record your first assessment</button>
                </div>
              ) : (
                <div className={styles.recordingsList}>
                  {recordings.map((rec, i) => (
                    <div key={rec.id} className={styles.recordingCard}>
                      <div className={styles.recordingLeft}>
                        <p className={styles.recordingTitle}>Recording #{recordings.length - i}</p>
                        <p className={styles.recordingDate}>
                          {new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {rec.report && (
                          <div className={styles.recordingScores}>
                            <span style={{ color: 'var(--gold)' }}>Authority: {rec.report.authority_score}</span>
                            <span style={{ color: 'var(--teal)' }}>Confidence: {rec.report.confidence_score}</span>
                            <span style={{ color: 'var(--purple)' }}>Presence: {rec.report.presence_score}</span>
                          </div>
                        )}
                      </div>
                      <div className={styles.recordingRight}>
                        <audio controls src={rec.audio_url} className={styles.audioPlayer} />
                        {rec.report && (
                          <button className={styles.btnGhost} style={{ fontSize: '12px', padding: '5px 12px' }}
                            onClick={() => router.push(`/exercises?report_id=${rec.report.id}`)}>
                            View Exercises
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}