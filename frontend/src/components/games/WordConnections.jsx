import { useState } from 'react'

const fireConfetti = async (colors) => {
  try {
    const { default: confetti } = await import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js')
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors })
  } catch {}
}

const DIFFICULTY_COLORS = [
  { bg: '#FEF9C3', border: '#FDE047', text: '#713F12' },
  { bg: '#DCFCE7', border: '#86EFAC', text: '#14532D' },
  { bg: '#DBEAFE', border: '#93C5FD', text: '#1E3A8A' },
  { bg: '#F3E8FF', border: '#C084FC', text: '#581C87' },
]

export default function WordConnections({ content, onComplete, onClose }) {
  const [words, setWords] = useState([...content.words])
  const [selected, setSelected] = useState([])
  const [solved, setSolved] = useState([])
  const [mistakes, setMistakes] = useState(0)
  const [shake, setShake] = useState(false)
  const [done, setDone] = useState(false)

  const maxMistakes = 4

  const toggleWord = (word) => {
    if (done) return
    if (selected.includes(word)) {
      setSelected(s => s.filter(w => w !== word))
    } else if (selected.length < 4) {
      setSelected(s => [...s, word])
    }
  }

  const submitGroup = () => {
    if (selected.length !== 4) return
    const match = content.groups.find(g =>
      g.words.every(w => selected.includes(w)) && selected.every(w => g.words.includes(w))
    )
    if (match) {
      const newSolved = [...solved, match]
      setSolved(newSolved)
      setSelected([])
      setWords(w => w.filter(word => !match.words.includes(word)))
      const col = DIFFICULTY_COLORS[(match.difficulty - 1) % DIFFICULTY_COLORS.length]
      fireConfetti([col.border, col.bg, '#ffffff'])
      if (newSolved.length === content.groups.length) {
        setDone(true)
        const score = Math.max(0, (maxMistakes - mistakes) * 25)
        setTimeout(() => onComplete(score), 1500)
      }
    } else {
      const newMistakes = mistakes + 1
      setMistakes(newMistakes)
      setShake(true)
      setTimeout(() => setShake(false), 600)
      setSelected([])
      if (newMistakes >= maxMistakes) {
        setDone(true)
        setTimeout(() => onComplete(0), 1500)
      }
    }
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#6B7280' }}>Word Connections</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: maxMistakes }).map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < mistakes ? '#DC2626' : '#E5E7EB',
            }} />
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14, textAlign: 'center' }}>
        Find four groups of four related words
      </p>

      {/* Solved groups */}
      {solved.map((group, i) => {
        const col = DIFFICULTY_COLORS[group.difficulty - 1] || DIFFICULTY_COLORS[0]
        return (
          <div key={i} style={{
            marginBottom: 8, padding: '10px 14px', borderRadius: 10,
            background: col.bg, border: `1px solid ${col.border}`,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {group.category}
            </p>
            <p style={{ fontSize: 13, color: col.text }}>{group.words.join(' · ')}</p>
          </div>
        )
      })}

      {/* Word grid */}
      {!done && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}
            className={shake ? 'shake-animation' : ''}>
            {words.map(word => (
              <button
                key={word}
                onClick={() => toggleWord(word)}
                style={{
                  padding: '10px 4px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: selected.includes(word) ? '#0F6E56' : 'white',
                  color: selected.includes(word) ? 'white' : '#111827',
                  border: `2px solid ${selected.includes(word) ? '#0F6E56' : '#E5E7EB'}`,
                }}
              >
                {word}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setSelected([])}
              className="flex-1 py-2 border border-primary-border text-ink-2 rounded-lg text-sm hover:bg-primary-surface transition-colors"
            >
              Clear
            </button>
            <button
              disabled={selected.length !== 4}
              onClick={submitGroup}
              className="flex-1 py-2 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
            >
              Submit ({selected.length}/4)
            </button>
          </div>
        </>
      )}

      {done && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: mistakes < maxMistakes ? '#065F46' : '#991B1B' }}>
          <p style={{ fontSize: 15, fontWeight: 600 }}>
            {mistakes < maxMistakes ? '🎉 Solved!' : '😅 Better luck tomorrow!'}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {mistakes} mistake{mistakes !== 1 ? 's' : ''} — Score: {Math.max(0, (maxMistakes - mistakes) * 25)}
          </p>
        </div>
      )}

      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} } .shake-animation{animation:shake 0.5s ease}`}</style>
    </div>
  )
}
