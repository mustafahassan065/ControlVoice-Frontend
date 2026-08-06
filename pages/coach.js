import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Coach.module.css';

export default function Coach() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState([]);
  const [remaining, setRemaining] = useState(null);
  const [plan, setPlan] = useState('free');
  const [limitReached, setLimitReached] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const userData = localStorage.getItem('user');
    if (userData) setPlan(JSON.parse(userData).plan || 'free');
    fetchQuickPrompts(token);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchQuickPrompts(token) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coach/quick-prompts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setQuickPrompts(data.prompts);
    } catch (err) { console.error(err); }
  }

  async function sendMessage(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);

    const userMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coach/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();

      if (res.status === 403 && data.detail?.error === 'daily_limit_reached') {
        setLimitReached(true);
        setMessages(prev => prev.slice(0, -1));
        return;
      }

      if (!res.ok) throw new Error('Failed to get response');

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.remaining !== null) setRemaining(data.remaining);
      setPlan(data.plan);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function resetConversation() {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coach/reset`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([]);
    } catch (err) { console.error(err); }
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
            {messages.length > 0 && (
              <button className={styles.btnGhost} onClick={resetConversation}>New Chat</button>
            )}
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>AI Voice Coach</p>
          <h1 className={styles.heading}>Ask Your Voice Coach</h1>
          <p className={styles.sub}>Get personalized advice based on your actual voice data.</p>
          {plan === 'free' && remaining !== null && (
            <div className={styles.limitBadge}>
              {remaining > 0
                ? `${remaining} question${remaining !== 1 ? 's' : ''} remaining today`
                : '0 questions remaining — upgrade for unlimited'}
            </div>
          )}
        </div>

        {/* LIMIT REACHED */}
        {limitReached && (
          <div className={styles.limitBanner}>
            <p className={styles.limitTitle}>🔒 Daily Limit Reached</p>
            <p className={styles.limitSub}>Free plan allows 3 coach questions per day. Upgrade to Pro for unlimited access.</p>
            <button className={styles.limitBtn} onClick={() => router.push('/pricing')}>Upgrade to Pro</button>
          </div>
        )}

        {/* CHAT */}
        <div className={styles.chatWrap}>
          {/* MESSAGES */}
          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.emptyChat}>
                <span className={styles.emptyChatIcon}>🎙️</span>
                <p className={styles.emptyChatTitle}>Your personal voice coach is ready.</p>
                <p className={styles.emptyChatSub}>Ask anything about your voice assessment, scores, or how to improve.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.message} ${msg.role === 'user' ? styles.messageUser : styles.messageAssistant}`}>
                {msg.role === 'assistant' && (
                  <div className={styles.messageAvatar}>🎓</div>
                )}
                <div className={styles.messageBubble}>
                  <p className={styles.messageText}>{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className={`${styles.message} ${styles.messageAssistant}`}>
                <div className={styles.messageAvatar}>🎓</div>
                <div className={styles.messageBubble}>
                  <div className={styles.typingDots}>
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* QUICK PROMPTS */}
          {messages.length === 0 && quickPrompts.length > 0 && (
            <div className={styles.quickPrompts}>
              <p className={styles.quickPromptsLabel}>Suggested Questions</p>
              <div className={styles.quickPromptsGrid}>
                {quickPrompts.map((prompt, i) => (
                  <button key={i} className={styles.quickPromptBtn} onClick={() => sendMessage(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INPUT */}
          <div className={styles.inputRow}>
            <input
              className={styles.chatInput}
              type="text"
              placeholder="Ask your coach anything about your voice..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading || limitReached}
            />
            <button
              className={styles.sendBtn}
              onClick={() => sendMessage()}
              disabled={loading || !input.trim() || limitReached}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}