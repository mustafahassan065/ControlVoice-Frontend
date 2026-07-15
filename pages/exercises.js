import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Exercises.module.css';

const CATEGORY_LABELS = {
  pause_control:  { label: 'Pause Control',   color: 'var(--teal)',   icon: '⏸️' },
  strong_endings: { label: 'Strong Endings',  color: 'var(--gold)',   icon: '⬇️' },
  pitch_movement: { label: 'Pitch Movement',  color: 'var(--purple)', icon: '🎵' },
  pace_control:   { label: 'Pace Control',    color: 'var(--green)',  icon: '🎯' },
};

export default function Exercises() {
  const router = useRouter();
  const { report_id } = router.query;

  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeEx, setActiveEx] = useState(null);
  const [sentences, setSentences] = useState([]);
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    if (report_id) {
      fetchRecommended(token, report_id);
    } else {
      fetchAll(token);
    }
  }, [report_id]);

  async function fetchRecommended(token, id) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/exercises/recommended/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setExercises(data.exercises);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAll(token) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/exercises/all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setExercises(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSentences(exerciseId) {
    if (activeEx?.id === exerciseId && sentences.length > 0) return;
    setLoadingSentences(true);
    setSentences([]);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/exercises/practice-sentences/${exerciseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setSentences(data.sentences);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSentences(false);
    }
  }

  function toggleExercise(ex) {
    if (activeEx?.id === ex.id) {
      setActiveEx(null);
      setSentences([]);
    } else {
      setActiveEx(ex);
      loadSentences(ex.id);
    }
  }

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)];
  const filtered = activeCategory === 'all'
    ? exercises
    : exercises.filter(ex => ex.category === activeCategory);

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
            <button className={styles.btnGhost} onClick={() => router.push('/record')}>Record</button>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>
            {report_id ? 'Recommended For You' : 'Exercise Library'}
          </p>
          <h1 className={styles.heading}>
            {report_id ? 'Your Training Exercises' : 'All Exercises'}
          </h1>
          <p className={styles.sub}>
            {report_id
              ? 'These exercises target your weakest areas based on your latest assessment.'
              : 'Browse all 40 exercises across 4 categories.'}
          </p>
        </div>

        {/* CATEGORY FILTER */}
        <div className={styles.filterRow}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${styles.filterBtn} ${activeCategory === cat ? styles.filterBtnActive : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]?.label}
            </button>
          ))}
        </div>

        {/* EXERCISES */}
        {loading ? (
          <div className={styles.loadingBox}>
            <div className={styles.spinner}></div>
            <p>Loading exercises...</p>
          </div>
        ) : (
          <div className={styles.exercisesList}>
            {filtered.map((ex) => {
              const meta = CATEGORY_LABELS[ex.category];
              const isActive = activeEx?.id === ex.id;

              return (
                <div
                  key={ex.id}
                  className={`${styles.exerciseCard} ${isActive ? styles.exerciseCardActive : ''}`}
                >
                  {/* CARD HEADER */}
                  <div className={styles.cardHeader} onClick={() => toggleExercise(ex)}>
                    <div className={styles.cardLeft}>
                      <span className={styles.cardIcon}>{meta?.icon}</span>
                      <div>
                        <div className={styles.cardMeta}>
                          <span
                            className={styles.categoryBadge}
                            style={{ color: meta?.color, borderColor: `${meta?.color}44`, background: `${meta?.color}11` }}
                          >
                            {meta?.label}
                          </span>
                          {ex.priority && (
                            <span className={styles.priorityBadge}>
                              Priority #{ex.priority}
                            </span>
                          )}
                        </div>
                        <h3 className={styles.cardTitle}>{ex.title}</h3>
                      </div>
                    </div>
                    <div className={styles.cardArrow} style={{ transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </div>

                  {/* EXPANDED CONTENT */}
                  {isActive && (
                    <div className={styles.cardBody}>

                      {/* INSTRUCTION */}
                      <div className={styles.instructionBox}>
                        <p className={styles.instructionLabel}>How to practice</p>
                        <p className={styles.instructionText}>{ex.instruction}</p>
                      </div>

                      {/* WRONG / CORRECT AUDIO */}
                      {(ex.wrong_audio_url || ex.correct_audio_url) && (
                        <div className={styles.audioExamples}>
                          {ex.wrong_audio_url && (
                            <div className={styles.audioExample}>
                              <div className={styles.audioExampleHeader}>
                                <span className={styles.wrongDot}></span>
                                <p className={styles.audioExampleLabel}>Wrong Example</p>
                              </div>
                              <audio
                                controls
                                src={ex.wrong_audio_url}
                                className={styles.audioExamplePlayer}
                                preload="none"
                              />
                            </div>
                          )}
                          {ex.correct_audio_url && (
                            <div className={styles.audioExample}>
                              <div className={styles.audioExampleHeader}>
                                <span className={styles.correctDot}></span>
                                <p className={styles.audioExampleLabel}>Correct Example</p>
                              </div>
                              <audio
                                controls
                                src={ex.correct_audio_url}
                                className={styles.audioExamplePlayer}
                                preload="none"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* PRACTICE TEMPLATE */}
                      <div className={styles.templateBox}>
                        <p className={styles.templateLabel}>Practice Template</p>
                        <p className={styles.templateText}>"{ex.practice_template}"</p>
                      </div>

                      {/* GPT-4 PRACTICE SENTENCES */}
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
                            {sentences.map((s, i) => (
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
                        <p>Repeat each sentence 5 times. Focus on the technique described above. Record yourself and compare.</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}