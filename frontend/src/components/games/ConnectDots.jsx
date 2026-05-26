import { useState, useEffect, useRef, useCallback } from 'react'

function generatePositions(count, w, h, margin = 28) {
  const positions = []
  let attempts = 0
  while (positions.length < count && attempts < 2000) {
    attempts++
    const x = margin + Math.random() * (w - margin * 2)
    const y = margin + Math.random() * (h - margin * 2)
    const tooClose = positions.some(p => Math.hypot(p.x - x, p.y - y) < 44)
    if (!tooClose) positions.push({ x, y })
  }
  return positions
}

export default function ConnectDots({ content, onComplete }) {
  const TOTAL = content?.dots || 20
  const TIME_LIMIT = content?.time_limit || 30

  const containerRef = useRef(null)
  const [positions, setPositions] = useState([])
  const [next, setNext] = useState(1)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [done, setDone] = useState(false)
  const [penalty, setPenalty] = useState(false)
  const [lines, setLines] = useState([])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPositions(generatePositions(TOTAL, width || 360, height || 300))
  }, [TOTAL])

  useEffect(() => {
    if (done || positions.length === 0) return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id)
          setDone(true)
          const score = 5
          setTimeout(() => onComplete(score), 1200)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done, positions.length])

  const handleDotClick = useCallback((num) => {
    if (done || num !== next) {
      // Wrong order — apply time penalty
      setPenalty(true)
      setTimeout(() => setPenalty(false), 600)
      setTimeLeft(prev => Math.max(1, prev - 3))
      return
    }
    if (next > 1) {
      setLines(l => [...l, { from: next - 1, to: next }])
    }
    if (num === TOTAL) {
      setDone(true)
      const score = Math.max(5, Math.floor(timeLeft / TIME_LIMIT * 20))
      setTimeout(() => onComplete(score), 1000)
    } else {
      setNext(num + 1)
    }
  }, [done, next, TOTAL, timeLeft, TIME_LIMIT, onComplete])

  const pos = (num) => positions[num - 1]

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#6B7280' }}>
          Next: <strong style={{ color: '#0F6E56' }}>{done ? '✓' : next}</strong>
        </span>
        <div style={{
          fontSize: 13, fontWeight: 600, padding: '3px 12px', borderRadius: 20,
          color: timeLeft <= 8 ? '#DC2626' : '#0F6E56',
          background: timeLeft <= 8 ? '#FEF2F2' : '#ECFDF5',
          transition: 'all 0.3s',
        }}>
          {timeLeft}s
        </div>
      </div>

      {penalty && (
        <div style={{ textAlign: 'center', fontSize: 12, color: '#DC2626', fontWeight: 600, marginBottom: 8 }}>
          ⚠ Wrong order! −3 seconds
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          position: 'relative', width: '100%', height: 280,
          background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}
      >
        {/* SVG lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {lines.map((l, i) => {
            const a = pos(l.from), b = pos(l.to)
            if (!a || !b) return null
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#0F6E56" strokeWidth="2" strokeOpacity="0.4" />
          })}
        </svg>

        {/* Dots */}
        {positions.map((p, i) => {
          const num = i + 1
          const isNext = num === next && !done
          const isPast = num < next
          return (
            <button
              key={num}
              onClick={() => handleDotClick(num)}
              style={{
                position: 'absolute',
                left: p.x - 16, top: p.y - 16,
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                cursor: done ? 'default' : 'pointer',
                border: 'none',
                background: isPast ? '#0F6E56' : isNext ? '#ECFDF5' : 'white',
                color: isPast ? 'white' : isNext ? '#0F6E56' : '#6B7280',
                boxShadow: isNext
                  ? '0 0 0 3px #0F6E56, 0 2px 8px rgba(15,110,86,0.3)'
                  : '0 1px 3px rgba(0,0,0,0.12)',
                transition: 'all 0.15s',
                transform: isNext ? 'scale(1.15)' : 'scale(1)',
                zIndex: isNext ? 2 : 1,
              }}
            >
              {isPast ? '✓' : num}
            </button>
          )
        })}
      </div>

      {done && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: next > TOTAL ? '#0F6E56' : '#6B7280' }}>
            {next > TOTAL ? '🎉 Complete!' : '⏰ Time\'s up!'}
          </p>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
            Reached {next - 1} of {TOTAL} dots
          </p>
        </div>
      )}
    </div>
  )
}
