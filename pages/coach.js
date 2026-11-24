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
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState('');
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const userData = localStorage.getItem('user');
    if (userData) setPlan(JSON.parse(userData).plan || 'free');
    fetchQuickPrompts(token);

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keep the recording timer in sync while the microphone is active.
  useEffect(() => {
    if (!isRecording) return;

    const startedAt = Date.now();
    const timer = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);

    return () => clearInterval(timer);
  }, [isRecording]);

  function formatRecordingTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

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

      if (!res.ok) throw new Error(data.detail || 'Failed to get response');

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.remaining !== null) setRemaining(data.remaining);
      setPlan(data.plan);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function transcribeAndSend(blob) {
    if (!blob || blob.size === 0) {
      setVoiceError('No audio was captured. Please try recording again.');
      return;
    }

    setIsTranscribing(true);
    setVoiceError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      const extension = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', blob, `voice-question.${extension}`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coach/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();

      if (response.status === 403 && data.detail?.error === 'daily_limit_reached') {
        setLimitReached(true);
        return;
      }
      if (!response.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Voice transcription failed.');
      }

      const transcript = (data.text || '').trim();
      if (!transcript) {
        setVoiceError("I couldn't hear any speech. Please try again.");
        return;
      }

      await sendMessage(transcript);
    } catch (err) {
      console.error('Voice transcription error:', err);
      setVoiceError(err.message || 'Could not process your recording. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  }

  async function toggleRecording() {
    setVoiceError('');

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    if (loading || isTranscribing || limitReached) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('Voice recording is not supported in this browser. Please use an updated browser over HTTPS.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      setRecordingSeconds(0);

      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type));
      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = event => {
        console.error('MediaRecorder error:', event.error);
        setVoiceError('Recording failed. Please check your microphone and try again.');
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        audioChunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        transcribeAndSend(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setVoiceError('Microphone permission was denied. Allow microphone access in your browser settings and try again.');
      } else if (err.name === 'NotFoundError') {
        setVoiceError('No microphone was found. Connect a microphone and try again.');
      } else {
        setVoiceError('Could not start recording. Please check your microphone and try again.');
      }
    }
  }

  async function resetConversation() {
    if (isRecording && mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coach/reset`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([]);
    } catch (err) { console.error(err); }
  }

  const voiceBusy = isTranscribing || loading;

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
                <button
                  type="button"
                  className={styles.emptyChatIcon}
                  onClick={toggleRecording}
                  disabled={voiceBusy || limitReached}
                  aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
                  title={isRecording ? 'Stop recording' : 'Record a voice question'}
                  style={{
                    border: 'none',
                    cursor: voiceBusy || limitReached ? 'not-allowed' : 'pointer',
                    opacity: voiceBusy || limitReached ? 0.55 : 1,
                    background: isRecording ? 'rgba(220, 38, 38, 0.12)' : 'transparent',
                    color: isRecording ? '#dc2626' : 'inherit',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isRecording ? (
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
                    </svg>
                  )}
                </button>
                {isRecording && (
                  <p
                    aria-live="off"
                    style={{
                      color: '#dc2626',
                      fontSize: '14px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      margin: '8px 0 0',
                    }}
                  >
                    Recording · {formatRecordingTime(recordingSeconds)}
                  </p>
                )}
                {isTranscribing && (
                  <p style={{ color: 'inherit', opacity: 0.75, fontSize: '13px', margin: '8px 0 0' }}>
                    Processing your voice…
                  </p>
                )}
                {voiceError && (
                  <p role="alert" style={{ color: '#e5484d', fontSize: '13px', margin: '8px 0 0' }}>
                    {voiceError}
                  </p>
                )}
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
            {(loading || isTranscribing) && (
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
          <div>
            {voiceError && messages.length > 0 && (
              <p role="alert" style={{ color: '#e5484d', fontSize: '13px', margin: '0 0 10px', textAlign: 'center' }}>
                {voiceError}
              </p>
            )}
            <div className={styles.inputRow}>
              <input
                className={styles.chatInput}
                type="text"
                placeholder="Ask your coach anything about your voice..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={voiceBusy || limitReached}
              />
              <button
                className={styles.sendBtn}
                onClick={() => sendMessage()}
                disabled={voiceBusy || !input.trim() || limitReached}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
