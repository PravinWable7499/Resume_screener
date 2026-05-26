import { useState, useEffect, useRef } from 'react'
import { API_URL } from '../../utils.js'
import RecruitmentChallenge from './RecruitmentChallenge.jsx'
import WordConnections from './WordConnections.jsx'
import ResumeRedFlag from './ResumeRedFlag.jsx'
import JDMatch from './JDMatch.jsx'
import SlidingPuzzle from './SlidingPuzzle.jsx'

const GAME_META = {
  mcq:            { icon: '🔍', title: 'Recruitment Challenge', sub: 'Test your HR knowledge',      color: '#0F6E56', bg: '#ECFDF5' },
  connections:    { icon: '🧩', title: 'Word Connections',       sub: 'Group the related words',     color: '#7C3AED', bg: '#F5F3FF' },
  red_flag:       { icon: '🚩', title: 'Resume Red Flag',         sub: 'Spot the screening issue',    color: '#B45309', bg: '#FFFBEB' },
  jd_match:       { icon: '🎯', title: 'JD Match',                sub: 'Pick the best candidate',     color: '#0369A1', bg: '#EFF6FF' },
  sliding_puzzle: { icon: '🔲', title: 'Sliding Puzzle',          sub: 'Slide the tiles into order',  color: '#0F6E56', bg: '#ECFDF5' },
}

const GAME_INSTRUCTIONS = {
  mcq: {
    bullets: [
      'Read the scenario carefully',
      'Choose the best answer from 4 options',
      'You have 60 seconds to answer',
    ],
    scoring: 'Correct: +10 pts + speed bonus  ·  Wrong: +5 pts for participating',
    timeNote: '⏱ 60 seconds',
  },
  connections: {
    bullets: [
      'Find 4 groups of 4 related words',
      'Click 4 words, then hit Submit Group',
      'You have 4 mistakes allowed before it ends',
      'Yellow = easiest  ·  Purple = hardest',
    ],
    scoring: 'Fewer mistakes = more points (max 100)',
    timeNote: null,
  },
  red_flag: {
    bullets: [
      'Read the resume snippet carefully',
      'Spot the hidden red flag in the profile',
      'Choose from 4 options',
      'Sharpen your screening skills!',
    ],
    scoring: 'Correct: +10 pts + speed bonus  ·  Wrong: +5 pts for participating',
    timeNote: '⏱ 45 seconds',
  },
  jd_match: {
    bullets: [
      'Read the Job Description carefully',
      'Compare 3 candidate profiles side by side',
      'Pick the best match for the role',
      "See how your pick compares to the AI's recommendation",
    ],
    scoring: 'Match AI recommendation: +10 pts  ·  Different pick: +5 pts',
    timeNote: null,
  },
  sliding_puzzle: {
    bullets: [
      'Slide the tiles into order 1 through 8',
      'Click a tile next to the empty space to slide it',
      'Fewer moves = more points',
      'You have 120 seconds',
    ],
    scoring: 'Under 20 moves: 10 pts · 21-35 moves: 7 pts · 36+: 5 pts',
    timeNote: '⏱ 120 seconds',
  },
}

