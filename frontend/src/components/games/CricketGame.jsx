import { useState } from 'react'

const SHOT_OUTCOMES = {
  '1': [1, 1, 1, 1, 0, 'W'],
  '2': [2, 2, 1, 1, 0, 'W'],
  '3': [3, 2, 1, 1, 0, 'W'],
  '4': [4, 4, 2, 1, 0, 'W'],
  '6': [6, 6, 4, 2, 0, 'W'],
  'DOT': [0, 0, 0, 1, 1, 1],
}

function getOutcome(shot) {
  const pool = SHOT_OUTCOMES[shot] || [0, 0, 0, 1, 1, 'W']
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function CricketGame({ onComplete, onClose }) {
  const TOTAL_BALLS = 6
  const [runs, setRuns] = useState(0)
  const [balls, setBalls] = useState(0)
  const [wickets, setWickets] = useState(0)
  const [log, setLog] = useState([])
  const [done, setDone] = useState(false)
  const [lastOutcome, setLastOutcome] = useState(null)

  const playShot = (shot) => {
    if (done) return
    const outcome = getOutcome(shot)
    const newBalls = balls + 1
    let newRuns = runs
    let newWickets = wickets
    const entry = { ball: newBalls, shot, outcome }

    if (outcome === 'W') {
      newWickets += 1
      entry.label = 'OUT!'
    } else {
      newRuns += outcome
      entry.label = outcome === 0 ? '•' : String(outcome)
    }

    setRuns(newRuns)
    setBalls(newBalls)
    setWickets(newWickets)
    setLog(l => [...l, entry])
    setLastOutcome(entry)

    if (newBalls >= TOTAL_BALLS || newWickets >= 2) {
      setDone(true)
      setTimeout(() => onComplete(newRuns), 1500)
    }
  }

  const shotButtons = [
    { label: '1', color: '#E5E7EB', text: '#374151' },
    { label: '2', color: '#E5E7EB', text: '#374151' },
    { label: '3', color: '#E5E7EB', text: '#374151' },
    { label: '4', color: '#DBEAFE', text: '#1E40AF' },
    { label: '6', color: '#DCFCE7', text: '#065F46' },
    { label: 'DOT', color: '#F3F4F6', text: '#6B7280' },
  ]

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#6B7280' }}>1 Over Cricket</span>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>You're batting!</span>
      </div>

      {/* Scoreboard */}
      <div style={{
        background: '#0F6E56', borderRadius: 12, padding: '16px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, color: 'white',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{runs}</div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>RUNS</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{balls}/{TOTAL_BALLS}</div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>BALLS</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: wickets > 0 ? '#FCA5A5' : 'white' }}>{wickets}/2</div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>WICKETS</div>
        </div>
      </div>

      {/* Ball log */}
      {log.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {log.map((entry, i) => (
            <div key={i} style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600,
              background: entry.outcome === 'W' ? '#FEE2E2' : entry.outcome === 6 ? '#DCFCE7' : entry.outcome === 4 ? '#DBEAFE' : '#F3F4F6',
              color: entry.outcome === 'W' ? '#DC2626' : entry.outcome === 6 ? '#065F46' : entry.outcome === 4 ? '#1D4ED8' : '#374151',
              border: `1.5px solid ${entry.outcome === 'W' ? '#FECACA' : entry.outcome === 6 ? '#A7F3D0' : entry.outcome === 4 ? '#93C5FD' : '#E5E7EB'}`,
            }}>
              {entry.label}
            </div>
          ))}
        </div>
      )}

      {/* Shot buttons */}
      {!done && (
        <>
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 10, textAlign: 'center' }}>Choose your shot</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {shotButtons.map(({ label, color, text }) => (
              <button
                key={label}
                onClick={() => playShot(label)}
                style={{
                  padding: '14px 8px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: color, color: text, border: 'none', cursor: 'pointer',
                  transition: 'transform 0.1s', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {label}
              </button>
            ))}
          </div>
          {lastOutcome && (
            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 15, fontWeight: 600,
              color: lastOutcome.outcome === 'W' ? '#DC2626' : lastOutcome.outcome >= 4 ? '#065F46' : '#374151' }}>
              {lastOutcome.outcome === 'W' ? '🏏 OUT!' : lastOutcome.outcome === 6 ? '🎉 SIX!' : lastOutcome.outcome === 4 ? '⚡ FOUR!' : lastOutcome.outcome === 0 ? 'Dot ball' : `${lastOutcome.outcome} run${lastOutcome.outcome !== 1 ? 's' : ''}`}
            </div>
          )}
        </>
      )}

      {done && (
        <div style={{ textAlign: 'center', padding: '12px 0', marginTop: 8 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0F6E56' }}>
            {runs >= 30 ? '🏆 Outstanding!' : runs >= 15 ? '👍 Good innings!' : '😅 Tough over!'}
          </p>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Final score: {runs} runs in {balls} balls
          </p>
        </div>
      )}
    </div>
  )
}
