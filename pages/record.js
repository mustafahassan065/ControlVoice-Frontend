import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area
} from 'recharts';
import styles from '../styles/Record.module.css';

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

function getWeakestCategory(reportData) {
  const scores = {
    pause_control:  reportData?.pause_score  || 50,
    strong_endings: reportData?.ending_score || 50,
    pitch_movement: reportData?.pitch_score  || 50,
    pace_control:   reportData?.pace_score   || 50,
  };
  return Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0];
}

function buildPitchChartData(pitchValues) {
  if (!pitchValues || pitchValues.length === 0) return [];
  return pitchValues.map((hz, i) => ({
    t: i,
    hz: hz,
    label: `${(i * 0.1).toFixed(1)}s`,
  }));
}

function buildWaveformData(pitchValues) {
  if (!pitchValues || pitchValues.length === 0) return [];
  return pitchValues.map((hz, i) => ({
    t: i,
    amp: hz > 0 ? Math.min(100, (hz / 400) * 100) : 0,
    label: `${(i * 0.1).toFixed(1)}s`,
  }));
}

function buildPauseMarkers(pauseDurations, totalDuration) {
  if (!pauseDurations || pauseDurations.length === 0) return [];
  return pauseDurations.map((duration, i) => ({
    position: Math.round(((i + 1) / (pauseDurations.length + 1)) * (totalDuration * 10)),
    duration: duration,
  }));
}

