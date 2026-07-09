import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Pricing.module.css';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    color: 'var(--text-dim)',
    features: [
      { text: '1 voice analysis', included: true },
      { text: 'Authority Score report', included: true },
      { text: 'Daily exercises', included: false },
      { text: 'Progress tracking', included: false },
      { text: 'Weekly reports', included: false },
      { text: 'Training programs', included: false },
    ],
    cta: 'Current Plan',
    featured: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/month',
    color: 'var(--gold)',
    features: [
      { text: 'Unlimited analyses', included: true },
      { text: 'Daily exercises by email', included: true },
      { text: 'Progress tracking + charts', included: true },
      { text: 'Weekly progress reports', included: true },
      { text: 'All 4 training programs', included: true },
      { text: 'AI coaching feedback', included: true },
    ],
    cta: 'Upgrade to Pro',
    featured: true,
  },
  {
    id: 'executive',
    name: 'Executive',
    price: '$99',
    period: '/month',
    color: 'var(--purple)',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Executive Presence Program', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Priority support', included: true },
      { text: '1-on-1 coaching session', included: true },
      { text: 'Custom exercise program', included: true },
    ],
    cta: 'Go Executive',
    featured: false,
  },
];

export default function Pricing() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetchSubscription(token);

    if (router.query.payment === 'canceled') {
      setMessage('Payment canceled. No charges made.');
    }
  }, [router.query]);

  async function fetchSubscription(token) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setCurrentPlan(data.plan);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUpgrade(planId) {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    if (planId === 'free' || planId === currentPlan) return;

    setLoading(planId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      window.location.href = data.checkout_url;
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(null);
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
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Pricing</p>
          <h1 className={styles.heading}>Invest in Your Voice</h1>
          <p className={styles.sub}>Start free. Upgrade when you are ready to get serious.</p>
        </div>

        {message && (
          <div className={styles.messageBox}>{message}</div>
        )}

        <div className={styles.plansGrid}>
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isUpgrade = !isCurrent && plan.id !== 'free';

            return (
              <div
                key={plan.id}
                className={`${styles.planCard} ${plan.featured ? styles.planCardFeatured : ''}`}
                style={plan.featured ? { borderColor: plan.color } : {}}
              >
                {plan.featured && (
                  <div className={styles.featuredBadge}>Most Popular</div>
                )}
                {isCurrent && (
                  <div className={styles.currentBadge}>Your Plan</div>
                )}

                <div className={styles.planName} style={{ color: plan.color }}>{plan.name}</div>
                <div className={styles.planPrice}>
                  {plan.price}
                  <span className={styles.planPeriod}>{plan.period}</span>
                </div>

                <ul className={styles.featureList}>
                  {plan.features.map((f, i) => (
                    <li key={i} className={styles.featureItem}>
                      <span style={{ color: f.included ? 'var(--green)' : 'var(--text-muted)' }}>
                        {f.included ? '✓' : '×'}
                      </span>
                      <span style={{ color: f.included ? 'var(--text-dim)' : 'var(--text-muted)', textDecoration: f.included ? 'none' : 'none' }}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`${styles.planBtn} ${plan.featured ? styles.planBtnFeatured : ''}`}
                  style={plan.featured ? { background: plan.color } : {}}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || plan.id === 'free' || loading === plan.id}
                >
                  {loading === plan.id
                    ? 'Redirecting to Stripe...'
                    : isCurrent
                    ? 'Current Plan'
                    : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* SANDBOX NOTICE */}
        <div className={styles.sandboxNote}>
          <span>🧪</span>
          <p>Test mode active. Use card <strong>4242 4242 4242 4242</strong>, any future expiry, any CVC.</p>
        </div>
      </main>
    </div>
  );
}