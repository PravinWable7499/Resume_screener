import { useState, useEffect, useRef } from 'react'
import { scoreColor } from '../../utils.js'

export function ScoreRing({ score, size = 82 }) {
  const sw = 7, r = (size - sw) / 2, circ = 2 * Math.PI * r
  const fill = (score / 100) * circ, cx = size / 2
  const col = scoreColor(score).ring
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={cx} cy={cx} r={r} stroke="#e0f0ec" strokeWidth={sw} fill="none" />
      <circle cx={cx} cy={cx} r={r} stroke={col} strokeWidth={sw} fill="none"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={cx} y={cx - 4} textAnchor="middle" dominantBaseline="central"
        fontSize={size / 4.2} fontWeight="500" fill={col}>{score}</text>
      <text x={cx} y={cx + size / 6} textAnchor="middle" dominantBaseline="central"
        fontSize={size / 8.5} fill="#888780">/100</text>
    </svg>
  )
}

export function AnimatedScoreRing({ score, size = 82 }) {
  const [display, setDisplay] = useState(0)
  const animRef = useRef(null)

  useEffect(() => {
    const duration = 1200
    const start = performance.now()
    const easeOut = t => 1 - Math.pow(1 - t, 3)
    const tick = now => {
      const t = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(easeOut(t) * score))
      if (t < 1) animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [score])

  const sw = 7, r = (size - sw) / 2, circ = 2 * Math.PI * r
  const fill = (display / 100) * circ, cx = size / 2
  const col = scoreColor(display).ring
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={cx} cy={cx} r={r} stroke="#e0f0ec" strokeWidth={sw} fill="none" />
      <circle cx={cx} cy={cx} r={r} stroke={col} strokeWidth={sw} fill="none"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`} />
      <text x={cx} y={cx - 4} textAnchor="middle" dominantBaseline="central"
        fontSize={size / 4.2} fontWeight="500" fill={col}>{display}</text>
      <text x={cx} y={cx + size / 6} textAnchor="middle" dominantBaseline="central"
        fontSize={size / 8.5} fill="#888780">/100</text>
    </svg>
  )
}
