import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Onboarding.module.css';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState([]);
  const [situations, setSituations] = useState([]);
  const [sessionsPerDay, setSessionsPerDay] = useState(2);
  const [goalsList, setGoalsList] = useState([]);
  const [situationsList, setSituationsList] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/goals-list`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(data => {
      setGoalsList(data.goals || []);
      setSituationsList(data.situations || []);
    });
  }, []);

  function toggleGoal(g) {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }

  function toggleSituation(s) {
    setSituations(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function saveAndContinue() {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/save-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ goals, difficult_situations: situations, sessions_per_day: sessionsPerDay }),
      });
      router.push('/baseline');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12h2M6 8v8M10 5v14M14 9v6M18 7v10M22 12h-2"/>
            </svg>
          </div>
          <span className={styles.logoText}>Voice<span>Control</span> AI</span>
        </div>
        <div className={styles.stepIndicator}>
          {[1, 2, 3].map(s => (
            <div key={s} className={`${styles.stepDot} ${step >= s ? styles.stepDotActive : ''}`} />
          ))}
        </div>
      </div>

      <main className={styles.main}>

        {/* STEP 1 — GOALS */}
        {step === 1 && (
          <div className={styles.stepCard}>
            <p className={styles.eyebrow}>Step 1 of 3</p>
            <h1 className={styles.heading}>What would you like to improve?</h1>
            <p className={styles.sub}>Select all that apply. Your coach will personalize your training based on these goals.</p>
            <div className={styles.optionsGrid}>
              {goalsList.map((goal, i) => (
                <button
                  key={i}
                  className={`${styles.optionBtn} ${goals.includes(goal) ? styles.optionBtnSelected : ''}`}
                  onClick={() => toggleGoal(goal)}
                >
                  {goals.includes(goal) && <span className={styles.optionCheck}>✓</span>}
                  {goal}
                </button>
              ))}
            </div>
            <button
              className={styles.continueBtn}
              onClick={() => setStep(2)}
              disabled={goals.length === 0}
            >
              Continue → {goals.length > 0 && `(${goals.length} selected)`}
            </button>
          </div>
        )}

        {/* STEP 2 — SITUATIONS */}
        {step === 2 && (
          <div className={styles.stepCard}>
            <p className={styles.eyebrow}>Step 2 of 3</p>
            <h1 className={styles.heading}>What situations are difficult for you?</h1>
            <p className={styles.sub}>Your coach will include targeted practice for these situations.</p>
            <div className={styles.optionsGrid}>
              {situationsList.map((sit, i) => (
                <button
                  key={i}
                  className={`${styles.optionBtn} ${situations.includes(sit) ? styles.optionBtnSelected : ''}`}
                  onClick={() => toggleSituation(sit)}
                >
                  {situations.includes(sit) && <span className={styles.optionCheck}>✓</span>}
                  {sit}
                </button>
              ))}
            </div>
            <div className={styles.stepActions}>
              <button className={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
              <button
                className={styles.continueBtn}
                onClick={() => setStep(3)}
                disabled={situations.length === 0}
              >
                Continue → {situations.length > 0 && `(${situations.length} selected)`}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — SESSIONS PER DAY */}
        {step === 3 && (
          <div className={styles.stepCard}>
            <p className={styles.eyebrow}>Step 3 of 3</p>
            <h1 className={styles.heading}>How many sessions per day?</h1>
            <p className={styles.sub}>Each session takes 2–5 minutes. You can change this anytime.</p>
            <div className={styles.sessionOptions}>
              {[
                { value: 1, label: 'Light', desc: '1 session · Morning only · ~3 min/day', icon: '🌅' },
                { value: 2, label: 'Regular', desc: '2 sessions · Morning + Afternoon · ~6 min/day', icon: '☀️' },
                { value: 3, label: 'Intensive', desc: '3 sessions · Morning, Afternoon, Evening · ~10 min/day', icon: '🔥', recommended: true },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`${styles.sessionBtn} ${sessionsPerDay === opt.value ? styles.sessionBtnSelected : ''}`}
                  onClick={() => setSessionsPerDay(opt.value)}
                >
                  <div className={styles.sessionBtnTop}>
                    <span className={styles.sessionIcon}>{opt.icon}</span>
                    <div>
                      <p className={styles.sessionLabel}>{opt.label}</p>
                      {opt.recommended && <span className={styles.recommendedBadge}>Recommended</span>}
                    </div>
                    {sessionsPerDay === opt.value && <span className={styles.sessionCheck}>✓</span>}
                  </div>
                  <p className={styles.sessionDesc}>{opt.desc}</p>
                </button>
              ))}
            </div>
            <div className={styles.stepActions}>
              <button className={styles.backBtn} onClick={() => setStep(2)}>← Back</button>
              <button className={styles.continueBtn} onClick={saveAndContinue} disabled={saving}>
                {saving ? 'Saving...' : 'Start Baseline Assessment →'}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}