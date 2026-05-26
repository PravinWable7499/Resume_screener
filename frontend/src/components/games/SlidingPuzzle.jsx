import { useState, useEffect, useRef } from 'react'

const TILE_DATA = {
  1: { emoji: '📄' },
  2: { emoji: '🎯' },
  3: { emoji: '✅' },
  4: { emoji: '💼' },
  5: { emoji: '🏆' },
  6: { emoji: '🔍' },
  7: { emoji: '👤' },
  8: { emoji: '⭐' },
}

const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0]

function scramble() {
  const tiles = [...SOLVED]
  let emptyIdx = 8
  for (let i = 0; i < 80; i++) {
    const neighbors = []
    const row = Math.floor(emptyIdx / 3), col = emptyIdx % 3
    if (row > 0) neighbors.push(emptyIdx - 3)
    if (row < 2) neighbors.push(emptyIdx + 3)
    if (col > 0) neighbors.push(emptyIdx - 1)
    if (col < 2) neighbors.push(emptyIdx + 1)
    const swap = neighbors[Math.floor(Math.random() * neighbors.length)]
    ;[tiles[emptyIdx], tiles[swap]] = [tiles[swap], tiles[emptyIdx]]
    emptyIdx = swap
  }
  return { tiles, emptyIdx }
}

export default function SlidingPuzzle({ onComplete }) {
  const [{ tiles, emptyIdx }, setState] = useState(scramble)
  const [moves, setMoves] = useState(0)
  const [timeLeft, setTimeLeft] = useState(120)
  const [done, setDone] = useState(false)
  const [solved, setSolved] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setDone(true)
          setTimeout(() => onComplete(2), 800)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const handleTileClick = (idx) => {
    if (done) return
    const row = Math.floor(idx / 3), col = idx % 3
    const eRow = Math.floor(emptyIdx / 3), eCol = emptyIdx % 3
    const isAdjacent = (row === eRow && Math.abs(col - eCol) === 1) ||
                       (col === eCol && Math.abs(row - eRow) === 1)
    if (!isAdjacent) return

    const newTiles = [...tiles]
    ;[newTiles[idx], newTiles[emptyIdx]] = [newTiles[emptyIdx], newTiles[idx]]
    const newMoves = moves + 1

    const isSolved = newTiles.every((v, i) => v === SOLVED[i])
    if (isSolved) {
      clearInterval(timerRef.current)
      setDone(true)
      setSolved(true)
      setState({ tiles: newTiles, emptyIdx: idx })
      setMoves(newMoves)
      const score = newMoves <= 20 ? 10 : newMoves <= 35 ? 7 : 5
      setTimeout(() => onComplete(score), 800)
    } else {
      setState({ tiles: newTiles, emptyIdx: idx })
      setMoves(newMoves)
    }
  }

  const timerColor = timeLeft <= 15 ? '#DC2626' : timeLeft <= 30 ? '#B45309' : '#0F6E56'
  const timerBg   = timeLeft <= 15 ? '#FEF2F2' : timeLeft <= 30 ? '#FFFBEB' : '#ECFDF5'

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Stats bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          Moves: <strong style={{ color: '#111827' }}>{moves}</strong>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 600, padding: '3px 14px', borderRadius: 20,
          color: timerColor, background: timerBg, transition: 'all 0.5s',
        }}>
          {timeLeft}s
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>
          Target: &lt;20 moves
        </div>
      </div>

      {/* Puzzle grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 4, width: 276, margin: '0 auto',
      }}>
        {tiles.map((tile, idx) => (
          tile === 0 ? (
            <div key="empty" style={{
              width: 88, height: 88, borderRadius: 8,
              background: '#F3F4F6',
              border: '2px dashed #D1D5DB',
            }} />
          ) : (
            <button
              key={tile}
              onClick={() => handleTileClick(idx)}
              style={{
                width: 88, height: 88, borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #0F6E56, #1D9E75)',
                cursor: done ? 'default' : 'pointer',
                position: 'relative', transition: 'transform 0.12s ease',
                boxShadow: '0 2px 6px rgba(15,110,86,0.3)',
              }}
              onMouseDown={e => !done && (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span style={{
                position: 'absolute', top: 6, left: 8,
                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)',
              }}>
                {tile}
              </span>
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', fontSize: 28,
              }}>
                {TILE_DATA[tile]?.emoji}
              </span>
            </button>
          )
        ))}
      </div>

      {/* Scoring hint */}
      {!done && (
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 12 }}>
          {[['≤20 moves', '10 pts', '#065F46', '#DCFCE7'], ['21-35 moves', '7 pts', '#92400E', '#FEF3C7'], ['36+', '5 pts', '#6B7280', '#F3F4F6']].map(([label, pts, color, bg]) => (
            <div key={label} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 10, background: bg, color }}>
              {label} → <strong>{pts}</strong>
            </div>
          ))}
        </div>
      )}

      {done && (
        <div style={{ textAlign: 'center', marginTop: 16, padding: '12px 0' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: solved ? '#0F6E56' : '#6B7280' }}>
            {solved ? '🎉 Puzzle solved!' : '⏰ Time\'s up!'}
          </p>
          {solved && (
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              Completed in {moves} moves · {moves <= 20 ? '10 pts' : moves <= 35 ? '7 pts' : '5 pts'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
