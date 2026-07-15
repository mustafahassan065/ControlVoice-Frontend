import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import styles from '../styles/Dashboard.module.css';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('authority');

  useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) { router.push('/login'); return; }

  // Har baar fresh user data lo backend se
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(freshUser => {
    localStorage.setItem('user', JSON.stringify(freshUser));
    setUser(freshUser);
  });

  const userData = localStorage.getItem('user');
  const u = JSON.parse(userData);

  Promise.all([
    fetchProgress(token, u.id),
    fetchRecordings(token),
  ]).finally(() => setLoading(false));
}, [router.query]);
  async function fetchProgress(token, userId) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/progress/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setProgress(data);
    } catch (err) { console.error(err); }
  }

  async function fetchRecordings(token) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/audio/my-recordings`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setRecordings(data);
    } catch (err) { console.error(err); }
  }

  async function markDayComplete(userProgramId) {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/programs/progress/${userProgramId}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      fetchProgress(token, user.id);
    } catch (err) { console.error(err); }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  }

  const CHART_LINES = {
    authority:   { key: 'authority_score',   color: '#C9A84C', label: 'Authority' },
    confidence:  { key: 'confidence_score',  color: '#2DD4BF', label: 'Confidence' },
    presence:    { key: 'presence_score',    color: '#A78BFA', label: 'Presence' },
    leadership:  { key: 'leadership_score',  color: '#4ADE80', label: 'Leadership' },
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color, margin: '2px 0', fontSize: '13px' }}>
              {p.name}: <strong>{p.value}</strong>
            </p>
          ))}
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

  return (
    <div className={styles.page}>
      {/* NAVBAR */}
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
            <button className={styles.navLink} onClick={() => router.push('/programs')}>Programs</button>
            <button className={styles.navLink} onClick={() => router.push('/pricing')}>Pricing</button>
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
            <h1 className={styles.heading}>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
            <p className={styles.sub}>
              {progress?.user_level || 'Beginner Speaker'} —{' '}
              {progress?.total_recordings || 0} recording{progress?.total_recordings !== 1 ? 's' : ''} submitted
            </p>
          </div>
          <button className={styles.btnPrimary} onClick={() => router.push('/record')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
            New Recording
          </button>
        </div>

        {/* STAT CARDS */}
        <div className={styles.statsGrid}>
        <div className={styles.statCard}>
  <p className={styles.statLabel}>Plan</p>
  <p className={styles.statValue} style={{
    color: user?.plan === 'executive' ? 'var(--purple)' :
           user?.plan === 'pro' ? 'var(--gold)' : 'var(--text-muted)',
    textTransform: 'capitalize',
    fontSize: '20px'
  }}>
    {user?.plan === 'executive' ? '⭐ Executive' :
     user?.plan === 'pro' ? '✨ Pro' : 'Free'}
  </p>
  {user?.plan === 'free' && (
    <p
      className={styles.statChange}
      style={{ color: 'var(--gold)', cursor: 'pointer' }}
      onClick={() => router.push('/pricing')}
    >
      Upgrade →
    </p>
  )}
</div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Authority Score</p>
            <p className={styles.statValue} style={{ color: 'var(--gold)' }}>
              {progress?.latest_authority || '—'}
            </p>
            {progress?.prev_authority && (
              <p className={styles.statChange} style={{ color: progress.latest_authority >= progress.prev_authority ? 'var(--green)' : 'var(--red)' }}>
                {progress.latest_authority >= progress.prev_authority ? '↑' : '↓'} vs last recording
              </p>
            )}
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>7-Day Improvement</p>
            <p className={styles.statValue} style={{ color: progress?.seven_day_improvement >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {progress?.seven_day_improvement >= 0 ? '+' : ''}{progress?.seven_day_improvement || 0}
            </p>
            <p className={styles.statChange}>points gained</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>30-Day Improvement</p>
            <p className={styles.statValue} style={{ color: progress?.thirty_day_improvement >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {progress?.thirty_day_improvement >= 0 ? '+' : ''}{progress?.thirty_day_improvement || 0}
            </p>
            <p className={styles.statChange}>points gained</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Practice Streak</p>
            <p className={styles.statValue} style={{ color: 'var(--teal)' }}>
              {progress?.practice_streak || 0} 🔥
            </p>
            <p className={styles.statChange}>days in a row</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Best Score</p>
            <p className={styles.statValue} style={{ color: 'var(--gold)' }}>
              {progress?.best_authority || '—'}
            </p>
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
                <span className={styles.targetCurrent} style={{ color: 'var(--gold)' }}>
                  {progress.latest_authority}
                </span>
                <span className={styles.targetArrow}>→</span>
                <span className={styles.targetGoal}>{progress.target_score}</span>
              </div>
              <p className={styles.targetLevel}>{progress.user_level}</p>
            </div>
            <div className={styles.targetRight}>
              <div className={styles.targetPercent} style={{ color: 'var(--green)' }}>
                {progress.progress_to_target}%
              </div>
              <p className={styles.targetPercentLabel}>to target</p>
              <div className={styles.targetTrack}>
                <div
                  className={styles.targetFill}
                  style={{ width: `${progress.progress_to_target}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* CHARTS */}
        {progress?.chart_data?.length > 1 && (
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <p className={styles.eyebrow}>Score History</p>
                <h2 className={styles.chartTitle}>Progress Over Time</h2>
              </div>
              <div className={styles.chartTabs}>
                {Object.entries(CHART_LINES).map(([key, val]) => (
                  <button
                    key={key}
                    className={`${styles.chartTab} ${activeChart === key ? styles.chartTabActive : ''}`}
                    style={activeChart === key ? { borderColor: val.color, color: val.color } : {}}
                    onClick={() => setActiveChart(key)}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={progress.chart_data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey={CHART_LINES[activeChart].key}
                    name={CHART_LINES[activeChart].label}
                    stroke={CHART_LINES[activeChart].color}
                    strokeWidth={2.5}
                    dot={{ fill: CHART_LINES[activeChart].color, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
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
                { label: 'Authority',   score: progress.latest_authority,  color: 'var(--gold)' },
                { label: 'Confidence',  score: progress.latest_confidence, color: 'var(--teal)' },
                { label: 'Presence',    score: progress.latest_presence,   color: 'var(--purple)' },
                { label: 'Leadership',  score: progress.latest_leadership, color: 'var(--green)' },
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

        {/* ACTIVE PROGRAM */}
        {progress?.active_program && (
          <div className={styles.programCard}>
            <div className={styles.programLeft}>
              <p className={styles.eyebrow}>Active Program</p>
              <h3 className={styles.programTitle}>{progress.active_program.title}</h3>
              <p className={styles.programDay}>
                Day <strong style={{ color: 'var(--gold)' }}>{progress.active_program.current_day}</strong> of {progress.active_program.duration_days}
              </p>
              <div className={styles.programTrack}>
                <div
                  className={styles.programFill}
                  style={{ width: `${progress.active_program.progress_percent}%` }}
                />
              </div>
            </div>
            <div className={styles.programRight}>
              <button
                className={styles.btnPrimary}
                onClick={() => markDayComplete(progress.active_program.user_program_id)}
              >
                ✓ Complete Day {progress.active_program.current_day}
              </button>
              <button className={styles.btnGhost} onClick={() => router.push('/exercises')}>
                Today's Exercise
              </button>
            </div>
          </div>
        )}

        {/* RECORDINGS LIST */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your Recordings</h2>
            {recordings.length > 0 && (
              <button className={styles.btnGhost} onClick={() => router.push('/record')}>
                + New Recording
              </button>
            )}
          </div>

          {recordings.length === 0 ? (
            <div className={styles.emptyState}>
              <span>🎙️</span>
              <p>No recordings yet</p>
              <button className={styles.btnPrimary} onClick={() => router.push('/record')}>
                Record your first assessment
              </button>
            </div>
          ) : (
            <div className={styles.recordingsList}>
              {recordings.map((rec, i) => (
                <div key={rec.id} className={styles.recordingCard}>
                  <div className={styles.recordingLeft}>
                    <p className={styles.recordingTitle}>Recording #{recordings.length - i}</p>
                    <p className={styles.recordingDate}>
                      {new Date(rec.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
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
                    <audio controls src={`${process.env.NEXT_PUBLIC_API_URL}${rec.audio_url}`} className={styles.audioPlayer} />
                    {rec.report && (
                      <button
                        className={styles.btnGhost}
                        style={{ fontSize: '12px', padding: '5px 12px' }}
                        onClick={() => router.push(`/exercises?report_id=${rec.report.id}`)}
                      >
                        View Exercises
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}