function InstructionsScreen({ gameType, onStart, onClose }) {
  const meta = GAME_META[gameType]
  const inst = GAME_INSTRUCTIONS[gameType]
  if (!meta || !inst) return null

  return (
    <div style={{ padding: '8px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 10 }}>{meta.icon}</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{meta.title}</h2>
      {inst.timeNote && (
        <span style={{
          display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 12px',
          borderRadius: 20, background: '#FFFBEB', color: '#92400E',
          border: '1px solid #FDE68A', marginBottom: 16,
        }}>
          {inst.timeNote}
        </span>
      )}
      {!inst.timeNote && <div style={{ height: 16 }} />}

      <div style={{ textAlign: 'left', marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          How to Play
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {inst.bullets.map((b, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', background: '#ECFDF5',
                color: '#0F6E56', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
              }}>
                {i + 1}
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div style={{
        background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 10,
        padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#065F46', textAlign: 'center',
      }}>
        <strong>Scoring:</strong> {inst.scoring}
      </div>

      <button
        onClick={onStart}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 10,
          background: '#0F6E56', color: 'white', border: 'none',
          fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 12,
          boxShadow: '0 4px 12px rgba(15,110,86,0.25)',
        }}
      >
        Let's Go! →
      </button>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF' }}
      >
        Maybe later
      </button>
    </div>
  )
}

function GameModal({ gameType, content, onComplete, onClose }) {
  const [started, setStarted] = useState(false)
  const [celebration, setCelebration] = useState(null)
  const startTimeRef = useRef(null)
  const meta = GAME_META[gameType]

  const handleStart = () => {
    startTimeRef.current = Date.now()
    setStarted(true)
  }

  const handleComplete = async (score) => {
    const timeTaken = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0
    setCelebration({ score, timeTaken })
    try {
      const { default: confetti } = await import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js')
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#0F6E56', '#1D9E75', '#A7F3D0', '#FCD34D', '#60A5FA'] })
      setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } }), 300)
    } catch {}
    setTimeout(() => {
      setCelebration(null)
      onComplete(score, timeTaken)
    }, 2200)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      padding: 20,
    }} onClick={!started ? onClose : undefined}>
      <div style={{
        background: 'white', borderRadius: 20, width: '100%', maxWidth: 480,
        padding: '28px 28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        maxHeight: '90vh', overflowY: 'auto', position: 'relative',
      }} onClick={e => e.stopPropagation()}>

        {celebration && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 10, pointerEvents: 'none', borderRadius: 20,
          }}>
            <div style={{
              background: 'white', border: '2px solid #1D9E75', borderRadius: 16,
              padding: '20px 32px', textAlign: 'center',
              animation: 'celebration-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>🏆 Well done!</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0F6E56' }}>{celebration.score} pts</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Completed in {celebration.timeTaken}s</div>
            </div>
          </div>
        )}

        {!started ? (
          <InstructionsScreen gameType={gameType} onStart={handleStart} onClose={onClose} />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{meta?.icon}</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{meta?.title}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF' }}>{meta?.sub}</p>
                </div>
              </div>
              <button onClick={onClose} style={{
                width: 28, height: 28, borderRadius: '50%', background: '#F3F4F6',
                border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#6B7280',
              }}>×</button>
            </div>

            {gameType === 'mcq'            && <RecruitmentChallenge content={content} onComplete={handleComplete} />}
            {gameType === 'connections'    && <WordConnections content={content} onComplete={handleComplete} />}
            {gameType === 'red_flag'       && <ResumeRedFlag content={content} onComplete={handleComplete} />}
            {gameType === 'jd_match'       && <JDMatch content={content} onComplete={handleComplete} />}
            {gameType === 'sliding_puzzle' && <SlidingPuzzle content={content} onComplete={handleComplete} />}
          </>
        )}

        <style>{`@keyframes celebration-pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    </div>
  )
}

export default function GamesPage({ recruiter, onNavigate }) {
  const [tab, setTab] = useState('challenges')
  const [dailyData, setDailyData] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeGame, setActiveGame] = useState(null)

  const fetchDaily = async () => {
    try {
      const res = await fetch(`${API_URL}/api/games/daily?email=${encodeURIComponent(recruiter.email)}`)
      if (res.ok) setDailyData(await res.json())
    } catch {}
    setLoading(false)
  }

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/games/leaderboard`)
      if (res.ok) setLeaderboard(await res.json())
    } catch {}
  }

  useEffect(() => { fetchDaily(); fetchLeaderboard() }, [])

  const handleGameComplete = async (gameType, score, timeTaken = 0) => {
    setActiveGame(null)
    try {
      await fetch(`${API_URL}/api/games/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recruiter.email, game_type: gameType, score, completed: true, time_taken: timeTaken }),
      })
    } catch {}
    fetchDaily()
    fetchLeaderboard()
  }

  const streak = dailyData?.streak || { current: 0, longest: 0 }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FFFE', paddingBottom: 40 }}>
      {/* Back button */}
      <div style={{ background: '#F8FFFE', padding: '12px 32px 0' }}>
        <button onClick={() => onNavigate('home')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#0F6E56', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          ← Back to Home
        </button>
      </div>

      {/* Header */}
      <div style={{ background: '#0F6E56', padding: '28px 32px 24px', marginTop: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 4 }}>Games & Challenges</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Daily challenges to keep your recruiting skills sharp</p>
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{streak.current}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Day streak 🔥</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{streak.longest}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Best streak</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', background: 'white', padding: '0 32px' }}>
        {[{ id: 'challenges', label: "Today's Challenges" }, { id: 'leaderboard', label: 'Leaderboard' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 16px', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? '#0F6E56' : '#6B7280', background: 'none', border: 'none',
            cursor: 'pointer', borderBottom: tab === t.id ? '2px solid #0F6E56' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '28px 32px' }}>
        {tab === 'challenges' && (
          loading ? (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>Loading challenges…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, width: '100%' }}>
              {Object.entries(GAME_META).map(([type, meta]) => {
                const gameData = dailyData?.[type]
                const played = gameData?.played
                const score = gameData?.score || 0
                return (
                  <div key={type} style={{
                    background: 'white', borderRadius: 16, padding: '22px 18px',
                    border: `1.5px solid ${played ? '#A7F3D0' : '#E5E7EB'}`,
                    cursor: played ? 'default' : 'pointer', transition: 'all 0.2s',
                  }}
                    onClick={() => !played && gameData && setActiveGame({ type, content: gameData.content })}
                    onMouseEnter={e => !played && (e.currentTarget.style.borderColor = meta.color)}
                    onMouseLeave={e => !played && (e.currentTarget.style.borderColor = played ? '#A7F3D0' : '#E5E7EB')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: meta.bg, fontSize: 22,
                      }}>
                        {meta.icon}
                      </div>
                      {played && (
                        <div style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                          background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0',
                        }}>
                          ✓ {score} pts
                        </div>
                      )}
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3 }}>{meta.title}</h3>
                    <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16, lineHeight: 1.4 }}>{meta.sub}</p>
                    {!played ? (
                      <button style={{
                        width: '100%', padding: '8px 0', borderRadius: 8,
                        background: meta.color, color: 'white', border: 'none',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      }}
                        onClick={e => { e.stopPropagation(); gameData && setActiveGame({ type, content: gameData.content }) }}>
                        Play now →
                      </button>
                    ) : (
                      <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
                        Come back tomorrow!
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {tab === 'leaderboard' && (
          <div style={{ maxWidth: 620 }}>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Top scores this week</p>
            {leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>No scores yet this week. Be the first!</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 76px 76px 76px', gap: 8, padding: '0 16px 8px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <div>#</div>
                  <div>Player</div>
                  <div style={{ textAlign: 'center' }}>Weekly</div>
                  <div style={{ textAlign: 'center' }}>Today</div>
                  <div style={{ textAlign: 'center' }}>Avg Time</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {leaderboard.map((entry, i) => (
                    <div key={entry.email} style={{
                      display: 'grid', gridTemplateColumns: '36px 1fr 76px 76px 76px', gap: 8,
                      alignItems: 'center', background: 'white', borderRadius: 12, padding: '11px 16px',
                      border: entry.email === recruiter.email ? '1.5px solid #A7F3D0' : '1px solid #E5E7EB',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700,
                        background: i === 0 ? '#FEF9C3' : i === 1 ? '#F3F4F6' : i === 2 ? '#FEF3C7' : '#F9FAFB',
                        color: i === 0 ? '#713F12' : i === 1 ? '#374151' : i === 2 ? '#92400E' : '#6B7280',
                      }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>
                          {entry.name}
                          {entry.email === recruiter.email && (
                            <span style={{ fontSize: 10, color: '#0F6E56', marginLeft: 6 }}>(you)</span>
                          )}
                        </p>
                        <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>
                          {(entry.current_streak ?? 0) > 0 ? `🔥 ${entry.current_streak} day streak` : 'No streak'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#0F6E56' }}>
                        {entry.weekly_score ?? entry.score ?? 0}
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 12, color: '#6B7280' }}>
                        {entry.games_played_today ?? 0}g
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 12, color: '#6B7280' }}>
                        {entry.avg_time_today ? `${entry.avg_time_today}s` : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {activeGame && (
        <GameModal
          gameType={activeGame.type}
          content={activeGame.content}
          onComplete={(score, timeTaken) => handleGameComplete(activeGame.type, score, timeTaken)}
          onClose={() => setActiveGame(null)}
        />
      )}
    </div>
  )
}
