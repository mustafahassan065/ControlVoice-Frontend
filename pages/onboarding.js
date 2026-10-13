import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Onboarding.module.css';

export default function Onboarding() {
  const router = useRouter();
  const [goals, setGoals] = useState([]);
  const [goalsList, setGoalsList] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/goals-list`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(data => {
      setGoalsList(data.goals || []);
    });
  }, []);

  function toggleGoal(g) {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }

  async function finish() {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/save-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ goals, difficult_situations: [], sessions_per_day: 2 }),
      });
      router.push('/dashboard');
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
      </div>

      <main className={styles.main}>
        <div className={styles.stepCard}>
          <h1 className={styles.heading}>What would you like to improve?</h1>
          <p className={styles.sub}>Pick your goals — your coach will personalize your training.</p>
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
            onClick={finish}
            disabled={goals.length === 0 || saving}
          >
            {saving ? 'Setting up...' : `Go to Dashboard →`}
          </button>
        </div>
      </main>
    </div>
  );
}