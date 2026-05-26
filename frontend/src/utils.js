export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function trackFeature(email, featureName) {
  if (!email || !featureName) return
  fetch(`${API_URL}/api/feature-usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recruiter_email: email, feature_name: featureName }),
  }).catch(() => {})
}

export function safeJsonParse(str, fallback = null) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

export function loadHistory() {
  try { return JSON.parse(localStorage.getItem('resumeai_history') || '[]') }
  catch { return [] }
}

export function saveToHistory(entry) {
  const prev = loadHistory()
  const deduped = prev.filter(h => h.jdText.slice(0, 200) !== entry.jdText.slice(0, 200))
  const updated = [entry, ...deduped].slice(0, 5)
  localStorage.setItem('resumeai_history', JSON.stringify(updated))
  return updated
}

export function formatExp(months) {
  if (months == null || months === 0) return '—'
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}m`
  if (m === 0) return `${y}y`
  return `${y}y ${m}m`
}

export function fmtExpDisplay(displayStr, yearsFloat, months) {
  if (displayStr) return displayStr
  if (yearsFloat != null) return `${yearsFloat} yrs`
  return formatExp(months)
}

export function scoreColor(score) {
  if (score >= 80) return { ring: '#0F6E56', text: 'text-primary', bg: 'bg-primary-surface' }
  if (score >= 60) return { ring: '#854F0B', text: 'text-warn', bg: 'bg-warn-bg' }
  return { ring: '#A32D2D', text: 'text-danger', bg: 'bg-danger-bg' }
}

export function formatDate(s) {
  if (!s || s === 'present') return 'Present'
  if (/^\d{4}$/.test(s)) return s
  const [y, m] = s.split('-')
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${MON[parseInt(m, 10) - 1] || m} ${y}`
}

export function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

export function timeAgo(endStr) {
  if (!endStr || endStr === 'present') return null
  let year, month
  if (/^\d{4}-\d{2}$/.test(endStr)) { [year, month] = endStr.split('-').map(Number) }
  else if (/^\d{4}$/.test(endStr)) { year = parseInt(endStr, 10); month = 6 }
  else return null
  const now = new Date()
  const diff = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month)
  if (diff < 1) return 'Less than a month ago'
  const y = Math.floor(diff / 12), m = diff % 12
  const parts = []
  if (y > 0) parts.push(`${y} year${y !== 1 ? 's' : ''}`)
  if (m > 0) parts.push(`${m} month${m !== 1 ? 's' : ''}`)
  return `Left ${parts.join(' ')} ago`
}

export const TODAY = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const EDU_ORDER = ['10th', '12th', 'Diploma', 'BSc/BA/BCom', 'BE/BTech', 'PG/MBA/MSc', 'PhD']
export const EDU_EXPECTED_AGE = {
  '10th':        { label: '10th Grade',                     age: 16 },
  '12th':        { label: '12th / Intermediate',            age: 18 },
  'Diploma':     { label: 'Diploma',                        age: 20 },
  'BSc/BA/BCom': { label: "Bachelor's (Arts/Sci/Commerce)", age: 21 },
  'BE/BTech':    { label: 'BE / BTech',                     age: 22 },
  'PG/MBA/MSc':  { label: 'PG / MBA / MSc',                 age: 24 },
  'PhD':         { label: 'PhD',                            age: 28 },
}

export function isMismatch(candidateLevel, requiredLevel) {
  if (!requiredLevel || !candidateLevel) return false
  return EDU_ORDER.indexOf(candidateLevel) < EDU_ORDER.indexOf(requiredLevel)
}

export function buildEduTimeline(c) {
  const levelIdx = EDU_ORDER.indexOf(c.education_level)
  if (levelIdx < 0) return []
  const toShow = levelIdx <= 1 ? EDU_ORDER.slice(0, levelIdx + 1) : ['10th', '12th', EDU_ORDER[levelIdx]]
  return toShow.map(level => {
    const meta = EDU_EXPECTED_AGE[level]
    const expected = c.birth_year ? c.birth_year + meta.age : null
    const isTop = level === c.education_level
    const actual = isTop ? c.education_year : null
    const variance = expected && actual ? actual - expected : null
    return { label: meta.label, expected, actual, variance }
  })
}

let _confettiLoading = false

export function fireShortlistConfetti() {
  const fire = () => {
    const opts = { particleCount: 60, spread: 70, colors: ['#0F6E56', '#1D9E75', '#E1F5EE', '#ffffff'], origin: { y: 0.6 } }
    window.confetti(opts)
    setTimeout(() => window.confetti(opts), 300)
  }
  if (window.confetti) { fire(); return }
  if (_confettiLoading) return
  _confettiLoading = true
  const s = document.createElement('script')
  s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js'
  s.onload = () => { _confettiLoading = false; fire() }
  document.head.appendChild(s)
}
