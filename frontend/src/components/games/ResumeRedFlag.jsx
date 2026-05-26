import { useState, useEffect, useRef } from 'react'

const fireConfetti = async (colors) => {
  try {
    const { default: confetti } = await import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js')
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors })
  } catch {}
}

export default function ResumeRedFlag({ content, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(45)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleSubmit(null, 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const handleSubmit = (idx, timeRemaining) => {
    clearInterval(timerRef.current)
    setSubmitted(true)
    if (idx !== null) setSelected(idx)
    const isCorrect = idx === content.correct
    const t = timeRemaining ?? timeLeft
    const score = isCorrect ? 10 + Math.floor(t / 45 * 10) : 5
    if (isCorrect) fireConfetti(['#F97316', '#FCD34D', '#FEF3C7'])
    setTimeout(() => onComplete(score), 2200)
  }

  const optionStyle = (idx) => {
    if (!submitted) return {
      background: selected === idx ? '#0F6E56' : 'white',
      color: selected === idx ? 'white' : '#111827',
      border: `2px solid ${selected === idx ? '#0F6E56' : '#E5E7EB'}`,
    }
    if (idx === content.correct) return { background: '#DCFCE7', color: '#065F46', border: '2px solid #86EFAC' }
    if (idx === selected) return { background: '#FEE2E2', color: '#991B1B', border: '2px solid #FECACA' }
    return { background: 'white', color: '#9CA3AF', border: '2px solid #F3F4F6' }
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#6B7280' }}>Spot the red flag</span>
        <div style={{
          fontSize: 13, fontWeight: 600, padding: '3px 12px', borderRadius: 20,
          color: timeLeft <= 10 ? '#DC2626' : '#B45309',
          background: timeLeft <= 10 ? '#FEF2F2' : '#FFFBEB',
        }}>
          {timeLeft}s
        </div>
      </div>

      {/* Resume snippet */}
      <div style={{
        background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10,
        padding: '14px 16px', marginBottom: 18, fontFamily: 'monospace',
        fontSize: 12, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap',
      }}>
        {content.snippet}
      </div>

      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
        🚩 What is the red flag in this resume?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {content.options.map((opt, idx) => (
          <button
            key={idx}
            disabled={submitted}
            onClick={() => !submitted && setSelected(idx)}
            style={{
              ...optionStyle(idx),
              width: '100%', textAlign: 'left', padding: '10px 14px',
              borderRadius: 8, fontSize: 13, cursor: submitted ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {!submitted && (
        <button
          disabled={selected === null}
          onClick={() => selected !== null && handleSubmit(selected, timeLeft)}
          style={{
            width: '100%', marginTop: 16, padding: '10px 0', borderRadius: 8,
            background: selected === null ? '#E5E7EB' : '#0F6E56', color: 'white',
            border: 'none', fontSize: 13, fontWeight: 500, cursor: selected === null ? 'not-allowed' : 'pointer',
          }}
        >
          Submit answer
        </button>
      )}

      {submitted && (
        <div style={{
          marginTop: 16, padding: '14px 16px', borderRadius: 10,
          background: selected === content.correct ? '#DCFCE7' : '#FEF3C7',
          border: `1px solid ${selected === content.correct ? '#86EFAC' : '#FDE68A'}`,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4,
            color: selected === content.correct ? '#065F46' : '#92400E' }}>
            {selected === content.correct ? '✓ Correct! Sharp eye!' : '✗ Not quite — here\'s the real issue:'}
          </p>
          <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{content.explanation}</p>
        </div>
      )}
    </div>
  )
}
