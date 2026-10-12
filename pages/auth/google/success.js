// pages/auth/google/success.js
// Google OAuth callback handler — saves token and redirects
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function GoogleSuccess() {
  const router = useRouter();

  useEffect(() => {
    const { token, onboarding, name } = router.query;
    if (!token) return;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ name: name || 'User' }));

    if (onboarding === 'true') {
      router.push('/onboarding');
    } else {
      router.push('/dashboard');
    }
  }, [router.query]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#080808', color: '#fff',
      fontFamily: 'Inter, sans-serif'
    }}>
      <p style={{ letterSpacing: '0.1em', opacity: 0.6 }}>Signing you in...</p>
    </div>
  );
}