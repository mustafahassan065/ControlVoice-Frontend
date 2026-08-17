import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Baseline.module.css';

export default function Baseline() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(0);
  const [phase, setPhase] = useState('intro'); // intro, prep, recording, recorded, uploading, done
  const [seconds, setSeconds] = useState(0);
  const [prepSeconds, setPrepSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [bars, setBars] = useState(Array(30).fill(4));
  const [allDone, setAllDone] = useState(false);

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const prepTimerRef = useRef(null);
  const animRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchTasks(token);
    return () => {
      clearInterval(timerRef.current);
      clearInterval(prepTimerRef.current);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  async function fetchTasks(token) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/baseline-tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTasks(data.tasks);
        if (data.all_done) { router.push('/dashboard'); }
        // Find first incomplete
        const firstIncomplete = data.tasks.findIndex(t => !t.completed);
        if (firstIncomplete >= 0) setCurrentTask(firstIncomplete);
      }
    } catch (err) { console.error(err); }
  }

  const task = tasks[currentTask];

  function startPrep() {
    if (task?.prep_time > 0) {
      setPhase('prep');
      setPrepSeconds(task.prep_time);
      prepTimerRef.current = setInterval(() => {
        setPrepSeconds(s => {
          if (s <= 1) {
            clearInterval(prepTimerRef.current);
            startRecording();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      startRecording();
    }
  }

  async function startRecording() {
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

      const maxDuration = task?.duration || 60;
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s >= maxDuration - 1) { stopRecording(); return maxDuration; }
          return s + 1;
        });
      }, 1000);

      function drawBars() {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        setBars(Array.from({ length: 30 }, (_, i) => Math.max(4, ((data[Math.floor(i * data.length / 30)] || 0) / 255) * 60)));
        animRef.current = requestAnimationFrame(drawBars);
      }
      drawBars();
    } catch (err) { alert('Microphone access denied.'); }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
    setBars(Array(30).fill(4));
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
      mediaRef.current.stream.getTracks().forEach(t => t.stop());
    }
  }

  function retake() {
    setAudioUrl(null);
    setAudioBlob(null);
    setSeconds(0);
    setPhase('intro');
  }

  async function submitTask() {
    if (!audioBlob) return;
    setPhase('uploading');
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', audioBlob, 'baseline.webm');
      formData.append('duration', seconds);

      const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/audio/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await uploadRes.json();

      // Mark task complete
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/onboarding/complete-baseline-task?task_type=${task.type}&recording_id=${uploadData.id}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );

      // Check if all done
      if (currentTask >= tasks.length - 1) {
        setAllDone(true);
        setPhase('done');
      } else {
        setCurrentTask(prev => prev + 1);
        setAudioUrl(null);
        setAudioBlob(null);
        setSeconds(0);
        setPhase('intro');
      }
    } catch (err) {
      console.error(err);
      setPhase('recorded');
    }
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const progress = tasks.length > 0 ? Math.round((currentTask / tasks.length) * 100) : 0;

  if (allDone) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.doneCard}>
            <span className={styles.doneIcon}>🎉</span>
            <h1 className={styles.doneTitle}>Baseline Complete!</h1>
            <p className={styles.doneSub}>Your Personal Voice Profile has been created. Your daily training starts now.</p>
            <button className={styles.continueBtn} onClick={() => router.push('/dashboard')}>
              Go to Dashboard →
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.logo} onClick={() => router.push('/')}>
          <div className={styles.logoIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12h2M6 8v8M10 5v14M14 9v6M18 7v10M22 12h-2"/>
            </svg>
          </div>
          <span className={styles.logoText}>Voice<span>Control</span> AI</span>
        </div>
        <p className={styles.headerSub}>Baseline Assessment</p>
      </div>

      {/* PROGRESS BAR */}
      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <p className={styles.progressLabel}>Task {currentTask + 1} of {tasks.length}</p>
      </div>

      <main className={styles.main}>
        {task && (
          <div className={styles.taskCard}>
            {/* TASK HEADER */}
            <div className={styles.taskHeader}>
              <div className={styles.taskBadge}>{task.title}</div>
              <p className={styles.taskFocus}>{task.type === 'read_aloud' ? '📖 Read Aloud' : task.type === 'free_speaking' ? '🎙️ Free Speaking' : task.type === 'impromptu' ? '⚡ Impromptu' : '💪 Pressure Response'}</p>
            </div>

            {/* INSTRUCTION */}
            <div className={styles.instructionBox}>
              <p className={styles.instructionLabel}>Instructions</p>
              <p className={styles.instructionText}>{task.instruction}</p>
            </div>

            {/* CONTENT (passage / prompt) */}
            {task.content && (
              <div className={styles.contentBox}>
                <p className={styles.contentLabel}>
                  {task.type === 'read_aloud' ? 'Read this aloud:' : task.type === 'impromptu' ? 'Your topic:' : 'Scenario:'}
                </p>
                <p className={styles.contentText}>{task.content}</p>
              </div>
            )}

            {/* DURATION */}
            <div className={styles.durationRow}>
              <span>⏱ {task.duration} seconds</span>
              {task.prep_time > 0 && <span>📋 {task.prep_time}s preparation</span>}
            </div>

            {/* PREP COUNTDOWN */}
            {phase === 'prep' && (
              <div className={styles.prepBox}>
                <p className={styles.prepLabel}>Preparation time</p>
                <p className={styles.prepCountdown}>{prepSeconds}</p>
                <p className={styles.prepSub}>Recording starts automatically...</p>
              </div>
            )}

            {/* RECORDING UI */}
            {(phase === 'intro' || phase === 'recording' || phase === 'recorded' || phase === 'uploading') && (
              <div className={styles.recorderBox}>
                {phase === 'recording' && (
                  <>
                    <div className={styles.recordingTimer}>{fmt(seconds)} / {fmt(task.duration)}</div>
                    <div className={styles.waveform}>
                      {bars.map((h, i) => <span key={i} className={styles.bar} style={{ height: `${h}px` }} />)}
                    </div>
                    <p className={styles.recordingStatus}>🔴 Recording...</p>
                    <button className={styles.stopBtn} onClick={stopRecording}>Stop Recording</button>
                  </>
                )}

                {phase === 'recorded' && audioUrl && (
                  <div className={styles.recordedBox}>
                    <p className={styles.recordedLabel}>Review your recording</p>
                    <audio controls src={audioUrl} className={styles.audioPlayer} />
                    <div className={styles.recordedActions}>
                      <button className={styles.retakeBtn} onClick={retake}>↩ Retake</button>
                      <button className={styles.submitBtn} onClick={submitTask}>
                        Submit & Continue →
                      </button>
                    </div>
                  </div>
                )}

                {phase === 'uploading' && (
                  <div className={styles.uploadingBox}>
                    <div className={styles.spinner}></div>
                    <p>Saving your recording...</p>
                  </div>
                )}

                {phase === 'intro' && (
                  <button className={styles.startBtn} onClick={startPrep}>
                    {task.prep_time > 0 ? `Start Preparation (${task.prep_time}s)` : 'Start Recording'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}