const PraatTooltip = ({ active, payload, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.praatTooltip}>
        <p className={styles.praatTooltipTime}>{payload[0]?.payload?.label}</p>
        <p className={styles.praatTooltipVal}>{Math.round(payload[0]?.value)} {unit}</p>
      </div>
    );
  }
  return null;
};

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

  const [coachStep, setCoachStep] = useState(0);
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

  useEffect(() => {
    if (reportData && phase === 'done') {
      const weakCat = getWeakestCategory(reportData);
      setWeakestCategory(weakCat);
      setCoachStep(1);
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
      if (res.ok && data.length > 0) setRecommendedExercise(data[0]);
    } catch (err) { console.error(err); }
    finally { setLoadingExercise(false); }
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
    } catch (err) { console.error(err); }
    finally { setLoadingSentences(false); }
  }

  async function assignRecommendedProgram() {
    const token = localStorage.getItem('token');
    const progName = PROGRAM_RECOMMENDATIONS[weakestCategory]?.program;
    if (!progName) return;
    setAssigningProgram(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const programs = await res.json();
      const match = programs.find(p => p.title === progName);
      if (!match) return;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/assign/${match.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setProgramAssigned(true);
    } catch (err) { console.error(err); }
    finally { setAssigningProgram(false); }
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
    setError(''); setShowUpgrade(false); setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('duration', 0);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/audio/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const data = await res.json();
      if (res.status === 403 && data.detail?.error === 'plan_limit_reached') {
        setError(data.detail.message); setShowUpgrade(true); return;
      }
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Upload failed');
      setRecordingId(data.id); setPhase('transcribing'); setTranscribing(true);
      startPolling(data.id, token);
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  }

  async function uploadRecording() {
    if (!audioBlob) return;
    setUploading(true); setError(''); setShowUpgrade(false);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('duration', seconds);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/audio/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const data = await res.json();
      if (res.status === 403 && data.detail?.error === 'plan_limit_reached') {
        setError(data.detail.message); setShowUpgrade(true); return;
      }
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Upload failed');
      setRecordingId(data.id); setPhase('transcribing'); setTranscribing(true);
      startPolling(data.id, token);
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  }

  function startPolling(id, token) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/audio/recording/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.transcript) {
          setTranscript(data.transcript);
          if (data.acoustic_data) setAnalysisData(data.acoustic_data);
          if (data.report) setReportData(data.report);
          setTranscribing(false); setPhase('done');
          clearInterval(pollRef.current);
        }
      } catch (err) { console.error(err); }
    }, 3000);
  }

  function reset() {
    setPhase('idle'); setSeconds(0); setAudioUrl(null); setAudioBlob(null);
    setBars(Array(40).fill(4)); setRecordingId(null); setTranscript(null);
    setTranscribing(false); setAnalysisData(null); setReportData(null);
    setShowUpgrade(false); setError(''); setCoachStep(0);
    setRecommendedExercise(null); setExerciseSentences([]);
    setProgramAssigned(false); setWeakestCategory(null);
    clearInterval(pollRef.current);
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const catMeta = weakestCategory ? CATEGORY_LABELS[weakestCategory] : null;
  const progRec = weakestCategory ? PROGRAM_RECOMMENDATIONS[weakestCategory] : null;
  const pitchChartData = analysisData ? buildPitchChartData(analysisData.pitch_values) : [];
  const waveformData = analysisData ? buildWaveformData(analysisData.pitch_values) : [];
  const pauseMarkers = analysisData ? buildPauseMarkers(analysisData.pause_durations, analysisData.duration_seconds) : [];

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

        <div className={styles.promptCard}>
          <p className={styles.eyebrow}>Recording Prompt</p>
          <p className={styles.promptText}>"Introduce yourself and describe your work."</p>
        </div>

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
            <button className={styles.btnPrimary} onClick={() => router.push('/pricing')}>Upgrade to Pro — $19/month</button>
          </div>
        )}

        <div className={styles.recorderCard}>
          <div className={styles.timer}>
            <span className={styles.timerText}>{fmt(seconds)}</span>
            <span className={styles.timerMax}>/ 01:00</span>
          </div>
          <div className={styles.ringWrap}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
              <circle cx="80" cy="80" r="70" fill="none"
                stroke={phase === 'recording' ? 'var(--red)' : 'var(--gold)'}
                strokeWidth="6" strokeLinecap="round"
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
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
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

        {/* ═══ PRAAT-STYLE ACOUSTIC VISUALIZATION ═══ */}
        {phase === 'done' && analysisData && pitchChartData.length > 0 && (
          <div className={styles.praatPanel}>
            <div className={styles.praatHeader}>
              <p className={styles.eyebrow}>Acoustic Analysis</p>
              <h2 className={styles.praatTitle}>Voice Signal Visualization</h2>
              <p className={styles.praatSub}>Praat-powered — waveform, pitch curve, pause segments</p>
            </div>

            {/* ROW 1 — WAVEFORM */}
            <div className={styles.praatSection}>
              <div className={styles.praatSectionHeader}>
                <span className={styles.praatSectionDot} style={{ background: '#2DD4BF' }}></span>
                <span className={styles.praatSectionLabel}>Vocal Energy — Waveform</span>
                <span className={styles.praatSectionInfo}>Amplitude over time</span>
              </div>
              <div className={styles.praatChartWrap}>
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={waveformData} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="t" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Area type="monotone" dataKey="amp" stroke="#2DD4BF" strokeWidth={1.5} fill="url(#waveGrad)" dot={false} isAnimationActive={false} />
                    {pauseMarkers.map((pm, i) => (
                      <ReferenceLine key={i} x={pm.position} stroke="rgba(248,113,113,0.5)" strokeDasharray="3 3" />
                    ))}
                    <Tooltip content={<PraatTooltip unit="%" />} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ROW 2 — PITCH CURVE */}
            <div className={styles.praatSection}>
              <div className={styles.praatSectionHeader}>
                <span className={styles.praatSectionDot} style={{ background: '#C9A84C' }}></span>
                <span className={styles.praatSectionLabel}>Pitch Curve (F0)</span>
                <span className={styles.praatSectionInfo}>
                  {analysisData.pitch_min_hz}–{analysisData.pitch_max_hz} Hz · avg {analysisData.pitch_mean_hz} Hz
                </span>
              </div>
              <div className={styles.praatChartWrap}>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={pitchChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} interval={Math.floor(pitchChartData.length / 6)} />
                    <YAxis domain={[Math.max(0, (analysisData.pitch_min_hz || 80) - 20), (analysisData.pitch_max_hz || 400) + 20]}
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `${v}Hz`} />
                    <ReferenceLine y={analysisData.pitch_mean_hz} stroke="rgba(201,168,76,0.3)" strokeDasharray="4 4"
                      label={{ value: `avg ${analysisData.pitch_mean_hz}Hz`, fill: 'rgba(201,168,76,0.6)', fontSize: 9, position: 'right' }} />
                    {pauseMarkers.map((pm, i) => (
                      <ReferenceLine key={i} x={pm.position} stroke="rgba(248,113,113,0.4)" strokeDasharray="3 3" />
                    ))}
                    <Tooltip content={<PraatTooltip unit="Hz" />} />
                    <Line type="monotone" dataKey="hz" stroke="#C9A84C" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.praatStatusRow}>
                <span className={styles.praatStatusBadge} style={{
                  background: (analysisData.pitch_status === 'good' || analysisData.pitch_status === 'very_varied') ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                  borderColor: (analysisData.pitch_status === 'good' || analysisData.pitch_status === 'very_varied') ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)',
                  color: (analysisData.pitch_status === 'good' || analysisData.pitch_status === 'very_varied') ? '#4ADE80' : '#F87171',
                }}>
                  {analysisData.pitch_status === 'monotone' && '⚠️ Monotone — add more variation'}
                  {analysisData.pitch_status === 'good' && '✅ Good vocal variety'}
                  {analysisData.pitch_status === 'very_varied' && '✅ Very expressive'}
                </span>
                <span className={styles.praatRange}>Range: {analysisData.pitch_range_hz} Hz</span>
              </div>
            </div>

            {/* ROW 3 — PAUSE SEGMENTS (TextGrid style) */}
            <div className={styles.praatSection}>
              <div className={styles.praatSectionHeader}>
                <span className={styles.praatSectionDot} style={{ background: '#F87171' }}></span>
                <span className={styles.praatSectionLabel}>Pause Segments</span>
                <span className={styles.praatSectionInfo}>
                  {analysisData.pause_count} pauses · avg {analysisData.avg_pause_duration}s
                </span>
              </div>
              <div className={styles.praatTextGrid}>
                <div className={styles.praatTimeline}>
                  <div className={styles.praatTimelineBar}>
                    {analysisData.pause_durations && analysisData.pause_durations.length > 0 ? (
                      analysisData.pause_durations.map((dur, i) => {
                        const total = analysisData.duration_seconds || 60;
                        const pauseWidth = (dur / total) * 100;
                        return (
                          <div key={i} style={{ display: 'flex', flex: 1 }}>
                            <div className={styles.praatSpeechSeg} style={{ flex: 1 }}>
                              <span className={styles.praatSegLabel}>speech</span>
                            </div>
                            <div className={styles.praatPauseSeg} style={{ width: `${Math.max(pauseWidth * 3, 4)}%` }} title={`Pause: ${dur}s`}>
                              <span className={styles.praatPauseLabel}>{dur}s</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className={styles.praatSpeechSeg} style={{ flex: 1 }}>
                        <span className={styles.praatSegLabel}>speech (no pauses detected)</span>
                      </div>
                    )}
                    <div className={styles.praatSpeechSeg} style={{ flex: 1 }}>
                      <span className={styles.praatSegLabel}>speech</span>
                    </div>
                  </div>
                  <div className={styles.praatTimeLabels}>
                    <span>0s</span>
                    <span>{Math.round((analysisData.duration_seconds || 60) / 4)}s</span>
                    <span>{Math.round((analysisData.duration_seconds || 60) / 2)}s</span>
                    <span>{Math.round((analysisData.duration_seconds || 60) * 3 / 4)}s</span>
                    <span>{Math.round(analysisData.duration_seconds || 60)}s</span>
                  </div>
                </div>
                <div className={styles.praatStatusRow}>
                  <span className={styles.praatStatusBadge} style={{
                    background: analysisData.pause_status === 'good' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                    borderColor: analysisData.pause_status === 'good' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)',
                    color: analysisData.pause_status === 'good' ? '#4ADE80' : '#F87171',
                  }}>
                    {analysisData.pause_status === 'good' && '✅ Good pause control (1–2 seconds)'}
                    {analysisData.pause_status === 'too_short' && '⚠️ Pauses too short — hold longer'}
                    {analysisData.pause_status === 'too_long' && '⚠️ Pauses too long — tighten up'}
                    {analysisData.pause_status === 'no_pauses' && '⚠️ No meaningful pauses detected'}
                  </span>
                </div>
              </div>
            </div>

            {/* ROW 4 — SPEAKING RATE */}
            <div className={styles.praatSection}>
              <div className={styles.praatSectionHeader}>
                <span className={styles.praatSectionDot} style={{ background: '#4ADE80' }}></span>
                <span className={styles.praatSectionLabel}>Speaking Rate</span>
                <span className={styles.praatSectionInfo}>Target: 130–160 WPM</span>
              </div>
              <div className={styles.praatWpmRow}>
                <div className={styles.praatWpmValue} style={{ color: analysisData.wpm_status === 'optimal' ? '#4ADE80' : '#F87171' }}>
                  {analysisData.speaking_rate_wpm}<span className={styles.praatWpmUnit}>WPM</span>
                </div>
                <div className={styles.praatWpmBar}>
                  <div className={styles.praatWpmTrack}>
                    <div className={styles.praatWpmTarget}></div>
                    <div className={styles.praatWpmMarker} style={{
                      left: `${Math.min(95, Math.max(2, (analysisData.speaking_rate_wpm / 250) * 100))}%`,
                      background: analysisData.wpm_status === 'optimal' ? '#4ADE80' : '#F87171',
                    }}></div>
                  </div>
                  <div className={styles.praatWpmScale}>
                    <span>0</span><span>80</span>
                    <span className={styles.praatWpmScaleTarget}>130</span>
                    <span className={styles.praatWpmScaleTarget}>160</span>
                    <span>200</span><span>250</span>
                  </div>
                </div>
                <span className={styles.praatStatusBadge} style={{
                  background: analysisData.wpm_status === 'optimal' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                  borderColor: analysisData.wpm_status === 'optimal' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)',
                  color: analysisData.wpm_status === 'optimal' ? '#4ADE80' : '#F87171',
                }}>
                  {analysisData.wpm_status === 'optimal' && '✅ Perfect pace'}
                  {analysisData.wpm_status === 'too_fast' && '⚠️ Too fast'}
                  {analysisData.wpm_status === 'too_slow' && '⚠️ Too slow'}
                </span>
              </div>
            </div>

            {/* ROW 5 — FILLER WORDS */}
            {analysisData.filler_words && Object.keys(analysisData.filler_words).length > 0 && (
              <div className={styles.praatSection}>
                <div className={styles.praatSectionHeader}>
                  <span className={styles.praatSectionDot} style={{ background: '#F87171' }}></span>
                  <span className={styles.praatSectionLabel}>Filler Words</span>
                  <span className={styles.praatSectionInfo}>{analysisData.total_fillers} total · {analysisData.filler_percent}% of speech</span>
                </div>
                <div className={styles.praatFillers}>
                  {Object.entries(analysisData.filler_words).map(([word, count]) => (
                    <div key={word} className={styles.praatFillerItem}>
                      <span className={styles.praatFillerWord}>"{word}"</span>
                      <div className={styles.praatFillerBar}>
                        <div className={styles.praatFillerFill} style={{ width: `${Math.min(100, count * 25)}%` }}></div>
                      </div>
                      <span className={styles.praatFillerCount}>×{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* COACHING FLOW — STEP 1 */}
        {phase === 'done' && coachStep >= 1 && reportData && (
          <div className={styles.coachAlert}>
            <div className={styles.coachAlertHeader}>
              <span className={styles.coachAlertIcon}>🎯</span>
              <div>
                <p className={styles.coachAlertTitle}>Your Voice Coach Has Assessed You</p>
                <p className={styles.coachAlertSub}>Authority Score: <strong style={{ color: 'var(--gold)' }}>{reportData.authority_score}/100</strong> — {reportData.feedback?.user_level}</p>
              </div>
            </div>
            <div className={styles.coachScoreBars}>
              {[
                { label: 'Strong Endings', score: reportData.ending_score, color: 'var(--gold)' },
                { label: 'Pause Control',  score: reportData.pause_score,  color: 'var(--teal)' },
                { label: 'Pace Control',   score: reportData.pace_score,   color: 'var(--green)' },
                { label: 'Pitch Variety',  score: reportData.pitch_score,  color: 'var(--purple)' },
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
            {catMeta && (
              <div className={styles.coachWeaknessBox} style={{ borderColor: `${catMeta.color}44`, background: `${catMeta.color}0d` }}>
                <p className={styles.coachWeaknessLabel}>Your biggest area to work on:</p>
                <p className={styles.coachWeaknessTitle} style={{ color: catMeta.color }}>{catMeta.icon} {catMeta.label}</p>
                {reportData.feedback?.weaknesses?.length > 0 && (
                  <p className={styles.coachWeaknessDetail}>⚠️ {reportData.feedback.weaknesses[0]}</p>
                )}
              </div>
            )}
            {coachStep === 1 && (
              <div className={styles.coachActions}>
                <button className={styles.btnPrimaryCoach} onClick={() => { setCoachStep(2); if (recommendedExercise) loadExerciseSentences(recommendedExercise.id); }}>
                  Start Your First Exercise →
                </button>
                <button className={styles.btnGhostCoach} onClick={() => router.push('/dashboard')}>Go to Dashboard</button>
              </div>
            )}
          </div>
        )}

        {/* COACHING FLOW — STEP 2 */}
        {phase === 'done' && coachStep >= 2 && (
          <div className={styles.coachExercise}>
            <div className={styles.coachExerciseHeader}>
              <div className={styles.coachStep}>Step 1 of 2</div>
              <p className={styles.eyebrow}>Your First Exercise</p>
              <h2 className={styles.coachExerciseTitle}>{loadingExercise ? 'Loading exercise...' : recommendedExercise?.title}</h2>
            </div>
            {recommendedExercise && !loadingExercise && (
              <>
                <div className={styles.instructionBox}>
                  <p className={styles.instructionLabel}>How to practice</p>
                  <p className={styles.instructionText}>{recommendedExercise.instruction}</p>
                </div>
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
                <div className={styles.templateBox}>
                  <p className={styles.templateLabel}>Practice Template</p>
                  <p className={styles.templateText}>"{recommendedExercise.practice_template}"</p>
                </div>
                <div className={styles.sentencesBox}>
                  <p className={styles.sentencesLabel}>AI Generated Practice Sentences<span className={styles.aiTag}>GPT-4</span></p>
                  {loadingSentences ? (
                    <div className={styles.sentencesLoading}><div className={styles.spinnerSmall}></div><span>Generating...</span></div>
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
                <div className={styles.practiceNote}><span>🎯</span><p>Repeat each sentence 5 times. Record yourself on the last attempt and compare.</p></div>
                {coachStep === 2 && (
                  <div className={styles.coachActions} style={{ marginTop: '20px' }}>
                    <button className={styles.btnPrimaryCoach} onClick={() => setCoachStep(3)}>Exercise Done — Next Step →</button>
                    <button className={styles.btnGhostCoach} onClick={() => router.push(`/exercises?report_id=${reportData.id}`)}>See All Recommended Exercises</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* COACHING FLOW — STEP 3 */}
        {phase === 'done' && coachStep >= 3 && progRec && (
          <div className={styles.coachProgram}>
            <div className={styles.coachStep}>Step 2 of 2</div>
            <p className={styles.eyebrow}>Recommended Program</p>
            <h2 className={styles.coachProgramTitle}>🏆 {progRec.program}</h2>
            <p className={styles.coachProgramDesc}>Based on your assessment, this 30-day program {progRec.reason}. One daily exercise — delivered to your inbox every morning at 8 AM.</p>
            {!programAssigned ? (
              <div className={styles.coachActions}>
                <button className={styles.btnPrimaryCoach} onClick={assignRecommendedProgram} disabled={assigningProgram}>
                  {assigningProgram ? 'Starting Program...' : `Start ${progRec.program} →`}
                </button>
                <button className={styles.btnGhostCoach} onClick={() => router.push('/programs')}>Browse All Programs</button>
              </div>
            ) : (
              <div className={styles.coachSuccess}>
                <span>✅</span>
                <div>
                  <p className={styles.coachSuccessTitle}>Program Started!</p>
                  <p className={styles.coachSuccessDesc}>Your first daily exercise will arrive tomorrow at 8 AM.</p>
                </div>
              </div>
            )}
            {programAssigned && (
              <div className={styles.coachFinalActions}>
                <button className={styles.btnPrimaryCoach} onClick={() => router.push('/dashboard')}>Go to Dashboard</button>
                <button className={styles.btnGhostCoach} onClick={reset}>Record Again</button>
              </div>
            )}
          </div>
        )}

        {phase === 'done' && transcript && coachStep === 0 && (
          <div className={styles.transcriptCard}>
            <p className={styles.eyebrow}>Transcript</p>
            <p className={styles.transcriptText}>{transcript}</p>
          </div>
        )}

        {(phase === 'idle' || phase === 'recording') && (
          <div className={styles.tipsGrid}>
            {[
              { icon: '🎯', tip: 'Speak clearly at a natural pace' },
              { icon: '⏸️', tip: 'Use pauses before key points' },
              { icon: '🔊', tip: 'Project your voice with confidence' },
              { icon: '⬇️', tip: 'End statements with a downward tone' },
            ].map((t, i) => (
              <div key={i} className={styles.tipCard}><span>{t.icon}</span><p>{t.tip}</p></div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}