import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Auth.module.css';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Signup failed');
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Get Started</p>
          <h1 className={styles.heading}>Create your account</h1>
          <p className={styles.sub}>Start your voice coaching journey today</p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label>Full Name</label>
              <input
                type="text"
                placeholder="John Smith"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <input
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Password</label>
              <input
                type="password"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className={styles.switchText}>
            Already have an account?{' '}
            <span onClick={() => router.push('/login')}>Sign in</span>
          </p>
        </div>
      </main>
    </div>
  );
}