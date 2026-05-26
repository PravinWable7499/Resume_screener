import { useState } from 'react'

const fireConfetti = async (colors) => {
  try {
    const { default: confetti } = await import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js')
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors })
  } catch {}
}

export default function JDMatch({ content, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [finalScore, setFinalScore] = useState(null)

  const handleSubmit = () => {
    if (selected === null) return
    const isMatch = selected === content.correct
    const score = isMatch ? 10 : 5
    setFinalScore(score)
    setSubmitted(true)
    if (isMatch) fireConfetti(['#0369A1', '#60A5FA', '#DBEAFE'])
  }

  const cardStyle = (idx) => {
    const base = {
      borderRadius: 10, padding: '12px 14px', cursor: submitted ? 'default' : 'pointer',
      transition: 'all 0.15s', marginBottom: 8,
    }
    if (!submitted) return {
      ...base,
      background: selected === idx ? '#ECFDF5' : 'white',
      border: `2px solid ${selected === idx ? '#0F6E56' : '#E5E7EB'}`,
    }
    if (idx === content.correct) return { ...base, background: '#DCFCE7', border: '2px solid #86EFAC' }
    if (idx === selected) return { ...base, background: '#FEF3C7', border: '2px solid #FDE68A' }
    return { ...base, background: '#F9FAFB', border: '2px solid #F3F4F6' }
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {/* JD */}
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Job Description
        </p>
        <div style={{
          background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 10,
          padding: '12px 14px', fontSize: 12, lineHeight: 1.7, color: '#374151',
        }}>
          {content.jd}
        </div>
      </div>

      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
        Which candidate is the best match?
      </p>

      {/* Candidate cards */}
      {content.candidates.map((c, idx) => (
        <div key={idx} onClick={() => !submitted && setSelected(idx)} style={cardStyle(idx)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#E0F2FE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#0369A1', flexShrink: 0,
            }}>
              {c.name.charAt(0)}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.name}</p>
            {submitted && idx === content.correct && (
              <span style={{ marginLeft: 'auto', fontSize: 11, background: '#DCFCE7', color: '#065F46', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                ✓ Best match
              </span>
            )}
            {submitted && idx === selected && idx !== content.correct && (
              <span style={{ marginLeft: 'auto', fontSize: 11, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                Your pick
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.6, paddingLeft: 36 }}>{c.profile}</p>
        </div>
      ))}

      {!submitted && (
        <button
          disabled={selected === null}
          onClick={handleSubmit}
          style={{
            width: '100%', marginTop: 8, padding: '10px 0', borderRadius: 8,
            background: selected === null ? '#E5E7EB' : '#0F6E56', color: 'white',
            border: 'none', fontSize: 13, fontWeight: 500, cursor: selected === null ? 'not-allowed' : 'pointer',
          }}
        >
          Submit my pick
        </button>
      )}

      {submitted && (
        <>
          <div style={{
            marginTop: 12, padding: '14px 16px', borderRadius: 10,
            background: selected === content.correct ? '#DCFCE7' : '#FEF9C3',
            border: `1px solid ${selected === content.correct ? '#86EFAC' : '#FDE047'}`,
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>
              🤖 AI Recommendation: {content.candidates[content.correct]?.name}
            </p>
            <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{content.ai_reason}</p>
          </div>
          <button
            onClick={() => onComplete(finalScore)}
            style={{
              width: '100%', marginTop: 12, padding: '10px 0', borderRadius: 8,
              background: '#0F6E56', color: 'white', border: 'none',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Done →
          </button>
        </>
      )}
    </div>
  )
}
