import { useState, useEffect, useRef } from 'react'

const fireConfetti = async (colors) => {
  try {
    const { default: confetti } = await import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js')
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors })
  } catch {}
}

export default function RecruitmentChallenge({ content, onComplete, onClose }) {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          if (!submitted) handleSubmit(null, 0)
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
    const score = isCorrect ? 10 + Math.floor(t / 60 * 10) : 5
    if (isCorrect) fireConfetti(['#0F6E56', '#1D9E75', '#A7F3D0'])
    setTimeout(() => onComplete(score), 2000)
  }

  const optionColors = (idx) => {
    if (!submitted) {
      return selected === idx
        ? 'border-primary bg-primary-surface text-primary'
        : 'border-primary-border bg-white text-ink hover:border-primary-light'
    }
    if (idx === content.correct) return 'border-green-400 bg-green-50 text-green-800'
    if (idx === selected && idx !== content.correct) return 'border-red-300 bg-red-50 text-red-700'
    return 'border-primary-border bg-white text-ink-3'
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: '#6B7280' }}>Recruitment Challenge</span>
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: timeLeft <= 10 ? '#DC2626' : '#0F6E56',
          background: timeLeft <= 10 ? '#FEF2F2' : '#ECFDF5',
          padding: '3px 12px', borderRadius: 20,
        }}>
          {timeLeft}s
        </div>
      </div>

      <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', lineHeight: 1.6, marginBottom: 20 }}>
        {content.question}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {content.options.map((opt, idx) => (
          <button
            key={idx}
            disabled={submitted}
            onClick={() => !submitted && setSelected(idx)}
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${optionColors(idx)}`}
            style={{ cursor: submitted ? 'default' : 'pointer' }}
          >
            {opt}
          </button>
        ))}
      </div>

      {!submitted && (
        <button
          disabled={selected === null}
          onClick={() => selected !== null && handleSubmit(selected, timeLeft)}
          className="w-full mt-5 py-2.5 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
        >
          Submit answer
        </button>
      )}

      {submitted && (
        <div style={{
          marginTop: 16, padding: '14px 16px', borderRadius: 12,
          background: selected === content.correct ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${selected === content.correct ? '#A7F3D0' : '#FECACA'}`,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: selected === content.correct ? '#065F46' : '#991B1B', marginBottom: 4 }}>
            {selected === content.correct ? '✓ Correct!' : '✗ Not quite'}
          </p>
          <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{content.explanation}</p>
        </div>
      )}
    </div>
  )
}
