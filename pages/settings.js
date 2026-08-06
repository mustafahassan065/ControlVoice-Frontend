import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Settings.module.css';

export default function Settings() {
  const router = useRouter();
  const [prefs, setPrefs] = useState({
    weekly_reports: 1,
    practice_reminders: 1,
    achievement_emails: 1,
    assessment_complete: 1,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/email-preferences`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(data => setPrefs(data));
  }, []);

  async function savePrefs() {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email-preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(prefs),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  const toggle = key => setPrefs(p => ({ ...p, [key]: p[key] === 1 ? 0 : 1 }));

  const prefItems = [
    { key: 'weekly_reports',     label: 'Weekly Progress Reports', desc: 'Receive your weekly voice progress summary every Monday.' },
    { key: 'practice_reminders', label: 'Practice Reminders',      desc: 'Get reminded if you have not practiced in 3 days.' },
    { key: 'achievement_emails', label: 'Achievement Emails',      desc: 'Celebrate new personal bests and milestones.' },
    { key: 'assessment_complete', label: 'Assessment Results',     desc: 'Get your full results by email after each assessment.' },
    { key: 'product_updates',   label: 'Product Updates',   desc: 'Get notified about new features and improvements.' },
    { key: 'marketing_emails',  label: 'Marketing Emails',  desc: 'Occasional tips and offers from Voice Control AI.' },
  ];

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
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Settings</p>
          <h1 className={styles.heading}>Email Preferences</h1>
          <p className={styles.sub}>Control which emails you receive from Voice Control AI.</p>
        </div>

        <div className={styles.prefsCard}>
          {prefItems.map(item => (
            <div key={item.key} className={styles.prefRow}>
              <div className={styles.prefLeft}>
                <p className={styles.prefLabel}>{item.label}</p>
                <p className={styles.prefDesc}>{item.desc}</p>
              </div>
              <button
                className={`${styles.toggle} ${prefs[item.key] === 1 ? styles.toggleOn : ''}`}
                onClick={() => toggle(item.key)}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          ))}
        </div>

        <button className={styles.saveBtn} onClick={savePrefs} disabled={saving}>
          {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Preferences'}
        </button>
      </main>
    </div>
  );
}