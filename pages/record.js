import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Record.module.css';

// Weakness to category mapping
const WEAKNESS_CATEGORY_MAP = {
  'pause': 'pause_control',
  'ending': 'strong_endings',
  'pitch': 'pitch_movement',
  'pace': 'pace_control',
  'filler': 'pace_control',
  'fast': 'pace_control',
  'slow': 'pace_control',
  'monotone': 'pitch_movement',
};

const PROGRAM_RECOMMENDATIONS = {
  'pause_control':  { program: 'Authority Foundation',   reason: 'builds core pause and presence habits' },
  'strong_endings': { program: 'Authority Foundation',   reason: 'trains commanding sentence endings' },
  'pitch_movement': { program: 'Public Speaking',        reason: 'develops vocal variety and expressiveness' },
  'pace_control':   { program: 'Interview Confidence',   reason: 'trains calm, measured delivery under pressure' },
};

const CATEGORY_LABELS = {
  pause_control:  { label: 'Pause Control',  color: 'var(--teal)',   icon: '⏸️' },
  strong_endings: { label: 'Strong Endings', color: 'var(--gold)',   icon: '⬇️' },
  pitch_movement: { label: 'Pitch Movement', color: 'var(--purple)', icon: '🎵' },
  pace_control:   { label: 'Pace Control',   color: 'var(--green)',  icon: '🎯' },
};

