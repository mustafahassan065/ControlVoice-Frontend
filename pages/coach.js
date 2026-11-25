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

  // --- DESIGN SPECIFIC VARIABLES ---
  const themeColors = {
    bg: '#0a101d',
    cardBg: '#111a2b',
    border: '#1e293b',
    gold: '#d4af37',
    goldHover: '#b8962e',
    textMuted: '#94a3b8',
    textLight: '#f8fafc',
  };

  return (
    <div style={{ backgroundColor: themeColors.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* NAVBAR */}
      <nav style={{ borderBottom: `1px solid ${themeColors.border}`, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '12px' }} onClick={() => router.push('/')}>
          <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', padding: '8px', borderRadius: '8px', color: themeColors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12h2M6 8v8M10 5v14M14 9v6M18 7v10M22 12h-2"/>
            </svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: themeColors.textLight }}>
            Voice<span style={{ color: themeColors.gold }}>Control</span> AI
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {messages.length > 0 && (
            <button 
              onClick={resetConversation}
              style={{ backgroundColor: 'transparent', border: `1px solid ${themeColors.border}`, color: themeColors.textLight, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', transition: '0.2s' }}
            >
              New Chat
            </button>
          )}
          <button 
            onClick={() => router.push('/dashboard')}
            style={{ backgroundColor: 'transparent', border: `1px solid ${themeColors.border}`, color: themeColors.textLight, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', transition: '0.2s' }}
          >
            Dashboard
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column' }}>
          
          {/* LIMIT REACHED BANNER */}
          {limitReached && (
            <div style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.2)', borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '32px' }}>
              <p style={{ color: '#fca5a5', fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>🔒 Daily Limit Reached</p>
              <p style={{ color: '#f87171', fontSize: '14px', margin: '0 0 16px 0' }}>Free plan allows 3 coach questions per day. Upgrade to Pro for unlimited access.</p>
              <button onClick={() => router.push('/pricing')} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Upgrade to Pro</button>
            </div>
          )}

          {/* CHAT & INPUT CONTAINER */}
          <div style={{ backgroundColor: themeColors.cardBg, border: `1px solid ${themeColors.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* MESSAGES AREA */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '400px', justifyContent: messages.length === 0 ? 'center' : 'flex-start' }}>
              
              {/* EMPTY STATE (Big Record Button) - NOW INSIDE THE BOX */}
              {messages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '20px 0' }}>
                  
                  <h1 style={{ color: themeColors.textLight, fontSize: '28px', fontWeight: '600', margin: '0 0 12px 0', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
                    Your personal voice coach is ready.
                  </h1>
                  <p style={{ color: themeColors.textMuted, fontSize: '16px', margin: '0 0 32px 0', textAlign: 'center', lineHeight: '1.5' }}>
                    Ask anything about your voice assessment, scores,<br/>or how to improve.
                  </p>

                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={voiceBusy || limitReached}
                    style={{
                      backgroundColor: themeColors.gold,
                      color: '#000',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '16px 32px',
                      fontSize: '18px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: voiceBusy || limitReached ? 'not-allowed' : 'pointer',
                      opacity: voiceBusy || limitReached ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(212, 175, 55, 0.2)'
                    }}
                  >
                    {isRecording ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="2" width="6" height="12" rx="3" />
                        <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
                      </svg>
                    )}
                    {isRecording ? `Recording... ${formatRecordingTime(recordingSeconds)}` : 'Start recording'}
                  </button>

                  {isTranscribing && (
                    <p style={{ color: themeColors.textMuted, fontSize: '14px', margin: '16px 0 0' }}>
                      Processing your voice…
                    </p>
                  )}
                  {voiceError && (
                    <p role="alert" style={{ color: '#e5484d', fontSize: '14px', margin: '16px 0 0' }}>
                      {voiceError}
                    </p>
                  )}
                </div>
              )}

              {/* ACTIVE CHAT MESSAGES */}
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🎓</div>
                  )}
                  <div style={{ 
                    backgroundColor: msg.role === 'user' ? themeColors.gold : '#1e293b', 
                    color: msg.role === 'user' ? '#000' : themeColors.textLight,
                    padding: '12px 18px', 
                    borderRadius: '12px',
                    maxWidth: '80%',
                    fontSize: '15px',
                    lineHeight: '1.5'
                  }}>
                    <p style={{ margin: 0 }}>{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* LOADING DOTS */}
              {(loading || isTranscribing) && messages.length > 0 && (
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🎓</div>
                  <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ width: '6px', height: '6px', backgroundColor: themeColors.textMuted, borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
                    <span style={{ width: '6px', height: '6px', backgroundColor: themeColors.textMuted, borderRadius: '50%', animation: 'pulse 1.5s infinite 0.2s' }}></span>
                    <span style={{ width: '6px', height: '6px', backgroundColor: themeColors.textMuted, borderRadius: '50%', animation: 'pulse 1.5s infinite 0.4s' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* SUGGESTED QUESTIONS (QUICK PROMPTS) - BOTTOM OF THE BOX */}
            {messages.length === 0 && quickPrompts.length > 0 && (
              <div style={{ borderTop: `1px solid ${themeColors.border}`, padding: '24px' }}>
                <p style={{ color: themeColors.textMuted, fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Suggested Questions</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {quickPrompts.map((prompt, i) => (
                    <button 
                      key={i} 
                      onClick={() => sendMessage(prompt)}
                      style={{
                        backgroundColor: 'transparent',
                        border: `1px solid ${themeColors.border}`,
                        color: themeColors.textLight,
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = themeColors.textMuted; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = themeColors.border; }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* INPUT ROW (Bottom bar) */}
            <div style={{ borderTop: `1px solid ${themeColors.border}`, padding: '16px 24px' }}>
              {voiceError && messages.length > 0 && (
                <p role="alert" style={{ color: '#e5484d', fontSize: '13px', margin: '0 0 10px', textAlign: 'center' }}>
                  {voiceError}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                
                {/* Mic Button */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={voiceBusy || limitReached}
                  style={{
                    backgroundColor: isRecording ? 'rgba(220, 38, 38, 0.15)' : 'transparent',
                    color: isRecording ? '#ef4444' : themeColors.textMuted,
                    border: `1px solid ${themeColors.border}`,
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: voiceBusy || limitReached ? 'not-allowed' : 'pointer',
                    opacity: voiceBusy || limitReached ? 0.5 : 1,
                    flexShrink: 0
                  }}
                >
                  {isRecording ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
                    </svg>
                  )}
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  placeholder="Ask your coach anything about your voice..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={voiceBusy || limitReached}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: themeColors.textLight,
                    fontSize: '15px',
                    outline: 'none',
                    padding: '10px 0'
                  }}
                />

                {/* Send Button */}
                <button
                  onClick={() => sendMessage()}
                  disabled={voiceBusy || !input.trim() || limitReached}
                  style={{
                    backgroundColor: themeColors.gold,
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: voiceBusy || !input.trim() || limitReached ? 'not-allowed' : 'pointer',
                    opacity: voiceBusy || !input.trim() || limitReached ? 0.5 : 1,
                    flexShrink: 0
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}