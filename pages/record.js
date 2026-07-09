import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Record.module.css';

export default function Record() {
  const router = useRouter();
  const [phase, setPhase] = useState('idle');
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [bars, setBars] = useState(Array(40).fill(4));
  const [uploading, setUploading] = useState(false);
  const [recordingId, setRecordingId] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [error, setError] = useState('');

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const animRef = useRef(null);
  const analyserRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push('/login');
    return () => {
      clearInterval(timerRef.current);
      cancelAnimationFrame(animRef.current);
      clearInterval(pollRef.current);
    };
  }, []);

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      analyserRef.current = audioCtx.createAnalyser();
      analyserRef.current.fftSize = 128;
      source.connect(analyserRef.current);

      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setPhase('recorded');
      };
      mr.start();
      setPhase('recording');
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s >= 59) { stopRecording(); return 60; }
          return s + 1;
        });
      }, 1000);

      function drawBars() {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const newBars = Array.from({ length: 40 }, (_, i) => {
          const val = data[Math.floor(i * data.length / 40)] || 0;
          return Math.max(4, (val / 255) * 80);
        });
        setBars(newBars);
        animRef.current = requestAnimationFrame(drawBars);
      }
      drawBars();
    } catch (err) {
      setError('Microphone access denied. Please allow microphone and try again.');
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
    setBars(Array(40).fill(4));
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
      mediaRef.current.stream.getTracks().forEach(t => t.stop());
    }
  }

  async function uploadFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setShowUpgrade(false);
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('duration', 0);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/audio/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (res.status === 403 && data.detail?.error === 'plan_limit_reached') {
        setError(data.detail.message);
        setShowUpgrade(true);
        return;
      }

      if (!res.ok) throw new Error(
        typeof data.detail === 'string' ? data.detail : 'Upload failed'
      );

      setRecordingId(data.id);
      setPhase('transcribing');
      setTranscribing(true);
      startPolling(data.id, token);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function uploadRecording() {
    if (!audioBlob) return;
    setUploading(true);
    setError('');
    setShowUpgrade(false);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('duration', seconds);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/audio/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (res.status === 403 && data.detail?.error === 'plan_limit_reached') {
        setError(data.detail.message);
        setShowUpgrade(true);
        return;
      }

      if (!res.ok) throw new Error(
        typeof data.detail === 'string' ? data.detail : 'Upload failed'
      );

      setRecordingId(data.id);
      setPhase('transcribing');
      setTranscribing(true);
      startPolling(data.id, token);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function startPolling(id, token) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/audio/recording/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.transcript) {
          setTranscript(data.transcript);
          if (data.acoustic_data) setAnalysisData(data.acoustic_data);
          if (data.report) setReportData(data.report);
          setTranscribing(false);
          setPhase('done');
          clearInterval(pollRef.current);
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000);
  }

  function reset() {
    setPhase('idle');
    setSeconds(0);
    setAudioUrl(null);
    setAudioBlob(null);
    setBars(Array(40).fill(4));
    setRecordingId(null);
    setTranscript(null);
    setTranscribing(false);
    setAnalysisData(null);
    setReportData(null);
    setShowUpgrade(false);
    setError('');
    clearInterval(pollRef.current);
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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
            <span className={styles.pill}>Voice Assessment</span>
            <button className={styles.btnGhost} onClick={() => router.push('/dashboard')}>Dashboard</button>
            <button
              className={styles.btnPrimary}
              onClick={() => {
                const reportId = reportData?.id;
                router.push(reportId ? `/exercises?report_id=${reportId}` : '/exercises');
              }}
            >
              View My Exercises
            </button>
          </div>
        </div>
      </nav>

      <main className={styles.main}>

        {/* PROMPT */}
        <div className={styles.promptCard}>
          <p className={styles.eyebrow}>Recording Prompt</p>
          <p className={styles.promptText}>"Introduce yourself and describe your work."</p>
        </div>

        {/* UPLOAD OPTION */}
        {phase === 'idle' && (
          <div className={styles.uploadCard}>
            <p className={styles.uploadLabel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Or upload an audio file
            </p>
            <label className={styles.uploadBtn}>
              {uploading ? 'Uploading...' : 'Choose Audio File'}
              <input
                type="file"
                accept="audio/*"
                onChange={uploadFromFile}
                style={{ display: 'none' }}
                disabled={uploading}
              />
            </label>
            <p className={styles.uploadHint}>Supports MP3, WAV, M4A, WebM</p>
          </div>
        )}

        {error && <div className={styles.errorBox}>{error}</div>}

        {/* UPGRADE BANNER */}
        {showUpgrade && (
          <div className={styles.upgradeBanner}>
            <p>🔒 You have reached your free plan limit.</p>
            <button
              className={styles.btnPrimary}
              onClick={() => router.push('/pricing')}
            >
              Upgrade to Pro — $19/month
            </button>
          </div>
        )}

        {/* RECORDER */}
        <div className={styles.recorderCard}>
          <div className={styles.timer}>
            <span className={styles.timerText}>{fmt(seconds)}</span>
            <span className={styles.timerMax}>/ 01:00</span>
          </div>

          <div className={styles.ringWrap}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
              <circle
                cx="80" cy="80" r="70"
                fill="none"
                stroke={phase === 'recording' ? 'var(--red)' : 'var(--gold)'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - seconds / 60)}`}
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <button
              className={`${styles.micBtn} ${phase === 'recording' ? styles.micBtnActive : ''}`}
              onClick={phase === 'idle' ? startRecording : stopRecording}
              disabled={phase === 'recorded' || phase === 'transcribing' || phase === 'done'}
            >
              {phase === 'recording' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                </svg>
              )}
            </button>
          </div>

          {/* WAVEFORM */}
          <div className={styles.waveform}>
            {bars.map((h, i) => (
              <span
                key={i}
                style={{ height: `${h}px` }}
                className={phase === 'recording' ? styles.barActive : styles.bar}
              />
            ))}
          </div>

          {/* STATUS */}
          <p className={styles.statusText}>
            {phase === 'idle' && 'Tap the microphone to begin your 60-second assessment'}
            {phase === 'recording' && '🔴 Recording — tap stop when finished'}
            {phase === 'recorded' && 'Recording complete — review and submit'}
            {phase === 'transcribing' && '⏳ Analyzing your audio...'}
            {phase === 'done' && '✅ Analysis complete'}
          </p>

          {/* PLAYBACK */}
          {(phase === 'recorded' || phase === 'transcribing' || phase === 'done') && audioUrl && (
            <div className={styles.playbackSection}>
              <p className={styles.playbackLabel}>Your Recording</p>
              <audio controls src={audioUrl} className={styles.audioPlayer} />
              {phase === 'recorded' && (
                <div className={styles.playbackActions}>
                  <button className={styles.btnGhost} onClick={reset}>Record Again</button>
                  <button className={styles.btnPrimary} onClick={uploadRecording} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Submit for Analysis'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TRANSCRIBING LOADER */}
          {phase === 'transcribing' && (
            <div className={styles.transcribingBox}>
              <div className={styles.spinner}></div>
              <p>Whisper AI is transcribing and analyzing your voice...</p>
            </div>
          )}
        </div>

        {/* TRANSCRIPT */}
        {phase === 'done' && transcript && (
          <div className={styles.transcriptCard}>
            <p className={styles.eyebrow}>Transcript</p>
            <p className={styles.transcriptText}>{transcript}</p>
            <div className={styles.transcriptActions}>
              <button className={styles.btnGhost} onClick={reset}>Record Again</button>
              <button className={styles.btnPrimary} onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* AUTHORITY SCORE DASHBOARD */}
        {phase === 'done' && reportData && (
          <div className={styles.scoresDashboard}>
            <p className={styles.eyebrow}>Your Authority Report</p>

            <div className={styles.authorityMain}>
              <div className={styles.authorityLeft}>
                <p className={styles.authorityLabel}>Authority Score</p>
                <div className={styles.authorityBig}>
                  <span style={{ color: 'var(--gold)' }}>{reportData.authority_score}</span>
                  <span className={styles.authorityMax}>/100</span>
                </div>
                <span className={styles.levelBadge}>{reportData.feedback?.user_level}</span>
              </div>
              <div className={styles.authorityRight}>
                <div className={styles.targetBox}>
                  <div>
                    <p className={styles.targetLabel}>Target</p>
                    <p className={styles.targetValue}>{reportData.feedback?.target_score}</p>
                  </div>
                  <div>
                    <p className={styles.targetLabel}>Progress</p>
                    <p className={styles.targetValue} style={{ color: 'var(--green)' }}>
                      {reportData.feedback?.progress_to_target}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.scoreBars}>
              {[
                { label: 'Strong Endings', score: reportData.ending_score,           color: 'var(--gold)',   weight: '25%' },
                { label: 'Pause Control',  score: reportData.pause_score,            color: 'var(--teal)',   weight: '20%' },
                { label: 'Pace Control',   score: reportData.pace_score,             color: 'var(--green)',  weight: '20%' },
                { label: 'Pitch Variety',  score: reportData.pitch_score,            color: 'var(--purple)', weight: '15%' },
                { label: 'Vocal Energy',   score: reportData.feedback?.energy_score, color: 'var(--teal)',   weight: '10%' },
                { label: 'Filler Control', score: reportData.feedback?.filler_score, color: 'var(--gold)',   weight: '10%' },
              ].map((item, i) => (
                <div key={i} className={styles.scoreBarRow}>
                  <div className={styles.scoreBarMeta}>
                    <span className={styles.scoreBarLabel}>{item.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.scoreBarWeight}>{item.weight}</span>
                      <span className={styles.scoreBarValue} style={{ color: item.color }}>{item.score}</span>
                    </div>
                  </div>
                  <div className={styles.scoreBarTrack}>
                    <div className={styles.scoreBarFill} style={{ width: `${item.score}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.otherScores}>
              {[
                { label: 'Confidence Score', score: reportData.confidence_score, color: 'var(--teal)' },
                { label: 'Presence Score',   score: reportData.presence_score,   color: 'var(--purple)' },
                { label: 'Leadership Score', score: reportData.leadership_score, color: 'var(--green)' },
              ].map((item, i) => (
                <div key={i} className={styles.otherScoreCard}>
                  <p className={styles.otherScoreLabel}>{item.label}</p>
                  <p className={styles.otherScoreValue} style={{ color: item.color }}>{item.score}</p>
                  <div className={styles.scoreBarTrack} style={{ marginTop: '8px' }}>
                    <div className={styles.scoreBarFill} style={{ width: `${item.score}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI FEEDBACK */}
        {phase === 'done' && reportData?.feedback?.feedback_text && (
          <div className={styles.feedbackCard}>
            <p className={styles.eyebrow}>AI Coach Feedback</p>
            <p className={styles.feedbackText}>{reportData.feedback.feedback_text}</p>

            {reportData.feedback.weaknesses?.length > 0 && (
              <div className={styles.feedbackSection}>
                <p className={styles.feedbackSectionTitle}>Main Weaknesses</p>
                <div className={styles.feedbackTags}>
                  {reportData.feedback.weaknesses.map((w, i) => (
                    <span key={i} className={styles.weaknessTag}>⚠️ {w}</span>
                  ))}
                </div>
              </div>
            )}

            {reportData.feedback.strengths?.length > 0 && (
              <div className={styles.feedbackSection}>
                <p className={styles.feedbackSectionTitle}>Strengths</p>
                <div className={styles.feedbackTags}>
                  {reportData.feedback.strengths.map((s, i) => (
                    <span key={i} className={styles.strengthTag}>✅ {s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACOUSTIC ANALYSIS */}
        {phase === 'done' && analysisData && (
          <div className={styles.analysisCard}>
            <p className={styles.eyebrow}>Acoustic Analysis</p>
            <div className={styles.analysisGrid}>
              <div className={styles.analysisStat}>
                <p className={styles.analysisLabel}>Speaking Rate</p>
                <p className={styles.analysisValue} style={{
                  color: analysisData.wpm_status === 'optimal' ? 'var(--green)' : 'var(--red)'
                }}>
                  {analysisData.speaking_rate_wpm}<span> WPM</span>
                </p>
                <p className={styles.analysisHint}>
                  {analysisData.wpm_status === 'optimal' && '✅ Perfect pace (130–160 WPM)'}
                  {analysisData.wpm_status === 'too_fast' && '⚠️ Too fast — slow down'}
                  {analysisData.wpm_status === 'too_slow' && '⚠️ Too slow — pick up pace'}
                </p>
              </div>

              <div className={styles.analysisStat}>
                <p className={styles.analysisLabel}>Pauses Detected</p>
                <p className={styles.analysisValue} style={{ color: 'var(--teal)' }}>
                  {analysisData.pause_count}<span> pauses</span>
                </p>
                <p className={styles.analysisHint}>Avg duration: {analysisData.avg_pause_duration}s</p>
              </div>

              <div className={styles.analysisStat}>
                <p className={styles.analysisLabel}>Pitch Range</p>
                <p className={styles.analysisValue} style={{
                  color: analysisData.pitch_status === 'good' ? 'var(--green)' : 'var(--gold)'
                }}>
                  {analysisData.pitch_range_hz}<span> Hz</span>
                </p>
                <p className={styles.analysisHint}>
                  {analysisData.pitch_status === 'monotone' && '⚠️ Monotone — add more variation'}
                  {analysisData.pitch_status === 'good' && '✅ Good vocal variety'}
                  {analysisData.pitch_status === 'very_varied' && '✅ Very expressive'}
                </p>
              </div>

              <div className={styles.analysisStat}>
                <p className={styles.analysisLabel}>Filler Words</p>
                <p className={styles.analysisValue} style={{
                  color: analysisData.filler_status === 'excellent' ? 'var(--green)' : 'var(--red)'
                }}>
                  {analysisData.total_fillers}<span> found</span>
                </p>
                <p className={styles.analysisHint}>{analysisData.filler_percent}% of total words</p>
              </div>

              <div className={styles.analysisStat}>
                <p className={styles.analysisLabel}>Sentence Endings</p>
                <p className={styles.analysisValue} style={{
                  color: analysisData.ending_status === 'strong' ? 'var(--green)' : 'var(--red)'
                }}>
                  {analysisData.downward_endings}<span> strong</span>
                </p>
                <p className={styles.analysisHint}>{analysisData.upward_endings} weak (upward) endings</p>
              </div>

              <div className={styles.analysisStat}>
                <p className={styles.analysisLabel}>Recording Duration</p>
                <p className={styles.analysisValue} style={{ color: 'var(--purple)' }}>
                  {analysisData.duration_seconds}<span> sec</span>
                </p>
                <p className={styles.analysisHint}>{analysisData.word_count} words spoken</p>
              </div>
            </div>

            {analysisData.pitch_values && analysisData.pitch_values.length > 0 && (
              <div className={styles.pitchGraph}>
                <p className={styles.analysisLabel} style={{ marginBottom: '12px' }}>Pitch Movement</p>
                <div className={styles.graphWrap}>
                  {analysisData.pitch_values.map((val, i) => {
                    const max = Math.max(...analysisData.pitch_values);
                    const min = Math.min(...analysisData.pitch_values);
                    const height = max === min ? 50 : ((val - min) / (max - min)) * 80 + 10;
                    return (
                      <div key={i} className={styles.graphBar} style={{ height: `${height}px` }} title={`${val} Hz`} />
                    );
                  })}
                </div>
                <div className={styles.graphLabels}>
                  <span>Start</span>
                  <span>{analysisData.pitch_mean_hz} Hz avg</span>
                  <span>End</span>
                </div>
              </div>
            )}

            {analysisData.filler_words && Object.keys(analysisData.filler_words).length > 0 && (
              <div className={styles.fillerBreakdown}>
                <p className={styles.analysisLabel} style={{ marginBottom: '10px' }}>Filler Word Breakdown</p>
                <div className={styles.fillerTags}>
                  {Object.entries(analysisData.filler_words).map(([word, count]) => (
                    <span key={word} className={styles.fillerTag}>"{word}" × {count}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TIPS */}
        {(phase === 'idle' || phase === 'recording') && (
          <div className={styles.tipsGrid}>
            {[
              { icon: '🎯', tip: 'Speak clearly at a natural pace' },
              { icon: '⏸️', tip: 'Use pauses before key points' },
              { icon: '🔊', tip: 'Project your voice with confidence' },
              { icon: '⬇️', tip: 'End statements with a downward tone' },
            ].map((t, i) => (
              <div key={i} className={styles.tipCard}>
                <span>{t.icon}</span>
                <p>{t.tip}</p>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}