function getWeakestCategory(reportData, analysisData) {
  const scores = {
    pause_control:  reportData?.pause_score  || 50,
    strong_endings: reportData?.ending_score || 50,
    pitch_movement: reportData?.pitch_score  || 50,
    pace_control:   reportData?.pace_score   || 50,
  };
  return Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0];
}

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

  // Guided coaching flow states
  const [coachStep, setCoachStep] = useState(0); // 0=hidden, 1=alert, 2=exercise, 3=program
  const [recommendedExercise, setRecommendedExercise] = useState(null);
  const [loadingExercise, setLoadingExercise] = useState(false);
  const [exerciseSentences, setExerciseSentences] = useState([]);
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [assigningProgram, setAssigningProgram] = useState(false);
  const [programAssigned, setProgramAssigned] = useState(false);
  const [weakestCategory, setWeakestCategory] = useState(null);

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

  // When reportData arrives — start coaching flow
  useEffect(() => {
    if (reportData && phase === 'done') {
      const weakCat = getWeakestCategory(reportData, analysisData);
      setWeakestCategory(weakCat);
      setCoachStep(1); // Show alert first
      fetchRecommendedExercise(weakCat);
    }
  }, [reportData, phase]);

  async function fetchRecommendedExercise(category) {
    setLoadingExercise(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/exercises/all?category=${category}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok && data.length > 0) {
        setRecommendedExercise(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExercise(false);
    }
  }

  async function loadExerciseSentences(exerciseId) {
    setLoadingSentences(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/exercises/practice-sentences/${exerciseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setExerciseSentences(data.sentences);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSentences(false);
    }
  }

  async function assignRecommendedProgram() {
    const token = localStorage.getItem('token');
    const progName = PROGRAM_RECOMMENDATIONS[weakestCategory]?.program;
    if (!progName) return;

    setAssigningProgram(true);
    try {
      // Get all programs first
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const programs = await res.json();
      const match = programs.find(p => p.title === progName);
      if (!match) return;

      // Assign
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/assign/${match.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setProgramAssigned(true);
    } catch (err) {
      console.error(err);
    } finally {
      setAssigningProgram(false);
    }
  }

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

      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Upload failed');

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

      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Upload failed');

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
    setCoachStep(0);
    setRecommendedExercise(null);
    setExerciseSentences([]);
    setProgramAssigned(false);
    setWeakestCategory(null);
    clearInterval(pollRef.current);
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const catMeta = weakestCategory ? CATEGORY_LABELS[weakestCategory] : null;
  const progRec = weakestCategory ? PROGRAM_RECOMMENDATIONS[weakestCategory] : null;

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
              <input type="file" accept="audio/*" onChange={uploadFromFile} style={{ display: 'none' }} disabled={uploading} />
            </label>
            <p className={styles.uploadHint}>Supports MP3, WAV, M4A, WebM</p>
          </div>
        )}

        {error && <div className={styles.errorBox}>{error}</div>}

        {showUpgrade && (
          <div className={styles.upgradeBanner}>
            <p>🔒 You have reached your free plan limit.</p>
            <button className={styles.btnPrimary} onClick={() => router.push('/pricing')}>
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

          <div className={styles.waveform}>
            {bars.map((h, i) => (
              <span key={i} style={{ height: `${h}px` }} className={phase === 'recording' ? styles.barActive : styles.bar} />
            ))}
          </div>

          <p className={styles.statusText}>
            {phase === 'idle' && 'Tap the microphone to begin your 60-second assessment'}
            {phase === 'recording' && '🔴 Recording — tap stop when finished'}
            {phase === 'recorded' && 'Recording complete — review and submit'}
            {phase === 'transcribing' && '⏳ Analyzing your audio...'}
            {phase === 'done' && '✅ Analysis complete'}
          </p>

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

          {phase === 'transcribing' && (
            <div className={styles.transcribingBox}>
              <div className={styles.spinner}></div>
              <p>Whisper AI is transcribing and analyzing your voice...</p>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            GUIDED COACHING FLOW — STEP 1: ALERT
        ═══════════════════════════════════════════ */}
        {phase === 'done' && coachStep >= 1 && reportData && (
          <div className={styles.coachAlert}>
            <div className={styles.coachAlertHeader}>
              <span className={styles.coachAlertIcon}>🎯</span>
              <div>
                <p className={styles.coachAlertTitle}>Your Voice Coach Has Assessed You</p>
                <p className={styles.coachAlertSub}>Authority Score: <strong style={{ color: 'var(--gold)' }}>{reportData.authority_score}/100</strong> — {reportData.feedback?.user_level}</p>
              </div>
            </div>

            {/* Score bars */}
            <div className={styles.coachScoreBars}>
              {[
                { label: 'Strong Endings', score: reportData.ending_score,  color: 'var(--gold)' },
                { label: 'Pause Control',  score: reportData.pause_score,   color: 'var(--teal)' },
                { label: 'Pace Control',   score: reportData.pace_score,    color: 'var(--green)' },
                { label: 'Pitch Variety',  score: reportData.pitch_score,   color: 'var(--purple)' },
              ].map((item, i) => (
                <div key={i} className={styles.coachBarRow}>
                  <span className={styles.coachBarLabel}>{item.label}</span>
                  <div className={styles.coachBarTrack}>
                    <div className={styles.coachBarFill} style={{ width: `${item.score}%`, background: item.color }} />
                  </div>
                  <span className={styles.coachBarScore} style={{ color: item.color }}>{item.score}</span>
                </div>
              ))}
            </div>

            {/* Weakness highlight */}
            {catMeta && (
              <div className={styles.coachWeaknessBox} style={{ borderColor: `${catMeta.color}44`, background: `${catMeta.color}0d` }}>
                <p className={styles.coachWeaknessLabel}>Your biggest area to work on:</p>
                <p className={styles.coachWeaknessTitle} style={{ color: catMeta.color }}>
                  {catMeta.icon} {catMeta.label}
                </p>
                {reportData.feedback?.weaknesses?.length > 0 && (
                  <p className={styles.coachWeaknessDetail}>⚠️ {reportData.feedback.weaknesses[0]}</p>
                )}
              </div>
            )}

            {coachStep === 1 && (
              <div className={styles.coachActions}>
                <button
                  className={styles.btnPrimaryCoach}
                  onClick={() => {
                    setCoachStep(2);
                    if (recommendedExercise) loadExerciseSentences(recommendedExercise.id);
                  }}
                >
                  Start Your First Exercise →
                </button>
                <button className={styles.btnGhostCoach} onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            GUIDED COACHING FLOW — STEP 2: EXERCISE
        ═══════════════════════════════════════════ */}
        {phase === 'done' && coachStep >= 2 && (
          <div className={styles.coachExercise}>
            <div className={styles.coachExerciseHeader}>
              <div className={styles.coachStep}>Step 1 of 2</div>
              <p className={styles.eyebrow}>Your First Exercise</p>
              <h2 className={styles.coachExerciseTitle}>
                {loadingExercise ? 'Loading exercise...' : recommendedExercise?.title}
              </h2>
            </div>

            {recommendedExercise && !loadingExercise && (
              <>
                <div className={styles.instructionBox}>
                  <p className={styles.instructionLabel}>How to practice</p>
                  <p className={styles.instructionText}>{recommendedExercise.instruction}</p>
                </div>

                {/* Wrong / Correct audio */}
                {(recommendedExercise.wrong_audio_url || recommendedExercise.correct_audio_url) && (
                  <div className={styles.audioExamples}>
                    {recommendedExercise.wrong_audio_url && (
                      <div className={styles.audioExample}>
                        <div className={styles.audioExampleHeader}>
                          <span className={styles.wrongDot}></span>
                          <p className={styles.audioExampleLabel}>Wrong Example</p>
                        </div>
                        <audio controls src={recommendedExercise.wrong_audio_url} className={styles.audioExamplePlayer} preload="none" />
                      </div>
                    )}
                    {recommendedExercise.correct_audio_url && (
                      <div className={styles.audioExample}>
                        <div className={styles.audioExampleHeader}>
                          <span className={styles.correctDot}></span>
                          <p className={styles.audioExampleLabel}>Correct Example</p>
                        </div>
                        <audio controls src={recommendedExercise.correct_audio_url} className={styles.audioExamplePlayer} preload="none" />
                      </div>
                    )}
                  </div>
                )}

                {/* Practice template */}
                <div className={styles.templateBox}>
                  <p className={styles.templateLabel}>Practice Template</p>
                  <p className={styles.templateText}>"{recommendedExercise.practice_template}"</p>
                </div>

                {/* AI Practice Sentences */}
                <div className={styles.sentencesBox}>
                  <p className={styles.sentencesLabel}>
                    AI Generated Practice Sentences
                    <span className={styles.aiTag}>GPT-4</span>
                  </p>
                  {loadingSentences ? (
                    <div className={styles.sentencesLoading}>
                      <div className={styles.spinnerSmall}></div>
                      <span>Generating custom sentences...</span>
                    </div>
                  ) : (
                    <div className={styles.sentencesList}>
                      {exerciseSentences.map((s, i) => (
                        <div key={i} className={styles.sentenceItem}>
                          <span className={styles.sentenceNum}>{i + 1}</span>
                          <p className={styles.sentenceText}>"{s}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.practiceNote}>
                  <span>🎯</span>
                  <p>Repeat each sentence 5 times. Record yourself on the last attempt and compare.</p>
                </div>

                {coachStep === 2 && (
                  <div className={styles.coachActions} style={{ marginTop: '20px' }}>
                    <button
                      className={styles.btnPrimaryCoach}
                      onClick={() => setCoachStep(3)}
                    >
                      Exercise Done — Next Step →
                    </button>
                    <button className={styles.btnGhostCoach} onClick={() => router.push(`/exercises?report_id=${reportData.id}`)}>
                      See All Recommended Exercises
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            GUIDED COACHING FLOW — STEP 3: PROGRAM
        ═══════════════════════════════════════════ */}
        {phase === 'done' && coachStep >= 3 && progRec && (
          <div className={styles.coachProgram}>
            <div className={styles.coachStep}>Step 2 of 2</div>
            <p className={styles.eyebrow}>Recommended Program</p>
            <h2 className={styles.coachProgramTitle}>🏆 {progRec.program}</h2>
            <p className={styles.coachProgramDesc}>
              Based on your assessment, this 30-day program {progRec.reason}. One daily exercise — delivered to your inbox every morning at 8 AM.
            </p>

            {!programAssigned ? (
              <div className={styles.coachActions}>
                <button
                  className={styles.btnPrimaryCoach}
                  onClick={assignRecommendedProgram}
                  disabled={assigningProgram}
                >
                  {assigningProgram ? 'Starting Program...' : `Start ${progRec.program} →`}
                </button>
                <button className={styles.btnGhostCoach} onClick={() => router.push('/programs')}>
                  Browse All Programs
                </button>
              </div>
            ) : (
              <div className={styles.coachSuccess}>
                <span>✅</span>
                <div>
                  <p className={styles.coachSuccessTitle}>Program Started!</p>
                  <p className={styles.coachSuccessDesc}>Your first daily exercise will arrive tomorrow at 8 AM. Keep practicing!</p>
                </div>
              </div>
            )}

            {programAssigned && (
              <div className={styles.coachFinalActions}>
                <button className={styles.btnPrimaryCoach} onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                </button>
                <button className={styles.btnGhostCoach} onClick={reset}>
                  Record Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* TRANSCRIPT */}
        {phase === 'done' && transcript && coachStep === 0 && (
          <div className={styles.transcriptCard}>
            <p className={styles.eyebrow}>Transcript</p>
            <p className={styles.transcriptText}>{transcript}</p>
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