import { useState, useCallback, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

// ─── New component imports ────────────────────────────────────────────────────
import NewLoginScreen from './components/login/LoginScreen.jsx'
import HomeDashboard from './components/home/HomeDashboard.jsx'
import NewProjectsDashboard from './components/projects/ProjectsDashboard.jsx'
import NewAdminDashboard from './components/admin/AdminDashboard.jsx'
import AppHeader from './components/shared/AppHeader.jsx'
import NewStepIndicator from './components/screening/StepIndicator.jsx'
import NewGlobalStyles from './components/shared/GlobalStyles.jsx'
import ActivationPage from './components/activation/ActivationPage.jsx'
import GamesPage from './components/games/GamesPage.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function trackFeature(email, featureName) {
  if (!email || !featureName) return
  fetch(`${API_URL}/api/feature-usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recruiter_email: email, feature_name: featureName }),
  }).catch(() => {})
}

function safeJsonParse(str, fallback = null) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

// ─── History ──────────────────────────────────────────────────────────────────

function loadHistory() {
  try { return JSON.parse(localStorage.getItem('resumeai_history') || '[]') }
  catch { return [] }
}

function saveToHistory(entry) {
  const prev = loadHistory()
  const deduped = prev.filter(h => h.jdText.slice(0, 200) !== entry.jdText.slice(0, 200))
  const updated = [entry, ...deduped].slice(0, 5)
  localStorage.setItem('resumeai_history', JSON.stringify(updated))
  return updated
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatExp(months) {
  if (months == null || months === 0) return '—'
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}m`
  if (m === 0) return `${y}y`
  return `${y}y ${m}m`
}

function fmtExpDisplay(displayStr, yearsFloat, months) {
  if (displayStr) return displayStr
  if (yearsFloat != null) return `${yearsFloat} yrs`
  return formatExp(months)
}

function scoreColor(score) {
  if (score >= 80) return { ring: '#10b981', text: 'text-emerald-700', bg: 'bg-emerald-50' }
  if (score >= 60) return { ring: '#f59e0b', text: 'text-amber-700', bg: 'bg-amber-50' }
  return { ring: '#ef4444', text: 'text-red-600', bg: 'bg-red-50' }
}

function formatDate(s) {
  if (!s || s === 'present') return 'Present'
  if (/^\d{4}$/.test(s)) return s
  const [y, m] = s.split('-')
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${MON[parseInt(m, 10) - 1] || m} ${y}`
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

function timeAgo(endStr) {
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

const TODAY = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const EDU_ORDER = ['10th', '12th', 'Diploma', 'BSc/BA/BCom', 'BE/BTech', 'PG/MBA/MSc', 'PhD']
const EDU_EXPECTED_AGE = {
  '10th':        { label: '10th Grade',                     age: 16 },
  '12th':        { label: '12th / Intermediate',            age: 18 },
  'Diploma':     { label: 'Diploma',                        age: 20 },
  'BSc/BA/BCom': { label: "Bachelor's (Arts/Sci/Commerce)", age: 21 },
  'BE/BTech':    { label: 'BE / BTech',                     age: 22 },
  'PG/MBA/MSc':  { label: 'PG / MBA / MSc',                 age: 24 },
  'PhD':         { label: 'PhD',                            age: 28 },
}

function isMismatch(candidateLevel, requiredLevel) {
  if (!requiredLevel || !candidateLevel) return false
  return EDU_ORDER.indexOf(candidateLevel) < EDU_ORDER.indexOf(requiredLevel)
}

function buildEduTimeline(c) {
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

// ─── Shared UI ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 82 }) {
  const sw = 7, r = (size - sw) / 2, circ = 2 * Math.PI * r
  const fill = (score / 100) * circ, cx = size / 2
  const col = scoreColor(score).ring
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={cx} cy={cx} r={r} stroke="#e5e7eb" strokeWidth={sw} fill="none" />
      <circle cx={cx} cy={cx} r={r} stroke={col} strokeWidth={sw} fill="none"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={cx} y={cx - 4} textAnchor="middle" dominantBaseline="central"
        fontSize={size / 4.2} fontWeight="700" fill={col}>{score}</text>
      <text x={cx} y={cx + size / 6} textAnchor="middle" dominantBaseline="central"
        fontSize={size / 8.5} fill="#9ca3af">/100</text>
    </svg>
  )
}

// ─── CSS Animations ───────────────────────────────────────────────────────────

function GlobalStyles() {
  return (
    <style>{`
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        50%       { box-shadow: 0 0 0 8px rgba(16,185,129,0.4); }
      }
      @keyframes shimmer-bg {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      .rec-proceed-glow { animation: pulse-glow 3s ease-in-out infinite; }
      .strong-fit-shimmer {
        background: linear-gradient(90deg, #10b981 30%, #34d399 50%, #10b981 70%);
        background-size: 200% auto;
        animation: shimmer-bg 4s linear infinite;
        color: white;
        border-color: transparent !important;
      }
    `}</style>
  )
}

// ─── Recommendation Badge ─────────────────────────────────────────────────────

const REC_CFG = {
  proceed:        { label: 'Proceed',        icon: '✓', cls: 'bg-emerald-500 text-white', glow: true  },
  hold:           { label: 'Hold',           icon: '⚠', cls: 'bg-amber-500 text-white',   glow: false },
  do_not_proceed: { label: 'Do Not Proceed', icon: '✕', cls: 'bg-red-500 text-white',     glow: false },
}

function RecBadge({ recommendation, size = 'sm' }) {
  const cfg = REC_CFG[recommendation]
  if (!cfg) return null
  const pad = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-4 py-1.5 text-sm'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold ${pad} ${cfg.cls} ${cfg.glow ? 'rec-proceed-glow' : ''}`}>
      <span>{cfg.icon}</span>{cfg.label}
    </span>
  )
}

// ─── Pipeline Stages ─────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: 'screened',            label: 'Screened',    color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  { key: 'submitted',           label: 'Submitted',   color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'interview_scheduled', label: 'Interviewed', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { key: 'offer_made',          label: 'Offer Made',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { key: 'joined',              label: 'Joined',      color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
]

const PIPELINE_STAGE_BADGE = {
  submitted:            { label: '→ Submitted',   color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  interview_scheduled:  { label: '→ Interviewed', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  offer_made:           { label: '→ Offered',     color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  joined:               { label: '🎉 Placed',     color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  dropped:              { label: '↘ Dropped',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}

// ─── Feedback Modal ───────────────────────────────────────────────────────────

const FEEDBACK_OPTIONS = {
  shortlisted: [
    { value: 'strong_match',  label: 'Strong skills + experience match' },
    { value: 'client_fit',    label: 'Good culture or company fit' },
    { value: 'top_scorer',    label: 'Top scorer in this batch' },
    { value: 'other',         label: 'Other reason' },
  ],
  on_hold: [
    { value: 'needs_review',  label: 'Needs further review' },
    { value: 'partial_match', label: 'Partially meets requirements' },
    { value: 'awaiting_info', label: 'Awaiting more information' },
    { value: 'other',         label: 'Other reason' },
  ],
  rejected: [
    { value: 'underqualified', label: 'Underqualified — experience gap' },
    { value: 'skill_mismatch', label: 'Key skills missing' },
    { value: 'location',       label: 'Location / relocation concern' },
    { value: 'salary',         label: 'Salary expectations too high' },
    { value: 'other',          label: 'Other reason' },
  ],
  dropped: [
    { value: 'not_interested', label: 'Candidate not interested' },
    { value: 'unresponsive',   label: 'Not responding to outreach' },
    { value: 'accepted_other', label: 'Accepted another offer' },
    { value: 'other',          label: 'Other reason' },
  ],
  joined: [
    { value: 'smooth_onboarding', label: 'Smooth onboarding' },
    { value: 'client_happy',      label: 'Client is happy with placement' },
    { value: 'other',             label: 'Good placement overall' },
  ],
}

function FeedbackModal({ candidateName, action, onSubmit, onSkip }) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const options = FEEDBACK_OPTIONS[action] || []
  const actionLabel = {
    shortlisted: 'Shortlisting', on_hold: 'Holding', rejected: 'Rejecting',
    dropped: 'Dropping', joined: 'Marking as Joined',
  }[action] || action

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onSkip}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4 rounded-t-2xl" style={{ background: '#0F6E56' }}>
          <h3 className="font-bold text-white text-sm">{actionLabel}: {candidateName}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Quick feedback helps improve AI scoring</p>
        </div>
        <div className="p-5 space-y-2">
          <p className="text-xs font-semibold text-gray-600 mb-2">Why are you {actionLabel.toLowerCase()} this candidate?</p>
          {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="feedback_reason" value={opt.value} checked={reason === opt.value}
                onChange={() => setReason(opt.value)} className="w-4 h-4 cursor-pointer accent-green-700" />
              <span className={`text-sm ${reason === opt.value ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{opt.label}</span>
            </label>
          ))}
          {reason && (
            <textarea value={detail} onChange={e => setDetail(e.target.value)}
              placeholder="Any additional notes? (optional)" rows={2} maxLength={200}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200 mt-2" />
          )}
        </div>
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Skip for now</button>
          <button disabled={!reason} onClick={() => reason && onSubmit({ reason, detail })}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: reason ? '#0F6E56' : '#6B7280' }}>
            Submit &amp; Continue
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pro Tip ──────────────────────────────────────────────────────────────────

function ProTip({ tipId, text }) {
  const seen = (() => { try { return JSON.parse(localStorage.getItem('resumeai_tips_seen') || '[]') } catch { return [] } })()
  const [visible, setVisible] = useState(!seen.includes(tipId))
  if (!visible) return null
  const dismiss = () => {
    setVisible(false)
    try {
      const prev = JSON.parse(localStorage.getItem('resumeai_tips_seen') || '[]')
      if (!prev.includes(tipId)) localStorage.setItem('resumeai_tips_seen', JSON.stringify([...prev, tipId]))
    } catch {}
  }
  return (
    <div style={{ borderLeft: '3px solid #0F6E56', background: '#F0FDF8', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
      <p style={{ fontSize: 12, color: '#065F46', lineHeight: 1.5, flex: 1 }}>{text}</p>
      <button onClick={dismiss} style={{ fontSize: 11, color: '#059669', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>Got it ✓</button>
    </div>
  )
}

function PipelineTrack({ stage = 'screened', candidateId, onPipelineChange }) {
  const isDropped  = stage === 'dropped'
  const isJoined   = stage === 'joined'
  const currentIdx = PIPELINE_STAGES.findIndex(s => s.key === stage)
  const nextStage  = (!isDropped && !isJoined && currentIdx >= 0) ? PIPELINE_STAGES[currentIdx + 1] : null

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
      <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3">Pipeline Progress</p>

      {/* Sequential progress track */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
        {PIPELINE_STAGES.map((s, i) => {
          const isPast    = !isDropped && i < currentIdx
          const isCurrent = !isDropped && i === currentIdx
          const dotColor  = isCurrent ? s.color : isPast ? s.color : '#E5E7EB'
          const lineColor = (isPast && i < PIPELINE_STAGES.length - 1) ? s.color : '#E5E7EB'
          return (
            <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i < PIPELINE_STAGES.length - 1 && (
                <div style={{ position: 'absolute', left: '50%', right: '-50%', top: 10, height: 2, background: lineColor, zIndex: 0 }} />
              )}
              <div style={{
                width: 22, height: 22, borderRadius: '50%', zIndex: 1, position: 'relative',
                background: isCurrent ? s.color : isPast ? s.color : 'white',
                border: `2px solid ${dotColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: isCurrent || isPast ? 'white' : '#D1D5DB', fontWeight: 700,
              }}>
                {isPast ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 9, marginTop: 4, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? s.color : isPast ? '#6B7280' : '#C4C4C4', textAlign: 'center', lineHeight: 1.2 }}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Action area */}
      {isDropped ? (
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: '1.5px solid #FECACA', background: '#FEF2F2' }}>
            ↘ Dropped
          </span>
          <button onClick={() => onPipelineChange?.(candidateId, 'screened')}
            style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            ↩ Restore to Screened
          </button>
        </div>
      ) : isJoined ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#059669', fontWeight: 700, padding: '6px 16px', borderRadius: 20, border: '1.5px solid #A7F3D0', background: '#ECFDF5' }}>
            🎉 Placed!
          </span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>No further stages</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {nextStage && (
            <button onClick={() => onPipelineChange?.(candidateId, nextStage.key)}
              style={{
                fontSize: 13, padding: '7px 18px', borderRadius: 10,
                background: nextStage.color, color: 'white', border: 'none',
                cursor: 'pointer', fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              }}>
              → Move to {nextStage.label}
            </button>
          )}
          <button onClick={() => onPipelineChange?.(candidateId, 'dropped')}
            style={{
              fontSize: 12, padding: '6px 14px', borderRadius: 10,
              background: 'white', color: '#DC2626', border: '1.5px solid #FECACA',
              cursor: 'pointer', fontWeight: 600,
            }}>
            ↘ Drop
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

let _confettiLoading = false

function fireShortlistConfetti() {
  const fire = () => {
    const opts = { particleCount: 60, spread: 70, colors: ['#22c55e', '#16a34a', '#bbf7d0', '#ffffff'], origin: { y: 0.6 } }
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

// ─── Animated Score Ring ──────────────────────────────────────────────────────

function AnimatedScoreRing({ score, size = 82 }) {
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
      <circle cx={cx} cy={cx} r={r} stroke="#e5e7eb" strokeWidth={sw} fill="none" />
      <circle cx={cx} cy={cx} r={r} stroke={col} strokeWidth={sw} fill="none"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`} />
      <text x={cx} y={cx - 4} textAnchor="middle" dominantBaseline="central"
        fontSize={size / 4.2} fontWeight="700" fill={col}>{display}</text>
      <text x={cx} y={cx + size / 6} textAnchor="middle" dominantBaseline="central"
        fontSize={size / 8.5} fill="#9ca3af">/100</text>
    </svg>
  )
}

function Tag({ children, variant = 'match' }) {
  const cls = {
    match:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
    missing: 'bg-red-50 text-red-600 border border-red-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    neutral: 'bg-gray-100 text-gray-500 border border-gray-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls[variant]}`}>
      {children}
    </span>
  )
}

function Spinner({ className = 'w-5 h-5' }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ['JD Input', 'Clarify', 'Keywords', 'Upload', 'Results', 'Compare']

function StepIndicator({ step, maxStep, onStepClick }) {
  return (
    <div className="flex items-center justify-center gap-0 py-3">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        const reachable = n <= maxStep
        return (
          <div key={n} className="flex items-center">
            <button
              onClick={() => reachable && onStepClick(n)}
              disabled={!reachable}
              className="flex flex-col items-center gap-0.5 group"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                transition-all duration-200
                ${active  ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                  done    ? 'bg-indigo-500 text-white' :
                  reachable ? 'bg-gray-200 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600 cursor-pointer' :
                  'bg-gray-100 text-gray-300 cursor-default'}`}>
                {done ? '✓' : n}
              </div>
              <span className={`text-[9px] font-medium hidden sm:block whitespace-nowrap
                ${active ? 'text-indigo-600' : done ? 'text-indigo-400' : 'text-gray-400'}`}>
                {label}
              </span>
            </button>
            {i < STEP_LABELS.length - 1 && (
              <div className={`w-8 sm:w-12 h-0.5 mx-1 transition-colors ${n < step ? 'bg-indigo-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ step, maxStep, onStepClick, rightSlot }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-base">ResumeAI</span>
          </div>
          <StepIndicator step={step} maxStep={maxStep} onStepClick={onStepClick} />
          <div className="flex-shrink-0 min-w-[80px] flex justify-end">
            {rightSlot}
          </div>
        </div>
      </div>
    </header>
  )
}

// ─── JD Gaps Panel ────────────────────────────────────────────────────────────

function JdGapsPanel({ gaps }) {
  const [open, setOpen] = useState(true)
  if (gaps == null) return null
  if (gaps.length === 0) return (
    <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-medium">
      <span>✅</span><span>JD looks complete — all key screening fields are present.</span>
    </div>
  )
  const sev = { high: 'bg-red-50 border-red-200 text-red-800', medium: 'bg-amber-50 border-amber-200 text-amber-800', low: 'bg-gray-50 border-gray-200 text-gray-700' }
  const icon = { high: '🔴', medium: '🟡', low: '⚪' }
  const labelMap = {
    experience_range: 'Experience Range', location: 'Location', work_type: 'Work Type',
    salary: 'Salary Range', tech_stack: 'Tech Stack', industry: 'Industry',
    team_size: 'Team Size', reporting: 'Reporting Structure',
  }
  return (
    <div className="mb-6 border border-amber-200 rounded-xl overflow-hidden shadow-sm">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-amber-50 hover:bg-amber-100 transition-colors">
        <span className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          ⚠️ JD Quality Check — {gaps.length} field{gaps.length !== 1 ? 's' : ''} missing or unclear
        </span>
        <span className="text-amber-600 text-xs">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>
      {open && (
        <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {gaps.map((g, i) => (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${sev[g.severity] || sev.low}`}>
              <span className="flex-shrink-0 mt-px">{icon[g.severity] || '⚪'}</span>
              <div><p className="font-semibold">{labelMap[g.field] || g.field}</p>
                <p className="mt-0.5 opacity-80 leading-relaxed">{g.note}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Company Fit Section ──────────────────────────────────────────────────────

const TIER_LABEL = { 1: 'Tier 1 — Large (500+)', 2: 'Tier 2 — Mid-size (200–499)', 3: 'Tier 3 — Small (<200)' }
const TIER_COLOR = { 1: 'bg-indigo-50 text-indigo-700 border-indigo-200', 2: 'bg-amber-50 text-amber-700 border-amber-200', 3: 'bg-gray-100 text-gray-600 border-gray-200' }

const VERDICT_CFG = {
  strong_fit:  { label: 'Strong Fit',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'bg-emerald-400' },
  partial_fit: { label: 'Partial Fit', cls: 'bg-amber-100 text-amber-700 border-amber-200',       bar: 'bg-amber-400'   },
  weak_fit:    { label: 'Weak Fit',    cls: 'bg-amber-100 text-amber-700 border-amber-200',       bar: 'bg-amber-400'   },
  mismatch:    { label: 'Mismatch',    cls: 'bg-red-100 text-red-600 border-red-200',             bar: 'bg-red-400'     },
}

function CompanyFitSection({ companyFit, clientCompany, hideHeader = false }) {
  const fitScore = companyFit?.company_fit_score ?? null
  const [barWidth, setBarWidth] = useState(0)
  useEffect(() => {
    if (fitScore == null) return
    const t = setTimeout(() => setBarWidth(fitScore * 10), 50)
    return () => clearTimeout(t)
  }, [fitScore])

  if (!companyFit) return null
  const { candidate_current_company, candidate_company_employees, candidate_company_size_estimate,
    candidate_company_tier, candidate_company_industry, client_company_employees, client_company_tier,
    client_company_industry, tier_gap, mismatch_flag, company_fit_score,
    company_fit_verdict, company_fit_explanation, company_size_gap_warning } = companyFit
  const hasClient = client_company_tier != null
  const verdictCfg = VERDICT_CFG[company_fit_verdict]
  const scoreColor = company_fit_score >= 7 ? 'text-emerald-600' : company_fit_score >= 5 ? 'text-amber-600' : 'text-red-500'
  const barColor = company_fit_score >= 7 ? 'bg-emerald-400' : company_fit_score >= 5 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div>
      {!hideHeader && <h4 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-3">Company Fit</h4>}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
        {/* Verdict badge + score */}
        {(verdictCfg || company_fit_score != null) && (
          <div className="flex items-center gap-2 flex-wrap">
            {verdictCfg && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${company_fit_verdict === 'strong_fit' ? 'strong-fit-shimmer' : `border ${verdictCfg.cls}`}`}>
                {company_fit_verdict === 'strong_fit' && <span className="mr-1">★</span>}
                {verdictCfg.label}
                {company_fit_verdict === 'strong_fit' && <span className="ml-1">★</span>}
              </span>
            )}
            {company_fit_score != null && (
              <span className={`text-sm font-bold ${scoreColor}`}>{company_fit_score}/10</span>
            )}
          </div>
        )}
        {/* Score bar */}
        {company_fit_score != null && (
          <div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ease-out ${verdictCfg ? verdictCfg.bar : barColor}`}
                style={{ width: `${barWidth}%` }} />
            </div>
          </div>
        )}
        {/* Explanation */}
        {company_fit_explanation && (
          <p className="text-xs text-gray-500 leading-relaxed">{company_fit_explanation}</p>
        )}
        {(verdictCfg || company_fit_score != null || company_fit_explanation) && (
          <div className="border-t border-gray-200 pt-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Size Reference</p>
          </div>
        )}
        {/* Tier cards */}
        <div className={`grid gap-3 ${hasClient ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="bg-white border border-gray-100 rounded-lg p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Candidate's Company</p>
            <p className="font-semibold text-gray-800 text-sm">{candidate_current_company || '—'}</p>
            {(candidate_company_size_estimate || candidate_company_employees != null) && (
              <p className="text-xs text-gray-500 mt-0.5">
                {candidate_company_size_estimate || `~${candidate_company_employees.toLocaleString()} employees`}
              </p>
            )}
            {candidate_company_tier && <span className={`mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold border ${TIER_COLOR[candidate_company_tier]}`}>{TIER_LABEL[candidate_company_tier]}</span>}
            {candidate_company_industry && <p className="text-xs text-gray-400 mt-1">{candidate_company_industry}</p>}
          </div>
          {hasClient && (
            <div className="bg-white border border-gray-100 rounded-lg p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Client Company</p>
              <p className="font-semibold text-gray-800 text-sm">{clientCompany || '—'}</p>
              {client_company_employees != null && <p className="text-xs text-gray-500 mt-0.5">~{client_company_employees.toLocaleString()} employees</p>}
              {client_company_tier && <span className={`mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold border ${TIER_COLOR[client_company_tier]}`}>{TIER_LABEL[client_company_tier]}</span>}
              {client_company_industry && <p className="text-xs text-gray-400 mt-1">{client_company_industry}</p>}
            </div>
          )}
        </div>
        {mismatch_flag ? (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <span className="flex-shrink-0 mt-0.5">🟡</span><span className="leading-relaxed">{mismatch_flag}</span>
          </div>
        ) : hasClient && tier_gap === 0 ? (
          <p className="text-xs text-emerald-600 font-medium">✓ Same company tier — strong cultural alignment expected</p>
        ) : null}
        {company_size_gap_warning && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <span className="flex-shrink-0 mt-0.5">⚠️</span><span className="leading-relaxed">{company_size_gap_warning}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Scorecard Modal ──────────────────────────────────────────────────────────

const ACCORDION_KEYS = ['career', 'gaps', 'education', 'skills', 'summary', 'remark', 'strengths', 'companyFit', 'clientHistory', 'notes', 'seen-before']

function ScorecardModal({ candidate, clientCompany, cannotProcess = false, screeningContext, onClose, onStatusChange, onPipelineChange, onCallGuide, onAskAI, onCommentChange, onRemarkChange, onWhatsApp }) {
  if (!candidate) return null
  const contentRef      = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef  = useRef([])
  const speechRef       = useRef(null)
  const [pdfLoading, setPdfLoading]           = useState(false)
  const [openSections, setOpenSections]       = useState({})
  const [showPipeline, setShowPipeline]       = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showHoldRemoveConfirm, setShowHoldRemoveConfirm] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm]         = useState(false)
  const [removeToast, setRemoveToast]         = useState(null)
  const [remarkText, setRemarkText]       = useState(candidate?.remark || '')
  const [remarkLoading, setRemarkLoading] = useState(false)
  const [remarkSaving, setRemarkSaving]   = useState(false)
  const [remarkSaved, setRemarkSaved]     = useState(false)
  const [remarkError, setRemarkError]     = useState(null)
  const [linkedinUrl, setLinkedinUrl]     = useState(candidate?.linkedin_url || '')
  const [linkedinText, setLinkedinText]   = useState(candidate?.linkedin_text || '')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [isRecording, setIsRecording]     = useState(false)
  const [audioUrl, setAudioUrl]           = useState(null)
  const [linkedinUrlError, setLinkedinUrlError]   = useState(null)
  const [linkedinTextError, setLinkedinTextError] = useState(null)
  const [linkedinDataExpanded, setLinkedinDataExpanded] = useState(false)
  const [linkedinInputMode, setLinkedinInputMode] = useState('paste')
  const [linkedinPdfLoading, setLinkedinPdfLoading] = useState(false)
  const [linkedinPdfStatus, setLinkedinPdfStatus] = useState(null)
  const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition
  const speechSupported = !!SpeechAPI

  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  const downloadPDF = async () => {
    if (!contentRef.current) return
    setPdfLoading(true)
    const saved = { ...openSections }
    // Expand all sections for full capture
    setOpenSections(Object.fromEntries(ACCORDION_KEYS.map(k => [k, true])))
    await new Promise(r => setTimeout(r, 280))
    try {
      const el = contentRef.current
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: el.scrollWidth, windowHeight: el.scrollHeight })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight()
      const imgH = (canvas.height * pageW) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgH)
      let rem = imgH - pageH, pg = 1
      while (rem > 0) { pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, -(pg * pageH), pageW, imgH); rem -= pageH; pg++ }
      pdf.save(`${(candidate.candidate_name || 'candidate').replace(/[^a-z0-9]/gi, '_')}_Scorecard.pdf`)
    } finally {
      setOpenSections(saved)
      setPdfLoading(false)
    }
  }

  const uploadLinkedinPdf = async (file) => {
    setLinkedinPdfLoading(true)
    setLinkedinPdfStatus(null)
    setLinkedinTextError(null)
    const form = new FormData()
    form.append('linkedin_pdf', file)
    try {
      const res = await fetch(`${API_URL}/api/candidates/${candidate.id}/parse-linkedin-pdf`, {
        method: 'POST', body: form,
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLinkedinText(data.linkedin_text)
      setLinkedinPdfStatus('success')
    } catch {
      setLinkedinPdfStatus('error')
    } finally {
      setLinkedinPdfLoading(false)
    }
  }

  const generateRemark = async () => {
    setLinkedinUrlError(null); setLinkedinTextError(null); setRemarkError(null)
    let hasError = false
    if (!linkedinUrl.trim()) { setLinkedinUrlError('LinkedIn URL is required'); hasError = true }
    if (!linkedinText.trim()) { setLinkedinTextError('Please paste the LinkedIn profile text'); hasError = true }
    if (hasError) return
    setRemarkLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/candidates/${candidate.id}/remark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedin_url: linkedinUrl, linkedin_text: linkedinText, voice_transcript: voiceTranscript }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'API error')
      }
      const data = await res.json()
      setRemarkText(data.remark)
    } catch (e) {
      setRemarkError(e.message || 'Could not generate remark. Please try again.')
    } finally {
      setRemarkLoading(false)
    }
  }

  const saveRemark = async () => {
    setRemarkSaving(true)
    try {
      await fetch(`${API_URL}/api/candidates/${candidate.id}/remark`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark: remarkText, linkedin_url: linkedinUrl, linkedin_text: linkedinText }),
      })
      onRemarkChange?.(candidate.id, { remark: remarkText, linkedin_url: linkedinUrl, linkedin_text: linkedinText })
      setRemarkSaved(true)
      setTimeout(() => setRemarkSaved(false), 2500)
    } catch {
      /* silent */
    } finally {
      setRemarkSaving(false)
    }
  }

  const startRecording = async () => {
    audioChunksRef.current = []
    setAudioUrl(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start()
    } catch { /* mic access denied — transcription still works if supported */ }
    if (speechSupported) {
      const recog = new SpeechAPI()
      recog.continuous = true
      recog.interimResults = false
      recog.lang = 'en-IN'
      recog.onresult = e => {
        let finalTranscript = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' '
        }
        if (finalTranscript.trim()) setVoiceTranscript(prev => prev + finalTranscript)
      }
      recog.start()
      speechRef.current = recog
    }
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    speechRef.current?.stop()
    setIsRecording(false)
  }

  // ── Accordion sub-component ──────────────────────────────────────────────
  const Accordion = ({ id, title, children, show = true }) => {
    if (!show) return null
    const isOpen = openSections[id]
    return (
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <button onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
          <span className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">{title}</span>
          <span className={`text-gray-400 text-[10px] font-bold transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {isOpen && <div className="p-4">{children}</div>}
      </div>
    )
  }

  // ── Screening checklist builder ──────────────────────────────────────────
  const checklist = (() => {
    const items = []

    // Experience Match
    const minExp = screeningContext?.min_experience ? parseInt(screeningContext.min_experience, 10) : null
    const relevantM = candidate.experience_relevant_months || candidate.experience_total_months || 0
    let expStatus, expNote
    if (minExp != null) {
      const meets = relevantM >= minExp * 12
      expStatus = meets ? 'pass' : 'fail'
      expNote = `${fmtExpDisplay(candidate.relevant_experience_display, candidate.relevant_experience_years, relevantM)} relevant — ${meets ? `meets ${minExp}+ yr requirement` : `below required ${minExp} yr`}`
    } else {
      expStatus = relevantM > 0 ? 'pass' : 'warn'
      expNote = `${fmtExpDisplay(candidate.total_experience_display, candidate.total_experience_years, candidate.experience_total_months)} total · ${fmtExpDisplay(candidate.relevant_experience_display, candidate.relevant_experience_years, candidate.experience_relevant_months)} relevant`
    }
    items.push({ label: 'Experience Match', status: expStatus, note: expNote })

    // Skills Match
    const matched = candidate.matched_skills?.length || 0
    const missing = candidate.missing_skills?.length || 0
    const total = matched + missing
    let skillStatus, skillNote
    if (total > 0) {
      const pct = Math.round((matched / total) * 100)
      skillStatus = pct >= 75 ? 'pass' : pct >= 50 ? 'warn' : 'fail'
      skillNote = `${matched}/${total} skills matched`
      if (missing > 0) skillNote += ` — missing: ${candidate.missing_skills.slice(0, 3).join(', ')}${missing > 3 ? ` +${missing - 3}` : ''}`
    } else {
      skillStatus = 'pass'; skillNote = 'All required skills matched'
    }
    items.push({ label: 'Must-Have Skills', status: skillStatus, note: skillNote })

    // Education
    const eduMm = candidate.degree_match === false || isMismatch(candidate.education_level, candidate.jd_required_education)
    let eduStatus, eduNote
    if (candidate.jd_required_education) {
      eduStatus = eduMm ? 'fail' : 'pass'
      eduNote = eduMm
        ? `${candidate.education_level || '—'} — required ${candidate.jd_required_education}`
        : `${candidate.education_level || '—'} — matches requirement`
    } else {
      eduStatus = 'pass'; eduNote = candidate.education_level || 'Education on file'
    }
    items.push({ label: 'Education', status: eduStatus, note: eduNote })

    // Job Hopping
    const hops = candidate.job_hopping_flags?.length || 0
    items.push({
      label: 'Job Hopping',
      status: hops === 0 ? 'pass' : 'warn',
      note: hops === 0 ? 'No job hopping detected'
        : `${hops} role${hops !== 1 ? 's' : ''} flagged — ${candidate.job_hopping_flags.slice(0, 2).join(', ')}`,
    })

    // Career Gaps
    const sigGaps = candidate.career_gaps?.filter(g => g.gap_months > 6) || []
    items.push({
      label: 'Career Gaps',
      status: sigGaps.length === 0 ? 'pass' : 'warn',
      note: sigGaps.length === 0 ? 'No significant gaps detected'
        : `${sigGaps.length} gap${sigGaps.length !== 1 ? 's' : ''} >6m — ${formatDate(sigGaps[0].from)} to ${formatDate(sigGaps[0].to)}`,
    })

    // Company Fit
    const cf = candidate.company_fit
    if (cf) {
      const verdictStatus = {
        strong_fit:  'pass',
        partial_fit: 'warn',
        weak_fit:    'warn',
        mismatch:    'fail',
      }[cf.company_fit_verdict] ?? (cf.company_fit_score != null ? (cf.company_fit_score >= 7 ? 'pass' : 'warn') : 'pass')
      const verdictNote = cf.company_fit_verdict
        ? `${cf.company_fit_verdict.replace(/_/g, ' ')} — ${cf.company_fit_score}/10`
        : cf.mismatch_flag ?? `Fit score ${cf.company_fit_score}/10`
      items.push({ label: 'Company Fit', status: verdictStatus, note: verdictNote })
    }

    // Client Conflict
    const cc = candidate.client_conflict
    if (cc || clientCompany) {
      let ccStatus, ccNote
      if (cc?.is_current_employee) {
        ccStatus = 'fail'; ccNote = `Currently employed at ${cc.matched_company_name || clientCompany} — cannot recruit`
      } else if (cc?.is_ex_employee) {
        ccStatus = 'warn'; ccNote = `Previously at ${cc.matched_company_name || clientCompany} — verify rehire policy`
      } else {
        ccStatus = 'pass'; ccNote = 'No conflict detected'
      }
      items.push({ label: 'Client Conflict', status: ccStatus, note: ccNote })
    }

    // Location
    if (candidate.location_flag) {
      const locStatus = candidate.location_flag === 'green' ? 'pass' : candidate.location_flag === 'red' ? 'fail' : 'warn'
      items.push({ label: 'Location', status: locStatus, note: candidate.location_reason || 'Location assessed' })
    } else if (screeningContext?.work_location) {
      items.push({ label: 'Location', status: 'warn', note: 'Location not assessed — verify with candidate' })
    }

    // Education Timeline anomaly
    if (candidate.education_level && candidate.birth_year) {
      const hasAnomaly = buildEduTimeline(candidate).some(r => r.variance > 2)
      items.push({
        label: 'Education Timeline',
        status: hasAnomaly ? 'warn' : 'pass',
        note: hasAnomaly ? 'Graduation later than expected — review timeline' : 'No timeline anomalies detected',
      })
    }

    return items
  })()

  const statusCfg = {
    pending:     { label: 'Pending',     cls: 'bg-gray-100 text-gray-600' },
    shortlisted: { label: 'Shortlisted', cls: 'bg-emerald-100 text-emerald-700' },
    on_hold:     { label: 'On Hold',     cls: 'bg-amber-100 text-amber-700' },
    rejected:    { label: 'Rejected',    cls: 'bg-red-100 text-red-600' },
  }
  const { status } = candidate

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={contentRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">

        {/* ── Modal header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">Candidate Scorecard</h2>
          <div className="flex items-center gap-2">
            <button onClick={downloadPDF} disabled={pdfLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${pdfLoading ? 'bg-indigo-300 text-white cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
              {pdfLoading ? <><Spinner className="w-3.5 h-3.5" />Generating…</> : <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>Download PDF</>}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xl leading-none">×</button>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* ══ SECTION 1 ═══════════════════════════════════════════════════════ */}

          {/* Cannot Process banner */}
          {cannotProcess && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              <span className="flex-shrink-0 text-lg">🚫</span>
              <div>
                <p className="font-bold text-red-700">Cannot Process This Candidate</p>
                <p className="mt-0.5 text-xs leading-relaxed">
                  Candidate is currently employed at <strong>{clientCompany || candidate.client_conflict?.matched_company_name || 'the client company'}</strong>. Recruiting this candidate is not possible.
                </p>
              </div>
            </div>
          )}

          {/* Identity + Score */}
          <div className="flex items-start gap-5">
            <AnimatedScoreRing score={candidate.score} size={96} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{candidate.candidate_name}</h3>
                  <p className="text-gray-500 mt-0.5 text-sm">{candidate.current_role}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${statusCfg[status]?.cls}`}>{statusCfg[status]?.label}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  { label: 'TOTAL EXP',    val: fmtExpDisplay(candidate.total_experience_display, candidate.total_experience_years, candidate.experience_total_months),    cls: 'bg-gray-50 border-gray-100 text-gray-900' },
                  { label: 'RELEVANT EXP', val: fmtExpDisplay(candidate.relevant_experience_display, candidate.relevant_experience_years, candidate.experience_relevant_months), cls: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
                ].map(p => (
                  <div key={p.label} className={`rounded-lg px-3 py-1.5 text-center border ${p.cls}`}>
                    <p className="text-[10px] text-gray-400 font-semibold tracking-wide">{p.label}</p>
                    <p className="font-bold text-sm">{p.val}</p>
                  </div>
                ))}
                {(() => {
                  const mm = candidate.degree_match === false || isMismatch(candidate.education_level, candidate.jd_required_education)
                  const ok = candidate.degree_match === true && !mm
                  return (
                    <div className={`rounded-lg px-3 py-1.5 text-center border ${mm ? 'bg-red-50 border-red-100' : ok ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                      <p className="text-[10px] text-gray-400 font-semibold tracking-wide">EDUCATION</p>
                      <p className={`font-bold text-sm ${mm ? 'text-red-600' : ok ? 'text-emerald-700' : 'text-gray-700'}`}>
                        {candidate.education_level || '—'}{ok && ' ✓'}{mm && ' ✗'}
                      </p>
                    </div>
                  )
                })()}
                {candidate.company_fit?.company_fit_score != null && (
                  <div className={`rounded-lg px-3 py-1.5 text-center border ${candidate.company_fit.company_fit_score >= 7 ? 'bg-emerald-50 border-emerald-100' : candidate.company_fit.company_fit_score >= 5 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
                    <p className="text-[10px] text-gray-400 font-semibold tracking-wide">CO. FIT</p>
                    <p className={`font-bold text-sm ${candidate.company_fit.company_fit_score >= 7 ? 'text-emerald-700' : candidate.company_fit.company_fit_score >= 5 ? 'text-amber-700' : 'text-red-600'}`}>{candidate.company_fit.company_fit_score}/10</p>
                  </div>
                )}
              </div>
              {candidate.education_detail && <p className="mt-1.5 text-xs text-gray-500">{candidate.education_detail}</p>}
              {(candidate.degree_mismatch_note || (isMismatch(candidate.education_level, candidate.jd_required_education) && candidate.jd_required_education)) && (
                <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  ⚠️ {candidate.degree_mismatch_note || `JD requires ${candidate.jd_required_education} but candidate holds ${candidate.education_level}`}
                </p>
              )}
            </div>
          </div>

          {/* Recommendation banner */}
          {candidate.recommendation && REC_CFG[candidate.recommendation] && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
              <RecBadge recommendation={candidate.recommendation} size="lg" />
              {candidate.recommendation_reason && (
                <p className="text-xs text-gray-600 leading-relaxed mt-1">{candidate.recommendation_reason}</p>
              )}
            </div>
          )}

          {/* Contextual Actions */}
          {!cannotProcess && (() => {
            const pipelineStage = candidate?.pipeline_stage || 'screened'
            if (status === 'pending') return (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {[
                    { s: 'shortlisted', label: 'Shortlist', cls: 'border border-emerald-300 text-emerald-600 hover:bg-emerald-50' },
                    { s: 'on_hold',     label: 'Hold',      cls: 'border border-amber-300 text-amber-600 hover:bg-amber-50' },
                    { s: 'rejected',    label: 'Reject',    cls: 'border border-red-300 text-red-500 hover:bg-red-50' },
                  ].map(({ s, label, cls }) => (
                    <button key={s} onClick={() => onStatusChange(candidate.id, s)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${cls}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={() => onAskAI?.(candidate)}
                  className="w-full py-1.5 rounded-xl text-sm font-medium border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors">
                  Ask AI 💬
                </button>
              </div>
            )
            if (status === 'shortlisted') return (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => onCallGuide?.(candidate)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-colors" style={{ background: '#1D9E75' }}>
                    Call Guide 📋
                  </button>
                  <button onClick={() => onWhatsApp?.(candidate)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-colors" style={{ background: '#25D366' }}>
                    WhatsApp 💬
                  </button>
                  <button onClick={() => onAskAI?.(candidate)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors">
                    Ask AI 🤖
                  </button>
                  <button onClick={() => setShowPipeline(p => !p)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${showPipeline ? 'bg-violet-500 text-white' : 'border border-violet-300 text-violet-600 hover:bg-violet-50'}`}>
                    {showPipeline ? 'Hide Pipeline' : 'Move Pipeline →'}
                  </button>
                </div>
                {showPipeline && (
                  <PipelineTrack stage={pipelineStage} candidateId={candidate.id} onPipelineChange={onPipelineChange} />
                )}
                {!showRemoveConfirm ? (
                  <button onClick={() => setShowRemoveConfirm(true)}
                    style={{ fontSize: 11, color: '#888780', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', display: 'block' }}>
                    ↩ Remove from shortlist
                  </button>
                ) : (
                  <div style={{ fontSize: 12, color: '#6B7280', padding: '8px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                    <p style={{ margin: '0 0 8px' }}>Are you sure? This will move the candidate back to Pending.</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => {
                        onStatusChange(candidate.id, 'pending')
                        onPipelineChange?.(candidate.id, 'screened')
                        setShowRemoveConfirm(false)
                        setShowPipeline(false)
                        setRemoveToast('Removed from shortlist')
                        setTimeout(() => setRemoveToast(null), 2500)
                      }} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        Yes, remove
                      </button>
                      <button onClick={() => setShowRemoveConfirm(false)}
                        style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, background: 'white', color: '#6B7280', border: '1px solid #E5E7EB', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
            if (status === 'on_hold') return (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => { fireShortlistConfetti(); onStatusChange(candidate.id, 'shortlisted') }}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold border border-emerald-300 text-emerald-600 hover:bg-emerald-50 transition-colors">
                    Shortlist
                  </button>
                  <button onClick={() => onStatusChange(candidate.id, 'rejected')}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold border border-red-300 text-red-500 hover:bg-red-50 transition-colors">
                    Reject
                  </button>
                  <button onClick={() => onAskAI?.(candidate)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors">
                    Ask AI 🤖
                  </button>
                </div>
                {!showHoldRemoveConfirm ? (
                  <button onClick={() => setShowHoldRemoveConfirm(true)}
                    style={{ fontSize: 11, color: '#888780', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', textDecoration: 'underline', display: 'block' }}>
                    ↩ Remove hold — move back to Pending
                  </button>
                ) : (
                  <div style={{ padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#374151' }}>Move this candidate back to Pending?</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => {
                        onStatusChange(candidate.id, 'pending')
                        onPipelineChange?.(candidate.id, 'screened')
                        setShowHoldRemoveConfirm(false)
                        setRemoveToast('Moved back to Pending')
                        setTimeout(() => setRemoveToast(null), 2500)
                      }} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #D1FAE5', background: '#ECFDF5', color: '#065F46', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Yes, remove
                      </button>
                      <button onClick={() => setShowHoldRemoveConfirm(false)}
                        style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 12, cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
            if (status === 'rejected') return (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {!showRejectConfirm && (
                    <button onClick={() => setShowRejectConfirm(true)}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold border border-emerald-300 text-emerald-600 hover:bg-emerald-50 transition-colors">
                      ↩ Reconsider
                    </button>
                  )}
                  <button onClick={() => onAskAI?.(candidate)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors">
                    Ask AI 🤖
                  </button>
                </div>
                {showRejectConfirm && (
                  <div style={{ padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#374151' }}>Move this candidate back to Pending for reconsideration?</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => {
                        onStatusChange(candidate.id, 'pending')
                        onPipelineChange?.(candidate.id, 'screened')
                        setShowRejectConfirm(false)
                        setRemoveToast('Moved to Pending')
                        setTimeout(() => setRemoveToast(null), 2500)
                      }} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #D1FAE5', background: '#ECFDF5', color: '#065F46', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Yes, reconsider
                      </button>
                      <button onClick={() => setShowRejectConfirm(false)}
                        style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 12, cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
            return null
          })()}

          <hr className="border-gray-100" />

          {/* ══ SECTION 2 — SCREENING CHECKLIST ════════════════════════════════ */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-3">Screening Checklist</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checklist.map((item, i) => {
                const cfg = {
                  pass: { icon: '✅', bg: 'bg-emerald-50', border: 'border-emerald-100', lbl: 'text-emerald-800', txt: 'text-emerald-700' },
                  fail: { icon: '❌', bg: 'bg-red-50',     border: 'border-red-100',     lbl: 'text-red-800',     txt: 'text-red-600'   },
                  warn: { icon: '⚠️', bg: 'bg-amber-50',  border: 'border-amber-100',   lbl: 'text-amber-900',   txt: 'text-amber-700' },
                }[item.status] || { icon: 'ℹ️', bg: 'bg-gray-50', border: 'border-gray-100', lbl: 'text-gray-700', txt: 'text-gray-500' }
                return (
                  <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                    <span className="text-sm flex-shrink-0 mt-px leading-none">{cfg.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${cfg.lbl}`}>{item.label}</p>
                      <p className={`text-xs mt-0.5 leading-relaxed ${cfg.txt}`}>{item.note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* ══ SECTION 3 — COLLAPSIBLE DETAIL SECTIONS ════════════════════════ */}
          <div className="space-y-2">

            <Accordion id="career" title="Career Timeline" show={candidate.job_history?.length > 0}>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-[11px] text-gray-400 font-semibold uppercase">
                    <th className="text-left px-4 py-2.5">Company</th>
                    <th className="text-left px-4 py-2.5">Role</th>
                    <th className="text-left px-4 py-2.5">Period</th>
                    <th className="text-left px-4 py-2.5">Tenure</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {candidate.job_history?.map((job, i) => (
                      <tr key={i} className={(job.is_job_hop || job.tenure_months < 12) ? 'bg-red-50 border-l-4 border-l-red-400' : 'hover:bg-gray-50/50'}>
                        <td className="px-4 py-2.5 font-medium text-gray-800">{job.company}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{job.role}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{formatDate(job.start)} – {formatDate(job.end)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${(job.is_job_hop || job.tenure_months < 12) ? 'text-red-600' : 'text-gray-700'}`}>
                            {formatExp(job.tenure_months)}
                            {(job.is_job_hop || job.tenure_months < 12) && <span className="ml-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">⚠ Flagged</span>}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {candidate.job_hopping_flags?.length > 0 && (
                <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded-lg flex items-start gap-2">
                  <span>🚩</span><span>Job hopping detected: <strong>{candidate.job_hopping_flags.join(', ')}</strong></span>
                </div>
              )}
            </Accordion>

            <Accordion id="gaps" title="Career Gaps" show={candidate.career_gaps?.length > 0}>
              <div className="space-y-2">
                {candidate.career_gaps?.map((gap, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${gap.gap_months > 6 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
                    <span className="flex-shrink-0 mt-px">{gap.gap_months > 6 ? '⚠️' : 'ℹ️'}</span>
                    <div>
                      <p className={`font-semibold ${gap.gap_months > 6 ? 'text-amber-900' : 'text-gray-700'}`}>
                        {formatDate(gap.from)} → {formatDate(gap.to)}<span className="ml-2 font-normal text-xs opacity-70">{formatExp(gap.gap_months)} gap</span>
                      </p>
                      <p className="text-xs mt-0.5 text-gray-500">{gap.context || <em>No context provided in resume</em>}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Accordion>

            <Accordion id="education" title="Education Timeline" show={!!candidate.education_level}>
              {candidate.birth_year ? (
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 text-[11px] text-gray-400 font-semibold uppercase">
                      <th className="text-left px-4 py-2.5">Milestone</th>
                      <th className="text-left px-4 py-2.5">Expected</th>
                      <th className="text-left px-4 py-2.5">Actual</th>
                      <th className="text-left px-4 py-2.5">Variance</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {buildEduTimeline(candidate).map((row, i) => (
                        <tr key={i} className={row.variance > 2 ? 'bg-amber-50' : ''}>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{row.label}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{row.expected ?? '—'}</td>
                          <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{row.actual ?? '—'}</td>
                          <td className="px-4 py-2.5 text-xs">
                            {row.variance != null
                              ? row.variance > 2 ? <span className="text-amber-600">+{row.variance}y late</span>
                              : row.variance < 0 ? <span className="text-emerald-600">{Math.abs(row.variance)}y early</span>
                              : <span className="text-emerald-600">On track</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {candidate.education_detail && (
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs text-gray-500">{candidate.education_detail}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-2xl">🎓</span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{candidate.education_detail || candidate.education_level}</p>
                    {candidate.education_year
                      ? <p className="text-xs text-gray-400 mt-1">Completed {candidate.education_year} · {new Date().getFullYear() - candidate.education_year} years ago</p>
                      : <p className="text-xs text-gray-400 mt-1">Graduation year not provided</p>}
                  </div>
                </div>
              )}
            </Accordion>

            <Accordion id="skills" title="Skills Match">
              <div className="space-y-2.5">
                {candidate.matched_skills?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-1.5">✓ Matched</p>
                    <div className="flex flex-wrap gap-1.5">{candidate.matched_skills.map(s => <Tag key={s} variant="match">{s}</Tag>)}</div>
                  </div>
                )}
                {candidate.missing_skills?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-500 mb-1.5">✗ Missing</p>
                    <div className="flex flex-wrap gap-1.5">{candidate.missing_skills.map(s => <Tag key={s} variant="missing">{s}</Tag>)}</div>
                  </div>
                )}
              </div>
            </Accordion>

            {candidate.benchmark_match_percent != null && (
              <Accordion id="benchmark" title="Bench Fit">
                <div className="space-y-3">
                  {/* Header: score + verdict */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-3xl font-bold ${candidate.benchmark_match_percent >= 75 ? 'text-teal-600' : candidate.benchmark_match_percent >= 50 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {candidate.benchmark_match_percent}
                      </span>
                      <span className="text-sm text-gray-400 font-medium">%</span>
                    </div>
                    {candidate.benchmark_verdict && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        candidate.benchmark_verdict === 'strong_match' ? 'bg-teal-100 text-teal-700' :
                        candidate.benchmark_verdict === 'good_match'   ? 'bg-indigo-100 text-indigo-700' :
                        candidate.benchmark_verdict === 'partial_match' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {candidate.benchmark_verdict.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${candidate.benchmark_match_percent >= 75 ? 'bg-teal-400' : candidate.benchmark_match_percent >= 50 ? 'bg-amber-400' : 'bg-gray-300'}`}
                      style={{ width: `${candidate.benchmark_match_percent}%` }} />
                  </div>
                  {/* Similarities */}
                  {candidate.benchmark_similarities?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 mb-1.5">✓ Similarities</p>
                      <ul className="space-y-1">
                        {candidate.benchmark_similarities.map((s, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                            <span className="text-emerald-500 flex-shrink-0">•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Differences */}
                  {candidate.benchmark_differences?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 mb-1.5">△ Gaps vs Benchmark</p>
                      <ul className="space-y-1">
                        {candidate.benchmark_differences.map((d, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                            <span className="text-amber-500 flex-shrink-0">•</span>{d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Accordion>
            )}

            <Accordion id="summary" title="AI Summary">
              <p className="text-sm text-gray-700 leading-relaxed">{candidate.summary}</p>
            </Accordion>

            <Accordion id="remark" title="Recruiter Remark">
              {!remarkText ? (
                <div className="space-y-5">

                  {/* ── LinkedIn section ── */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-0.5">
                        LinkedIn Profile <span className="text-red-500">*</span>
                      </p>
                      <p className="text-[11px] text-gray-400">Required to generate remark</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">
                        LinkedIn Profile URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={linkedinUrl}
                        onChange={e => { setLinkedinUrl(e.target.value); setLinkedinUrlError(null) }}
                        placeholder="https://www.linkedin.com/in/candidatename"
                        className={`w-full border rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent placeholder-gray-300 ${linkedinUrlError ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 focus:ring-indigo-300'}`}
                      />
                      {linkedinUrlError && <p className="text-xs text-red-500 mt-1">{linkedinUrlError}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">
                        LinkedIn Profile Text <span className="text-red-500">*</span>
                      </label>
                      <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-2">
                        {[{ id: 'paste', label: 'Paste Text' }, { id: 'pdf', label: 'Upload PDF' }].map(t => (
                          <button key={t.id} onClick={() => { setLinkedinInputMode(t.id); setLinkedinPdfStatus(null) }}
                            className={`flex-1 py-2 text-xs font-semibold transition-colors ${linkedinInputMode === t.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:text-gray-600'}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      {linkedinInputMode === 'paste' ? (
                        <textarea
                          value={linkedinText}
                          onChange={e => { setLinkedinText(e.target.value); setLinkedinTextError(null) }}
                          rows={5}
                          placeholder="Paste the full LinkedIn profile text here — headline, about section, experience, skills, endorsements..."
                          className={`w-full border rounded-xl p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:border-transparent placeholder-gray-300 ${linkedinTextError ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 focus:ring-indigo-300'}`}
                        />
                      ) : (
                        <div className="border border-gray-200 rounded-xl p-4 space-y-2">
                          <p className="text-[11px] text-gray-400 leading-relaxed">
                            Download the candidate's LinkedIn profile as PDF: open their profile → More → Save to PDF → upload here
                          </p>
                          <input type="file" accept=".pdf"
                            onChange={e => { if (e.target.files[0]) uploadLinkedinPdf(e.target.files[0]) }}
                            className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                          {linkedinPdfLoading && (
                            <p className="text-xs text-gray-500 flex items-center gap-1.5"><Spinner className="w-3 h-3" />Extracting profile text…</p>
                          )}
                          {linkedinPdfStatus === 'success' && (
                            <p className="text-xs text-emerald-600 font-medium">✓ LinkedIn profile extracted successfully</p>
                          )}
                          {linkedinPdfStatus === 'error' && (
                            <p className="text-xs text-red-500">Could not read PDF. Please try pasting the profile text instead.</p>
                          )}
                        </div>
                      )}
                      {linkedinTextError && <p className="text-xs text-red-500 mt-1">{linkedinTextError}</p>}
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* ── Voice / call notes section ── */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-0.5">
                        Call Notes <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                      </p>
                      <p className="text-[11px] text-gray-400">Record what you discussed with the candidate</p>
                    </div>
                    <div className="flex flex-col items-center gap-2 py-1">
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                        <span className="text-white text-2xl">{isRecording ? '■' : '🎙'}</span>
                      </button>
                      <p className={`text-xs font-semibold ${isRecording ? 'text-red-500' : 'text-gray-500'}`}>
                        {isRecording ? 'Recording… tap to stop' : 'Tap to record'}
                      </p>
                      {isRecording && (
                        <span className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </span>
                      )}
                    </div>
                    {audioUrl && <audio controls src={audioUrl} className="w-full h-8" />}
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">
                        {speechSupported ? 'Transcribed notes:' : 'Type your call notes here'}
                      </label>
                      <textarea
                        value={voiceTranscript}
                        onChange={e => setVoiceTranscript(e.target.value)}
                        onWheel={e => e.stopPropagation()}
                        placeholder={speechSupported
                          ? 'Transcription will appear here as you speak…'
                          : 'e.g. Confident communicator, open to relocating to Pune, expects 18 LPA, can join in 30 days…'}
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-y min-h-[80px] max-h-[200px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent placeholder-gray-300"
                      />
                    </div>
                  </div>

                  {remarkError && <p className="text-xs text-red-500">{remarkError}</p>}
                  <button onClick={generateRemark} disabled={remarkLoading}
                    className="w-full py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2 transition-colors">
                    {remarkLoading ? <><Spinner className="w-4 h-4" />Generating professional remark…</> : 'Generate Recruiter Remark'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{remarkText}</p>
                    {linkedinUrl && (
                      <p className="text-[11px] text-gray-400 mt-2">
                        LinkedIn: <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                          className="text-indigo-500 underline">{linkedinUrl}</a>
                      </p>
                    )}
                  </div>
                  <textarea
                    value={remarkText}
                    onChange={e => setRemarkText(e.target.value)}
                    rows={5}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  />
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <button onClick={() => setLinkedinDataExpanded(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                      <span className="text-xs font-semibold text-gray-500">LinkedIn data used</span>
                      <span className="text-gray-400 text-[10px]">{linkedinDataExpanded ? '▲' : '▼'}</span>
                    </button>
                    {linkedinDataExpanded && (
                      <div className="p-3 space-y-2 bg-white">
                        <p className="text-xs text-gray-500 break-all">
                          <span className="font-semibold">URL: </span>
                          <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                            className="text-indigo-500 underline">{linkedinUrl}</a>
                        </p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          {linkedinText.slice(0, 300)}{linkedinText.length > 300 ? '…' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setRemarkText(''); setLinkedinDataExpanded(false) }}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                      Edit inputs
                    </button>
                    <button onClick={generateRemark} disabled={remarkLoading}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors">
                      {remarkLoading ? <><Spinner className="w-3.5 h-3.5" />Generating…</> : 'Regenerate'}
                    </button>
                    <button onClick={saveRemark} disabled={remarkSaving}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${remarkSaved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60'}`}>
                      {remarkSaved ? 'Saved ✓' : remarkSaving ? 'Saving…' : 'Save Remark'}
                    </button>
                  </div>
                </div>
              )}
            </Accordion>

            <Accordion id="strengths" title="Strengths & Concerns"
              show={candidate.strengths?.length > 0 || candidate.concerns?.length > 0}>
              <div className="grid grid-cols-2 gap-4">
                {candidate.strengths?.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-emerald-600 tracking-widest uppercase mb-2">Strengths</h4>
                    <ul className="space-y-1.5">
                      {candidate.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {candidate.concerns?.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-red-500 tracking-widest uppercase mb-2">Concerns</h4>
                    <ul className="space-y-1.5">
                      {candidate.concerns.map((c, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Accordion>

            <Accordion id="companyFit" title="Company Fit Details" show={!!candidate.company_fit}>
              <CompanyFitSection companyFit={candidate.company_fit} clientCompany={clientCompany} hideHeader />
            </Accordion>

            <Accordion id="clientHistory" title="Client Company History"
              show={candidate.client_conflict?.is_ex_employee === true && !!candidate.client_conflict?.ex_employee_period}>
              {candidate.client_conflict?.ex_employee_period && (() => {
                const ep = candidate.client_conflict.ex_employee_period
                const ago = timeAgo(ep.end)
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠️</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">{ep.company}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{ep.role}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(ep.start)} – {formatDate(ep.end)}
                          {ep.tenure_months ? <span className="ml-2 text-gray-400">· {formatExp(ep.tenure_months)}</span> : null}
                        </p>
                        {ago && <p className="text-xs text-amber-700 font-semibold mt-1.5">{ago}</p>}
                      </div>
                    </div>
                    <div className="text-xs text-amber-800 leading-relaxed border-t border-amber-200 pt-3">
                      Candidate has previously worked at <strong>{clientCompany || ep.company}</strong>. Verify rehire policy and cooling period with client before proceeding.
                    </div>
                  </div>
                )
              })()}
            </Accordion>

            <Accordion id="notes" title="Recruiter Notes">
              <textarea value={candidate.comments || ''} onChange={e => onCommentChange(candidate.id, e.target.value)}
                placeholder="Add private notes about this candidate…" rows={3}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent placeholder-gray-300" />
            </Accordion>

            <Accordion id="seen-before" title="Seen Before" show={!!candidate.is_duplicate}>
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                <p style={{ color: '#92400e', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  ⚠ This candidate has been screened in other projects
                </p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {(candidate.duplicate_projects || []).map((p, i) => (
                    <li key={i} style={{ color: '#78350f', fontSize: 13 }}>{p.project_name}</li>
                  ))}
                </ul>
              </div>
            </Accordion>

          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
            <span>Screened by: ResumeAI · {candidate.filename}</span>
            <span>Date: {TODAY}</span>
          </div>

        </div>
      </div>
      {removeToast && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: '#1a1a1a', color: 'white', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          ✓ {removeToast}
        </div>
      )}
    </div>
  )
}

// ─── Call Guide ───────────────────────────────────────────────────────────────

function CallGuide({ candidate, jdText, answers, clientCompany, onBack }) {
  const [techQuestions, setTechQuestions] = useState(null)
  const [techLoading, setTechLoading] = useState(true)
  const [techError, setTechError] = useState(null)

  const fetchTechQuestions = useCallback(async () => {
    setTechLoading(true); setTechError(null)
    try {
      const res = await fetch(`${API_URL}/api/call-guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jdText || '', candidate_json: candidate }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setTechQuestions(data.technical_questions || [])
    } catch {
      setTechError('Could not generate technical questions. Please try again.')
    } finally {
      setTechLoading(false)
    }
  }, [jdText, candidate])

  useEffect(() => { fetchTechQuestions() }, [fetchTechQuestions])

  // ── Smart triggers ────────────────────────────────────────────────────────
  const triggers = []
  const loc = candidate.location_flag
  if ((loc === 'amber' || loc === 'red') && answers.work_location) {
    triggers.push({
      type: 'location',
      label: `Location mismatch — candidate is in ${candidate.candidate_location || 'unknown location'}, role is in ${answers.work_location}`,
      questions: [
        `Are you open to relocating to ${answers.work_location}?`,
        'What is your reason for wanting to relocate?',
        'Do you have any family or personal constraints that may affect relocation?',
      ],
    })
  }
  if (candidate.job_hopping_flags?.length > 0) {
    triggers.push({
      type: 'hopping',
      label: 'Job hopping flagged — verify stability intent',
      questions: [
        'You have changed companies frequently — can you walk me through your reasons for each move?',
        'What is the minimum tenure you are willing to commit to in this role?',
      ],
    })
  }
  const minExpM = answers.min_experience ? parseInt(answers.min_experience, 10) * 12 : null
  const relM = candidate.experience_relevant_months || 0
  if (minExpM && relM < minExpM * 0.75) {
    const keySkill = candidate.missing_skills?.[0] || answers.must_have_skills?.split(',')[0]?.trim() || 'the required skills'
    triggers.push({
      type: 'experience',
      label: 'Experience gap detected — verify depth of relevant experience',
      questions: [
        `How many years of hands-on experience do you have specifically in ${keySkill}?`,
        `Have you worked with ${keySkill} before? Walk me through a specific project where you used it.`,
      ],
    })
  }

  // ── Copy all ──────────────────────────────────────────────────────────────
  const copyAll = () => {
    const lines = [
      `CALL GUIDE — ${candidate.candidate_name}`,
      `Score: ${candidate.score}/100 | Date: ${TODAY}`,
      '',
      '═══ STANDARD QUESTIONS ═══',
      ...HYGIENE_QUESTIONS.map((q, i) => `${i + 1}. ${q}`),
    ]
    if (triggers.length > 0) {
      lines.push('', '═══ SITUATION-SPECIFIC QUESTIONS ═══')
      triggers.forEach(t => {
        lines.push(`[${t.label}]`)
        t.questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`))
        lines.push('')
      })
    }
    if (techQuestions?.length > 0) {
      lines.push('═══ TECHNICAL QUESTIONS ═══')
      techQuestions.forEach((q, i) => {
        lines.push(`${i + 1}. ${q.question}${q.must_ask ? ' ★ MUST ASK' : ''}`)
        lines.push(`   What to listen for: ${q.what_to_listen_for}`)
        lines.push('')
      })
    }
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {})
  }

  const col = scoreColor(candidate.score)

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <style>{`
        @media print {
          .cg-no-print { display: none !important; }
          .cg-print-header { display: block !important; }
        }
        .cg-print-header { display: none; }
      `}</style>

      {/* Sticky nav header */}
      <div className="cg-no-print sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-3 flex items-center justify-between gap-4">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0">
          ← Back to results
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-bold text-gray-900 text-base">Call Guide</h1>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${col.bg} ${col.text}`}>
            {candidate.score}/100
          </span>
          <span className="text-sm text-gray-500 truncate hidden sm:block">{candidate.candidate_name}</span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={copyAll}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            Copy all
          </button>
          <button onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            Print
          </button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="cg-print-header px-8 py-6 border-b border-gray-300">
        <h1 className="text-2xl font-bold text-gray-900">Call Guide — {candidate.candidate_name}</h1>
        <p className="text-sm text-gray-500 mt-1">Score: {candidate.score}/100 | Date: {TODAY}{clientCompany ? ` | Client: ${clientCompany}` : ''}</p>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">

        <ProTip tipId="call_guide_ctc" text="💡 Pro tip: Always start with CTC questions — it saves time if there is a budget mismatch. Ask current CTC before expected CTC." />

        {/* Section A — Standard questions */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Standard Questions</h2>
            <p className="text-sm text-gray-400 mt-0.5">Ask these on every call</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
            <ol className="space-y-3">
              {HYGIENE_QUESTIONS.map((q, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="leading-relaxed">{q}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Section B — Smart trigger questions */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Situation-Specific Questions</h2>
            <p className="text-sm text-gray-400 mt-0.5">Ask only if applicable to this candidate</p>
          </div>
          {triggers.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-medium">
              <span className="text-lg">✅</span>
              <span>No specific concerns flagged — standard questions should be sufficient</span>
            </div>
          ) : (
            <div className="space-y-4">
              {triggers.map((t, ti) => (
                <div key={ti} className="border-l-4 border-amber-400 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">⚠ {t.label}</p>
                  <ol className="space-y-2">
                    {t.questions.map((q, qi) => (
                      <li key={qi} className="flex gap-3 text-sm text-gray-700">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center mt-0.5">{qi + 1}</span>
                        <span className="leading-relaxed">{q}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section C — Technical questions */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Technical Questions</h2>
            <p className="text-sm text-gray-400 mt-0.5">Role-specific — generated from JD and candidate profile</p>
          </div>
          {techLoading && (
            <div className="flex items-center gap-3 p-6 bg-gray-50 border border-gray-100 rounded-2xl">
              <Spinner className="w-5 h-5 text-indigo-500" />
              <span className="text-sm text-gray-500">Generating technical questions…</span>
            </div>
          )}
          {techError && (
            <div className="flex items-center justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <span className="text-sm text-red-700">{techError}</span>
              <button onClick={fetchTechQuestions}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors flex-shrink-0">
                Retry
              </button>
            </div>
          )}
          {!techLoading && !techError && techQuestions && (
            <div className="space-y-4">
              {techQuestions.map((q, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${q.must_ask ? 'bg-red-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm leading-relaxed flex-1">{q.question}</p>
                        {q.must_ask && (
                          <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 uppercase tracking-wide">Must Ask</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-2 mb-1">What to listen for</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{q.what_to_listen_for}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

// ─── Candidate Card ───────────────────────────────────────────────────────────

function CandidateCard({ candidate, clientCompany = '', cannotProcess = false, onViewDetails, isSelected = false, onToggleSelect }) {
  const { status } = candidate
  const [showAllSkills, setShowAllSkills] = useState(false)
  const hasHop = candidate.job_hopping_flags?.length > 0
  const hasGap = candidate.career_gaps?.some(g => g.gap_months > 3)
  const hasMismatch = candidate.degree_match === false || isMismatch(candidate.education_level, candidate.jd_required_education)
  const fitScore = candidate.company_fit?.company_fit_score
  const hasFitFlag = candidate.company_fit?.mismatch_flag
  const isExEmployee = candidate.client_conflict?.is_ex_employee === true

  const leftBorder = cannotProcess
    ? 'border-l-4 border-red-500'
    : { pending: '', shortlisted: 'border-l-4 border-emerald-400', on_hold: 'border-l-4 border-amber-400', rejected: 'border-l-4 border-red-400 opacity-70' }[status]
  const statusBadge = { shortlisted: 'bg-emerald-100 text-emerald-700', on_hold: 'bg-amber-100 text-amber-700', rejected: 'bg-red-100 text-red-600' }

  return (
    <div
      className={`${isSelected ? 'bg-[#F8FFFE]' : 'bg-white'} relative rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group ${leftBorder}`}
      style={isSelected ? { borderColor: '#1D9E75' } : undefined}
    >
      {!cannotProcess && (
        <div
          onClick={e => { e.stopPropagation(); onToggleSelect?.(candidate.id) }}
          style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, cursor: 'pointer', width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${isSelected ? '#1D9E75' : '#e0f0ec'}`, background: isSelected ? '#1D9E75' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s, border-color 0.15s' }}
        >
          {isSelected && (
            <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
              <path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      )}
      {candidate.candidate_phone && (
        <span
          title={`📱 ${candidate.candidate_phone} — extracted from resume`}
          style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, fontSize: 18, cursor: 'default', lineHeight: 1 }}
        >📱</span>
      )}
      {cannotProcess && (
        <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 flex items-center gap-2">
          <span className="flex-shrink-0">🚫</span>
          <span className="text-xs text-red-700 font-semibold leading-snug">
            Currently employed at {clientCompany || 'client company'}
          </span>
        </div>
      )}
      <div className="p-3 flex-1 space-y-2">
        <div className="flex items-start gap-2.5">
          <div className="group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
            <ScoreRing score={candidate.score} size={52} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{candidate.candidate_name}</h3>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                {status !== 'pending' && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusBadge[status]}`}>
                    {status === 'shortlisted' ? '✓ shortlisted' : status === 'on_hold' ? '⏸ on hold' : '✗ rejected'}
                  </span>
                )}
                {(() => {
                  const badge = PIPELINE_STAGE_BADGE[candidate.pipeline_stage]
                  if (!badge) return null
                  return (
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, border: `1.5px solid ${badge.border}`, background: badge.bg, color: badge.color, fontWeight: 700 }}>
                      {badge.label}
                    </span>
                  )
                })()}
              </div>
            </div>
            {candidate.benchmark_match_percent != null && (
              <div className="mt-0.5 mb-0.5">
                <span
                  className={`inline-flex items-center font-semibold ${
                    candidate.benchmark_verdict === 'strong_match' ? 'bg-emerald-50 text-emerald-700' :
                    candidate.benchmark_verdict === 'good_match'   ? 'bg-teal-50 text-teal-700' :
                    candidate.benchmark_verdict === 'partial_match' ? 'bg-amber-50 text-amber-700' :
                    candidate.benchmark_verdict === 'weak_match'   ? 'bg-red-50 text-red-600' :
                    candidate.benchmark_match_percent >= 75 ? 'bg-emerald-50 text-emerald-700' :
                    candidate.benchmark_match_percent >= 50 ? 'bg-amber-50 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}
                  style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20 }}
                >
                  🎯 Bench {candidate.benchmark_match_percent}%
                </span>
              </div>
            )}
            <p className="text-xs text-gray-400 truncate">{candidate.current_role}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">⏱ {fmtExpDisplay(candidate.total_experience_display, candidate.total_experience_years, candidate.experience_total_months)}</span>
              <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-medium">🎯 {fmtExpDisplay(candidate.relevant_experience_display, candidate.relevant_experience_years, candidate.experience_relevant_months)}</span>
              {fitScore != null && (
                <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${fitScore >= 7 ? 'bg-emerald-50 text-emerald-600' : fitScore >= 5 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-500'}`}>
                  🏢 Fit {fitScore}/10
                </span>
              )}
            </div>
          </div>
        </div>
        {(hasMismatch || hasHop || hasGap || hasFitFlag || isExEmployee || candidate.is_duplicate) && (
          <div className="flex flex-wrap gap-1">
            {hasMismatch  && <Tag variant="missing">⚠️ Degree mismatch</Tag>}
            {hasHop       && <Tag variant="missing">🚩 Job hopping</Tag>}
            {hasGap       && <Tag variant="warning">⏸ Career gap</Tag>}
            {hasFitFlag   && <Tag variant="warning">🏢 Company mismatch</Tag>}
            {isExEmployee && <Tag variant="warning">⚠️ Ex-employee of {clientCompany || 'client'}</Tag>}
            {candidate.is_duplicate && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
                title={`Previously seen in: ${(candidate.duplicate_projects || []).map(p => p.project_name).join(', ')}`}
              >
                ⚠ Seen before
              </span>
            )}
          </div>
        )}
        {candidate.recommendation && REC_CFG[candidate.recommendation] && (
          <div>
            <RecBadge recommendation={candidate.recommendation} size="xs" />
          </div>
        )}
        {(candidate.remark || candidate.linkedin_url) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {candidate.remark && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                ✏ Remark ready
              </span>
            )}
            {candidate.linkedin_url && (
              <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors">
                in LinkedIn
              </a>
            )}
          </div>
        )}
        {(candidate.matched_skills?.length > 0 || candidate.missing_skills?.length > 0) && (() => {
          const allSkills = [
            ...(candidate.matched_skills || []).map(s => ({ s, type: 'match' })),
            ...(candidate.missing_skills || []).map(s => ({ s, type: 'missing' })),
          ]
          const visible = showAllSkills ? allSkills : allSkills.slice(0, 3)
          const extra = allSkills.length - 3
          return (
            <div className="flex flex-wrap gap-1 items-center">
              {visible.map(({ s, type }) => <Tag key={s} variant={type}>{s}</Tag>)}
              {!showAllSkills && extra > 0 && (
                <span onClick={e => { e.stopPropagation(); setShowAllSkills(true) }}
                  style={{ color: '#1D9E75', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', marginLeft: 4 }}>
                  +{extra} more
                </span>
              )}
              {showAllSkills && (
                <span onClick={e => { e.stopPropagation(); setShowAllSkills(false) }}
                  style={{ color: '#1D9E75', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', marginLeft: 4 }}>
                  show less
                </span>
              )}
            </div>
          )
        })()}
      </div>
      <div className="px-3 py-2.5 bg-gray-50/80 border-t border-gray-100">
        {cannotProcess ? (
          <div className="py-1.5 px-3 text-center text-xs text-red-700 font-semibold bg-red-50 rounded-lg border border-red-200">
            🚫 Cannot recruit — current client employee
          </div>
        ) : (
          <button onClick={() => onViewDetails(candidate.id)}
            className="w-full h-9 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ background: '#1D9E75' }}>
            View Scorecard →
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Step 1: JD Input ─────────────────────────────────────────────────────────

function Step1_JDInput({ jdHistory, onSubmit, onViewHistory, onReuseSession, isLoading, jdGaps, benchmarkFile, onBenchmarkFileChange }) {
  const [mode, setMode] = useState('text')      // 'text' | 'file'
  const [jdText, setJdText] = useState('')
  const [jdFile, setJdFile] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const fileRef          = useRef(null)
  const benchmarkFileRef = useRef(null)
  const jdSpeechRef      = useRef(null)
  const [jdIsRecording, setJdIsRecording]         = useState(false)
  const [jdVoiceTranscript, setJdVoiceTranscript] = useState('')
  const [jdSpeechSupported] = useState(
    () => !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  )

  const canGo = mode === 'text'
    ? (jdText.trim().length >= 50 || jdVoiceTranscript.trim().length >= 50)
    : jdFile != null

  const handleSubmit = () => {
    if (mode === 'text') {
      const text = jdText.trim().length >= 50 ? jdText : jdVoiceTranscript
      onSubmit({ text })
    } else {
      onSubmit({ file: jdFile })
    }
  }

  const startJdRecording = () => {
    if (!jdSpeechSupported) return
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recog = new SpeechAPI()
    recog.continuous = true
    recog.interimResults = false
    recog.lang = 'en-IN'
    recog.onresult = e => {
      let finalTranscript = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' '
      }
      if (finalTranscript.trim()) setJdVoiceTranscript(prev => prev + finalTranscript)
    }
    recog.start()
    jdSpeechRef.current = recog
    setJdIsRecording(true)
  }

  const stopJdRecording = () => {
    jdSpeechRef.current?.stop()
    setJdIsRecording(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <main className="max-w-3xl mx-auto px-6 py-14">
        <JdGapsPanel gaps={jdGaps} />
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4 border border-indigo-100">
            ✨ Powered by Groq · Llama 3.3 70B
          </div>
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Start with the Job Description</h2>
          <p className="text-gray-500 mt-3 text-lg">Paste or upload the JD — AI will handle the rest</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Mode tabs */}
          <div className="flex border-b border-gray-100">
            {[{ id: 'text', label: '✏️ Paste JD Text' }, { id: 'file', label: '📄 Upload JD File' }].map(t => (
              <button key={t.id} onClick={() => { setMode(t.id); setJdFile(null); }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${mode === t.id ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {mode === 'text' ? (
              <>
                <textarea value={jdText} onChange={e => setJdText(e.target.value)}
                  placeholder="Paste the full job description here — role title, responsibilities, required skills, education, experience…"
                  className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent placeholder-gray-300 min-h-[280px]" />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs ${jdText.length < 50 && jdText.length > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {jdText.length < 50 && jdText.length > 0 ? `${50 - jdText.length} more chars needed` : `${jdText.length} characters`}
                  </span>
                  {jdText.length >= 50 && <span className="text-xs text-emerald-500 font-medium">✓ Ready</span>}
                </div>
              </>
            ) : (
              <div>
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
                    onChange={e => setJdFile(e.target.files[0] || null)} />
                  {jdFile ? (
                    <div>
                      <div className="text-4xl mb-2">📋</div>
                      <p className="font-semibold text-gray-800">{jdFile.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{(jdFile.size / 1024).toFixed(0)} KB</p>
                      <button onClick={e => { e.stopPropagation(); setJdFile(null) }}
                        className="mt-3 text-xs text-red-400 hover:text-red-600 font-medium">Remove</button>
                    </div>
                  ) : (
                    <>
                      <div className="text-5xl mb-3">📄</div>
                      <p className="text-sm font-medium text-gray-700">Click to upload JD file</p>
                      <p className="text-xs text-gray-400 mt-1">PDF or DOCX</p>
                    </>
                  )}
                </div>
              </div>
            )}
            {jdSpeechSupported && (
              <div className="mt-5 border-t border-gray-100 pt-5 space-y-3">
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-0.5">
                    Or describe the role by voice
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Speak in English, Hindi, or Hinglish — AI will extract the JD from your description
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2 py-1">
                  <button
                    onClick={jdIsRecording ? stopJdRecording : startJdRecording}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all ${jdIsRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                    <span className="text-white text-2xl">{jdIsRecording ? '■' : '🎙'}</span>
                  </button>
                  <p className={`text-xs font-semibold ${jdIsRecording ? 'text-red-500' : 'text-gray-500'}`}>
                    {jdIsRecording ? 'Recording… tap to stop' : 'Tap to record'}
                  </p>
                  {jdIsRecording && (
                    <span className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </span>
                  )}
                </div>
                {jdVoiceTranscript && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500">What you said:</p>
                    <textarea
                      value={jdVoiceTranscript}
                      onChange={e => setJdVoiceTranscript(e.target.value)}
                      rows={4}
                      placeholder="Your voice transcript will appear here — edit before analyzing"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Benchmark CV upload */}
          <div className="px-6 pb-4 border-t border-gray-100 pt-5">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
              Benchmark CV <span className="text-gray-400 font-normal normal-case">(Optional)</span>
            </p>
            <p className="text-[11px] text-gray-400 mb-3">
              Upload an ideal candidate's resume — AI will extract a fingerprint and score all candidates against it
            </p>
            <ProTip tipId="benchmark_cv" text="Best benchmark: use the CV of someone you've already placed successfully in a similar role. This gives the AI a real-world reference for what 'good' looks like for this client." />
            <input ref={benchmarkFileRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
              onChange={e => onBenchmarkFileChange(e.target.files[0] || null)} />
            {benchmarkFile ? (
              <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
                <span className="text-teal-600 text-lg">🎯</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-teal-800 truncate">{benchmarkFile.name}</p>
                  <p className="text-[11px] text-teal-500">{(benchmarkFile.size / 1024).toFixed(0)} KB · Benchmark CV</p>
                </div>
                <button onClick={() => onBenchmarkFileChange(null)}
                  className="text-teal-400 hover:text-red-500 transition-colors text-xs font-medium flex-shrink-0">Remove</button>
              </div>
            ) : (
              <button onClick={() => benchmarkFileRef.current?.click()}
                className="w-full flex items-center gap-3 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-left hover:border-teal-300 hover:bg-teal-50/50 transition-all group">
                <span className="text-2xl">🎯</span>
                <span className="text-sm text-gray-500 group-hover:text-teal-700 transition-colors">
                  Click to upload benchmark / ideal candidate CV (PDF or DOCX)
                </span>
              </button>
            )}
          </div>

          <div className="px-6 pb-6">
            <button onClick={handleSubmit} disabled={!canGo || isLoading}
              className={`w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200 ${canGo && !isLoading ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2"><Spinner />Analysing JD…</span>
              ) : 'Analyse JD →'}
            </button>
          </div>
        </div>

        {/* Previous Sessions */}
        {jdHistory.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gray-100" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Previous Sessions</h3>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {jdHistory.map(entry => (
                <button key={entry.id} onClick={() => setSelectedSession(entry)}
                  className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-gray-800 text-sm truncate group-hover:text-indigo-700 transition-colors">
                      {entry.clientCompany || entry.answers?.client_company || 'No client name'}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{fmtDate(entry.date)}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{entry.jdText.slice(0, 110)}{entry.jdText.length > 110 ? '…' : ''}</p>
                  {entry.results?.candidates?.length > 0 && (
                    <span className="mt-2 inline-block text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium border border-indigo-100">
                      {entry.results.candidates.length} candidate{entry.results.candidates.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Session picker modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedSession(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-bold text-gray-900">{selectedSession.clientCompany || selectedSession.answers?.client_company || 'Previous Session'}</h3>
              <button onClick={() => setSelectedSession(null)} className="text-gray-300 hover:text-gray-500 text-xl ml-2">×</button>
            </div>
            <p className="text-xs text-gray-400 mb-3">{fmtDate(selectedSession.date)}</p>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mb-5 leading-relaxed line-clamp-4">
              {selectedSession.jdText.slice(0, 240)}{selectedSession.jdText.length > 240 ? '…' : ''}
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { onReuseSession(selectedSession); setSelectedSession(null) }}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm">
                Start New Screening with this JD
              </button>
              {selectedSession.results?.candidates?.length > 0 && (
                <button onClick={() => { onViewHistory(selectedSession); setSelectedSession(null) }}
                  className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm">
                  View Previous Results ({selectedSession.results.candidates.length} candidates)
                </button>
              )}
              <button onClick={() => setSelectedSession(null)} className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 2: Clarifying Questions ─────────────────────────────────────────────

const FIELD_META = {
  min_experience:       { label: 'Minimum Experience (years)', placeholder: 'e.g. 3', type: 'number' },
  max_experience:       { label: 'Maximum Experience (years)', placeholder: 'e.g. 8', type: 'number' },
  must_have_skills:     { label: 'Mandatory / Must-have Skills', placeholder: 'e.g. Python, SQL, REST APIs', type: 'text' },
  nice_to_have_skills:  { label: 'Good-to-have Skills', placeholder: 'e.g. Docker, Kubernetes', type: 'text' },
  client_company:       { label: 'Client Company Name', placeholder: 'e.g. Volkswagen India', type: 'text' },
  work_location:        { label: 'Job Location', placeholder: 'e.g. Pune, Bangalore, Mumbai, Remote, or Hybrid', type: 'text' },
  industry:             { label: 'Industry / Domain Preference', placeholder: 'e.g. FinTech, Healthcare, Manufacturing', type: 'text' },
  product_client_check: { label: 'Product / Platform / Client Constraints', placeholder: 'e.g. Must have SAP S/4HANA, or must not be from Tata Motors', type: 'text' },
}

function Step2_Clarify({ jdText, answers, setAnswers, missingFields, onContinue, isLoading, jdGaps }) {
  const allFields = Object.keys(FIELD_META)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <main className="max-w-2xl mx-auto px-6 py-12">
        <JdGapsPanel gaps={jdGaps} />
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Fill in the Gaps</h2>
          <p className="text-gray-500 mt-2">
            {missingFields.length > 0
              ? `AI found ${missingFields.length} item${missingFields.length !== 1 ? 's' : ''} missing from the JD — fill them in to improve screening accuracy`
              : 'AI extracted everything from the JD — verify and adjust if needed'}
          </p>
        </div>

        {missingFields.length === 0 && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-medium">
            <span>✅</span><span>JD is comprehensive — all key fields were extracted automatically</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          {allFields.map(field => {
            const meta = FIELD_META[field]
            const isMissing = missingFields.includes(field)
            return (
              <div key={field}>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                  {meta.label}
                  {isMissing
                    ? <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-200">Missing from JD</span>
                    : <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-200">✓ Extracted</span>}
                </label>
                <input
                  type={meta.type}
                  value={answers[field] || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={meta.placeholder}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent transition
                    ${isMissing ? 'border-amber-300 focus:ring-amber-300 bg-amber-50/30' : 'border-gray-200 focus:ring-indigo-300'}`}
                />
              </div>
            )
          })}

          <div className="pt-2">
            <button onClick={onContinue} disabled={isLoading}
              className={`w-full py-3.5 rounded-2xl font-semibold transition-all ${!isLoading ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200' : 'bg-indigo-400 text-white cursor-wait'}`}>
              {isLoading ? <span className="flex items-center justify-center gap-2"><Spinner />Generating Keywords…</span> : 'Continue — Suggest Keywords →'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── Step 3: Keyword Suggestions ──────────────────────────────────────────────

function KeywordChip({ label, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150
        ${selected ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}>
      {selected ? '✓ ' : '+ '}{label}
    </button>
  )
}

function Step3_Keywords({ suggestedKeywords, selectedKeywords, setSelectedKeywords, onContinue }) {
  const toggle = (category, kw) => {
    setSelectedKeywords(prev => {
      const set = new Set(prev[category])
      if (set.has(kw)) set.delete(kw)
      else set.add(kw)
      return { ...prev, [category]: [...set] }
    })
  }

  const totalSelected = selectedKeywords.must_have.length + selectedKeywords.nice_to_have.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Select Relevant Keywords</h2>
          <p className="text-gray-500 mt-2">AI suggests additional keywords based on the JD and market knowledge — click to add them to the screening</p>
        </div>

        <div className="space-y-5">
          {[
            { key: 'must_have', label: '🎯 Suggested Must-Have Keywords', subtitle: 'Essential for this role — missing from JD', color: 'border-indigo-200 bg-indigo-50/40' },
            { key: 'nice_to_have', label: '✨ Suggested Nice-to-Have Keywords', subtitle: 'Beneficial but not critical', color: 'border-gray-200 bg-gray-50/40' },
          ].map(section => (
            <div key={section.key} className={`bg-white rounded-2xl border ${section.color} p-6 shadow-sm`}>
              <div className="mb-4">
                <h3 className="font-bold text-gray-900">{section.label}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{section.subtitle}</p>
              </div>
              {suggestedKeywords[section.key]?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {suggestedKeywords[section.key].map(kw => (
                    <KeywordChip key={kw} label={kw}
                      selected={selectedKeywords[section.key].includes(kw)}
                      onClick={() => toggle(section.key, kw)} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No additional keywords suggested for this section</p>
              )}
              {selectedKeywords[section.key].length > 0 && (
                <p className="mt-3 text-xs text-emerald-600 font-medium">
                  {selectedKeywords[section.key].length} keyword{selectedKeywords[section.key].length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <button onClick={onContinue}
            className="px-12 py-4 rounded-2xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-xl shadow-indigo-200 hover:-translate-y-0.5 transform transition-all">
            {totalSelected > 0 ? `Start Screening with ${totalSelected} keyword${totalSelected !== 1 ? 's' : ''} →` : 'Start Screening →'}
          </button>
          <p className="text-xs text-gray-400">
            {totalSelected === 0 ? 'You can skip keyword selection' : `${totalSelected} extra keyword${totalSelected !== 1 ? 's' : ''} will sharpen the screening`}
          </p>
        </div>
      </main>
    </div>
  )
}

// ─── Step 4: Resume Upload ────────────────────────────────────────────────────

function Step4_Upload({ answers, onAnalyze }) {
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progressCurrent, setProgressCurrent] = useState(1)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  const addFiles = useCallback((incoming) => {
    const valid = Array.from(incoming).filter(f => /\.(pdf|docx|doc)$/i.test(f.name))
    setFiles(prev => {
      const seen = new Set(prev.map(f => f.name))
      const next = [...prev, ...valid.filter(f => !seen.has(f.name))]
      if (next.length > 5) {
        setError('Maximum 5 resumes per batch — only first 5 will be kept')
        return next.slice(0, 5)
      }
      setError(null)
      return next
    })
  }, [])

  const handleAnalyze = async () => {
    if (files.length === 0) return
    setIsLoading(true)
    setProgressCurrent(1)
    setError(null)

    // Advance progress counter every ~9.5 s (8 s delay + ~1.5 s LLM)
    const timer = setInterval(() => {
      setProgressCurrent(c => c < files.length ? c + 1 : c)
    }, 9500)

    try {
      await onAnalyze(files)
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(timer)
      setIsLoading(false)
    }
  }

  const pct = Math.round((progressCurrent / Math.max(files.length, 1)) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Upload Resumes</h2>
          <p className="text-gray-500 mt-2">
            Upload up to 5 resumes — AI will score each against the JD and your selected criteria
          </p>
          {answers.client_company && (
            <div className="mt-3 inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full border border-indigo-100">
              🏢 Screening for: {answers.client_company}
            </div>
          )}
        </div>

        {!isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div onClick={() => fileRef.current?.click()}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'}`}>
                <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.doc" className="hidden" onChange={e => addFiles(e.target.files)} />
                <div className="text-5xl mb-3">📄</div>
                <p className="text-sm font-medium text-gray-700">Drop files here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">PDF and DOCX · Maximum 5 resumes</p>
              </div>

              {error && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((f, i) => (
                    <div key={f.name} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="w-5 h-5 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-lg flex-shrink-0">{f.name.endsWith('.pdf') ? '📑' : '📝'}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={e => { e.stopPropagation(); setFiles(p => p.filter(x => x.name !== f.name)) }}
                        className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none">×</button>
                    </div>
                  ))}
                  <p className="text-xs text-right">
                    <span className={files.length >= 5 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                      {files.length}/5 resumes
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <button onClick={handleAnalyze} disabled={files.length === 0}
                className={`w-full py-4 rounded-2xl font-semibold text-base transition-all ${files.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                {files.length === 0 ? 'Upload resumes to continue' : `✨ Analyse ${files.length} Resume${files.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        ) : (
          /* Loading state */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-[5px] border-indigo-100 rounded-full" />
              <div className="absolute inset-0 border-[5px] border-indigo-600 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Deep Screening in Progress</h3>
            <p className="text-gray-500 mt-2 text-sm">
              Analysing resume {progressCurrent} of {files.length}
              {files[progressCurrent - 1] && <span className="text-gray-400"> — {files[progressCurrent - 1].name}</span>}
            </p>
            <div className="mt-5 max-w-xs mx-auto">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progress</span><span>{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {['Extracting text', 'Scoring skills', 'Company tier', 'Career analysis'].map((step, i) => (
                <span key={step} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                  <span className="text-xs text-gray-400">{step}</span>
                  {i < 3 && <span className="text-gray-200 text-xs">→</span>}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-300 mt-4">8 s gap between resumes · auto-retry on rate limit</p>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Post-Screening Chat ──────────────────────────────────────────────────────

function buildSuggestions(candidate, firstName) {
  const chips = []
  chips.push(`Why was ${firstName} scored ${candidate.score}/100?`)
  chips.push(`Should I shortlist ${firstName}?`)
  if (candidate.job_hopping_flags?.length > 0)
    chips.push('How concerning is the job hopping?')
  if (['red', 'amber'].includes(candidate.location_flag))
    chips.push('Is the location gap a dealbreaker?')
  if (candidate.missing_skills?.length > 0)
    chips.push(`Is ${firstName}'s experience sufficient?`)
  if (['partial_fit', 'weak_fit', 'mismatch'].includes(candidate.company_fit?.company_fit_verdict))
    chips.push('Why is the company fit not strong?')
  chips.push(`How does ${firstName} compare to others?`)
  return chips.slice(0, 5)
}

// ─── WhatsApp Modal ───────────────────────────────────────────────────────────

function WhatsAppModal({ candidate, onClose, recruiterName = '' }) {
  const [phone, setPhone] = useState(candidate.candidate_phone || '')
  const [msgType, setMsgType] = useState('check_interest')
  const [otherContext, setOtherContext] = useState('')
  const [message, setMessage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)

  const canSend = phone.replace(/\D/g, '').length === 10 && message.trim().length > 0
  const cleanPhone = phone.replace(/\D/g, '').slice(-10)

  const handleGenerate = async () => {
    setGenerating(true); setGenError(null)
    try {
      const res = await fetch(`${API_URL}/api/candidates/${candidate.id}/whatsapp-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_type: msgType, context: otherContext, recruiter_name: recruiterName }),
      })
      if (!res.ok) throw new Error('Failed to generate message')
      const data = await res.json()
      setMessage(data.message)
    } catch (e) { setGenError(e.message) }
    finally { setGenerating(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[480px] shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 text-base">WhatsApp Message</h2>
            <p className="text-xs text-gray-400 mt-0.5">{candidate.candidate_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Candidate's WhatsApp number</label>
            <input
              type="text" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="Enter 10-digit mobile number"
              maxLength={15}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
            />
            <p className="text-[11px] text-gray-400 mt-1">{candidate.candidate_phone ? 'Extracted from resume — verify before sending' : 'No phone found in resume — enter manually'}</p>
          </div>

          <ProTip tipId="whatsapp_timing" text="💡 Check Interest messages work best on weekday mornings between 10am–12pm — higher response rates from candidates." />

          {/* Message type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Message type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'check_interest', icon: '👋', label: 'Check Interest', desc: 'Ask if candidate is open to this opportunity' },
                { key: 'other',          icon: '✏️', label: 'Other',          desc: 'Write your own message with AI help' },
              ].map(({ key, icon, label, desc }) => (
                <button key={key} onClick={() => setMsgType(key)}
                  className={`text-left p-3 rounded-xl border transition-all ${msgType === key ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="text-lg mb-1">{icon}</div>
                  <div className="text-xs font-semibold text-gray-800">{label}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
            {msgType === 'other' && (
              <textarea
                value={otherContext} onChange={e => setOtherContext(e.target.value)}
                placeholder="e.g. Follow up on interview, share job details, ask about notice period..."
                rows={3}
                className="w-full mt-3 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 resize-none"
              />
            )}
          </div>

          {/* Generate button */}
          <button onClick={handleGenerate}
            disabled={generating || (msgType === 'other' && !otherContext.trim())}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: generating ? '#6b7280' : '#0F6E56' }}>
            {generating ? 'Generating…' : message ? 'Regenerate' : 'Generate Message'}
          </button>
          {genError && <p className="text-xs text-red-500">{genError}</p>}

          {/* Message preview */}
          {message && (
            <div>
              <div className="p-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed text-gray-800 mb-3" style={{ background: '#DCF8C6' }}>
                {message}
              </div>
              <textarea
                value={message} onChange={e => setMessage(e.target.value)}
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 resize-none"
              />
              <p className="text-[11px] text-gray-400 mt-1 text-right">{message.length} characters</p>
            </div>
          )}

          {/* Send button */}
          <button
            disabled={!canSend}
            onClick={() => window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank')}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: canSend ? '#25D366' : '#25D366' }}>
            Open WhatsApp →
          </button>
          {!canSend && (
            <p className="text-[11px] text-gray-400 text-center -mt-4">
              {!phone || phone.replace(/\D/g, '').length !== 10 ? 'Enter a valid 10-digit number' : 'Generate a message first'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function CandidateChat({ candidate, projectId, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const messagesEndRef = useRef(null)

  const firstName = (candidate.candidate_name || candidate.name || 'Candidate').split(' ')[0]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    setStarted(true)
    const userMsg = { role: 'user', content: text, timestamp: new Date() }
    const prevMessages = messages
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidate.id,
          message: text,
          chat_history: prevMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: new Date() }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
        isError: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Ask AI about {firstName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {candidate.score}/100
              </span>
              <span className="text-xs text-gray-400">{candidate.candidate_name || candidate.name}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1">✕</button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {!started && (
            <div>
              <p className="text-xs text-gray-400 text-center mb-3">Suggested questions</p>
              <div className="flex flex-wrap gap-2">
                {buildSuggestions(candidate, firstName).map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs hover:bg-purple-100 transition-colors text-left">
                    {s}
                  </button>
                ))}
              </div>
              <ProTip tipId="ask_ai_examples" text="💡 Try asking: Should I shortlist despite job hopping? or What are the biggest red flags for this candidate?" />
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-500 text-white rounded-br-sm'
                  : msg.isError
                    ? 'bg-red-50 text-red-600 border border-red-100 rounded-bl-sm'
                    : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-sm'
              }`}>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-emerald-200' : 'text-gray-400'}`}>
                  {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
              disabled={loading}
              placeholder="Ask anything about this candidate..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="w-9 h-9 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )
              }
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Candidate List View ─────────────────────────────────────────────────────

function CandidateListView({ candidates, onViewDetails }) {
  return (
    <div style={{ background: 'white', border: '0.5px solid #e0f0ec', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#F3F4F6', borderBottom: '0.5px solid #e0f0ec' }}>
            {['#', 'Candidate', 'Score', 'Bench %', 'Experience', 'Rec.', 'Pipeline', 'Location', ''].map((h, i) => (
              <th key={i} style={{ padding: '10px 12px', textAlign: i <= 1 || i >= 8 ? (i === 1 ? 'left' : 'center') : 'center', fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap', fontSize: 12 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {candidates.map((c, i) => {
            const sColor  = c.score >= 75 ? '#059669' : c.score >= 50 ? '#D97706' : '#DC2626'
            const benchBg = c.benchmark_match_percent >= 75 ? '#ECFDF5' : c.benchmark_match_percent >= 50 ? '#FFFBEB' : '#FEF2F2'
            const benchC  = c.benchmark_match_percent >= 75 ? '#059669' : c.benchmark_match_percent >= 50 ? '#D97706' : '#DC2626'
            const pipeline = PIPELINE_STAGE_BADGE[c.pipeline_stage]
            const locDot   = { green: '#059669', amber: '#D97706', red: '#DC2626' }[c.location_flag]
            const rowBg    = i % 2 === 0 ? 'white' : '#F8FFFE'
            return (
              <tr key={c.id}
                onClick={() => onViewDetails(c.id)}
                style={{ background: rowBg, cursor: 'pointer', borderBottom: '0.5px solid #f0f0f0', transition: 'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#E1F5EE' }}
                onMouseLeave={e => { e.currentTarget.style.background = rowBg }}>
                {/* # */}
                <td style={{ padding: '0 12px', textAlign: 'center', color: '#9CA3AF', fontWeight: 500, height: 52, width: 36 }}>{i + 1}</td>
                {/* Candidate */}
                <td style={{ padding: '0 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52 }}>
                    <div style={{ flexShrink: 0 }}><ScoreRing score={c.score} size={32} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#111827', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{c.candidate_name}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{c.current_role}</div>
                    </div>
                  </div>
                </td>
                {/* Score */}
                <td style={{ padding: '0 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <span style={{ color: sColor, fontWeight: 700 }}>{c.score}</span>
                  <span style={{ color: '#D1D5DB', fontSize: 11 }}>/100</span>
                </td>
                {/* Bench % */}
                <td style={{ padding: '0 12px', textAlign: 'center' }}>
                  {c.benchmark_match_percent != null ? (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: benchBg, color: benchC, fontWeight: 700 }}>
                      {c.benchmark_match_percent}%
                    </span>
                  ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                </td>
                {/* Experience */}
                <td style={{ padding: '0 12px', textAlign: 'center', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {fmtExpDisplay(c.total_experience_display, c.total_experience_years, c.experience_total_months)}
                </td>
                {/* Recommendation */}
                <td style={{ padding: '0 12px', textAlign: 'center' }}>
                  {c.recommendation ? <RecBadge recommendation={c.recommendation} size="xs" /> : <span style={{ color: '#D1D5DB' }}>—</span>}
                </td>
                {/* Pipeline */}
                <td style={{ padding: '0 12px', textAlign: 'center' }}>
                  {pipeline ? (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, border: `1.5px solid ${pipeline.border}`, background: pipeline.bg, color: pipeline.color, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {pipeline.label}
                    </span>
                  ) : <span style={{ color: '#D1D5DB', fontSize: 11 }}>—</span>}
                </td>
                {/* Location */}
                <td style={{ padding: '0 12px', textAlign: 'center' }}>
                  {c.candidate_location ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                      {locDot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: locDot, display: 'inline-block', flexShrink: 0 }} />}
                      <span style={{ color: '#374151', fontSize: 12 }}>{c.candidate_location}</span>
                    </div>
                  ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                </td>
                {/* Action */}
                <td style={{ padding: '0 12px', textAlign: 'center' }}>
                  <button
                    onClick={e => { e.stopPropagation(); onViewDetails(c.id) }}
                    style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, background: '#1D9E75', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    View →
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Step 5: Results Dashboard ────────────────────────────────────────────────

function Step5_Results({ initialCandidates, jdGaps, clientCompany, answers, jdText, onCompare, onReset, projectId, compareSelection, onToggleCompareSelect, onClearCompareSelection, recruiterName = '', recruiterEmail = '' }) {
  const [candidates, setCandidates] = useState(initialCandidates.map(c => ({ ...c, comments: '' })))
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('score')
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('resumeai_results_view') || 'card' } catch { return 'card' }
  })
  const setView = (v) => {
    setViewMode(v)
    try { localStorage.setItem('resumeai_results_view', v) } catch {}
  }
  const [selectedId, setSelectedId] = useState(null)
  const [callGuideCandidate, setCallGuideCandidate] = useState(null)
  const [chatCandidate, setChatCandidate] = useState(null)
  const [whatsappCandidate, setWhatsappCandidate] = useState(null)
  const [showMaxWarning, setShowMaxWarning] = useState(false)
  const [dupToast, setDupToast] = useState(null)
  const [placedToast, setPlacedToast] = useState(null)
  const [pendingFeedback, setPendingFeedback] = useState(null)
  const warningTimerRef = useRef(null)
  const dupToastBatchRef = useRef(null)

  useEffect(() => {
    if (dupToastBatchRef.current === initialCandidates) return
    dupToastBatchRef.current = initialCandidates
    const dupCands = initialCandidates.filter(c => c.is_duplicate)
    if (dupCands.length === 0) return
    const projectNames = [...new Set(
      dupCands.flatMap(c => (c.duplicate_projects || []).map(p => p.project_name))
    )].join(', ')
    setDupToast(
      dupCands.length === 1
        ? `⚠ ${dupCands[0].candidate_name || 'Candidate'} seen before — in: ${projectNames}`
        : `⚠ ${dupCands.length} candidates seen in other projects`
    )
    const t = setTimeout(() => setDupToast(null), 5000)
    return () => clearTimeout(t)
  }, [initialCandidates])

  const selectedCandidates = [...compareSelection].map(id => candidates.find(c => c.id === id)).filter(Boolean)

  const handleToggleSelect = (id) => {
    if (!compareSelection.has(id) && compareSelection.size >= 4) {
      clearTimeout(warningTimerRef.current)
      setShowMaxWarning(true)
      warningTimerRef.current = setTimeout(() => setShowMaxWarning(false), 2500)
      return
    }
    onToggleCompareSelect(id)
  }

  const updateCandidate = (id, updates) => setCandidates(cs => cs.map(c => c.id === id ? { ...c, ...updates } : c))

  const completeStatusChange = (id, status) => {
    if (status === 'shortlisted') fireShortlistConfetti()
    updateCandidate(id, { status })
    fetch(`${API_URL}/api/candidates/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {})
  }

  const completePipelineChange = (id, stage) => {
    updateCandidate(id, { pipeline_stage: stage })
    if (stage === 'joined') {
      fireShortlistConfetti()
      setPlacedToast('🎉 Placed!')
      setTimeout(() => setPlacedToast(null), 3000)
    }
    trackFeature(recruiterEmail, 'pipeline_stage_change')
    fetch(`${API_URL}/api/candidates/${id}/pipeline`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    }).catch(() => {})
  }

  const handleStatusChange = (id, status) => {
    if (['shortlisted', 'on_hold', 'rejected'].includes(status)) {
      setSelectedId(null)
      const cand = candidates.find(c => c.id === id)
      setPendingFeedback({ type: 'status', candidateId: id, value: status, candidateName: cand?.candidate_name || 'Candidate' })
      return
    }
    completeStatusChange(id, status)
  }

  const handlePipelineChange = (id, stage) => {
    if (stage === 'dropped' || stage === 'joined') {
      setSelectedId(null)
      const cand = candidates.find(c => c.id === id)
      setPendingFeedback({ type: 'pipeline', candidateId: id, value: stage, candidateName: cand?.candidate_name || 'Candidate' })
      return
    }
    completePipelineChange(id, stage)
  }

  const handleFeedbackSubmit = async ({ reason, detail }) => {
    if (!pendingFeedback) return
    const { type, candidateId, value } = pendingFeedback
    setPendingFeedback(null)
    fetch(`${API_URL}/api/candidates/${candidateId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recruiter_email: recruiterEmail, action: value, reason, reason_detail: detail, project_id: projectId }),
    }).catch(() => {})
    if (type === 'status') completeStatusChange(candidateId, value)
    else completePipelineChange(candidateId, value)
  }

  const handleFeedbackSkip = () => {
    if (!pendingFeedback) return
    const { type, candidateId, value } = pendingFeedback
    setPendingFeedback(null)
    if (type === 'status') completeStatusChange(candidateId, value)
    else completePipelineChange(candidateId, value)
  }

  const cannotProcess = candidates.filter(c => c.client_conflict?.is_current_employee === true)
  const processable   = candidates.filter(c => !c.client_conflict?.is_current_employee)

  const shortlisted = processable.filter(c => c.status === 'shortlisted').length
  const onHold      = processable.filter(c => c.status === 'on_hold').length
  const rejected    = processable.filter(c => c.status === 'rejected').length
  const avgScore    = processable.length > 0
    ? Math.round(processable.reduce((a, c) => a + c.score, 0) / processable.length)
    : 0

  const pSubmitted    = processable.filter(c => c.pipeline_stage === 'submitted').length
  const pInterviewing = processable.filter(c => c.pipeline_stage === 'interview_scheduled').length
  const pOffers       = processable.filter(c => c.pipeline_stage === 'offer_made').length
  const pJoined       = processable.filter(c => c.pipeline_stage === 'joined').length
  const hasPipelineActivity = pSubmitted + pInterviewing + pOffers + pJoined > 0

  const visible = filter === 'cannot_process'
    ? cannotProcess
    : [...processable]
        .filter(c => filter === 'all' || c.status === filter)
        .sort((a, b) =>
          sortBy === 'score' ? b.score - a.score :
          sortBy === 'exp'   ? (b.experience_total_months || 0) - (a.experience_total_months || 0) :
          a.candidate_name.localeCompare(b.candidate_name)
        )

  const selected = candidates.find(c => c.id === selectedId)

  const statItems = [
    { v: processable.length,    l: 'In Pool',     c: 'text-gray-900' },
    { v: avgScore,              l: 'Avg Score',   c: 'text-indigo-600' },
    { v: shortlisted,           l: 'Shortlisted', c: 'text-emerald-600' },
    { v: onHold,                l: 'On Hold',     c: 'text-amber-600' },
    { v: rejected,              l: 'Rejected',    c: 'text-red-500' },
    ...(cannotProcess.length > 0 ? [{ v: cannotProcess.length, l: 'Cannot Process', c: 'text-red-700' }] : []),
  ]

  const tabs = [
    { key: 'all',         label: `All (${processable.length})`,     danger: false },
    { key: 'shortlisted', label: `Shortlisted (${shortlisted})`,   danger: false },
    { key: 'on_hold',     label: `Hold (${onHold})`,               danger: false },
    { key: 'rejected',    label: `Rejected (${rejected})`,         danger: false },
    ...(cannotProcess.length > 0 ? [{ key: 'cannot_process', label: `Cannot Process (${cannotProcess.length})`, danger: true }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stats bar */}
      <div className="bg-white border-b border-gray-200">
        <div className={`w-full px-6 py-5 grid gap-4`}
          style={{ gridTemplateColumns: `repeat(${statItems.length}, minmax(0, 1fr))` }}>
          {statItems.map(({ v, l, c }) => (
            <div key={l} className="text-center">
              <p className={`text-3xl font-bold ${c}`}>{v}</p>
              <p className="text-sm text-gray-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        {hasPipelineActivity && (
          <div className="border-t border-gray-100 px-6 py-2 flex items-center gap-4 flex-wrap" style={{ fontSize: 12 }}>
            <span className="text-gray-400 font-semibold uppercase tracking-wide" style={{ fontSize: 10 }}>Pipeline:</span>
            {pSubmitted    > 0 && <span style={{ color: '#2563EB', fontWeight: 700 }}>{pSubmitted} Submitted</span>}
            {pInterviewing > 0 && <span style={{ color: '#7C3AED', fontWeight: 700 }}>{pInterviewing} Interviewing</span>}
            {pOffers       > 0 && <span style={{ color: '#D97706', fontWeight: 700 }}>{pOffers} Offers</span>}
            {pJoined       > 0 && <span style={{ color: '#059669', fontWeight: 700 }}>{pJoined} Joined 🎉</span>}
          </div>
        )}
      </div>

      <div className="w-full px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex gap-1 bg-gray-200 rounded-xl p-1 flex-wrap">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${filter === tab.key
                    ? tab.danger ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                    : tab.danger ? 'text-red-500 hover:text-red-700' : 'text-gray-500 hover:text-gray-800'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          {filter !== 'cannot_process' && (
            <div className="flex items-center gap-3">
              {/* View toggle — hidden on mobile */}
              <div className="hidden md:flex items-center overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: 8 }}>
                {[
                  { v: 'card', icon: '⊞', title: 'Card view' },
                  { v: 'list', icon: '☰', title: 'List view' },
                ].map(({ v, icon, title }, idx) => (
                  <button key={v} onClick={() => setView(v)} title={title}
                    style={{
                      padding: '5px 10px', lineHeight: 1, fontSize: 16, cursor: 'pointer', border: 'none',
                      background: viewMode === v ? '#1D9E75' : 'white',
                      color:      viewMode === v ? 'white'   : '#6B7280',
                      borderLeft: idx > 0 ? '1px solid #E5E7EB' : 'none',
                      transition: 'background 0.15s, color 0.15s',
                    }}>
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Sort:</span>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                  <option value="score">Score (High → Low)</option>
                  <option value="exp">Total Experience</option>
                  <option value="name">Name (A → Z)</option>
                </select>
              </div>
              {processable.length >= 2 && (
                <button onClick={() => { onCompare(); trackFeature(recruiterEmail, 'compare') }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                  Compare top 3 →
                </button>
              )}
            </div>
          )}
        </div>

        {filter === 'cannot_process' && (
          <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            <span className="flex-shrink-0 text-base">🚫</span>
            <span>
              These candidates <strong>cannot be recruited</strong> — they are currently employed at{' '}
              <strong>{clientCompany || 'the client company'}</strong>. They are excluded from all other tabs and the comparison view.
            </span>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-lg font-medium text-gray-500">No candidates in this category</p>
            <p className="text-sm mt-1">Switch filter to see other candidates</p>
          </div>
        ) : viewMode === 'list' ? (
          <CandidateListView candidates={visible} onViewDetails={id => { setSelectedId(id); trackFeature(recruiterEmail, 'scorecard_view') }} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visible.map(c => (
              <CandidateCard key={c.id} candidate={c}
                clientCompany={clientCompany}
                cannotProcess={c.client_conflict?.is_current_employee === true}
                onViewDetails={id => { setSelectedId(id); trackFeature(recruiterEmail, 'scorecard_view') }}
                isSelected={compareSelection.has(c.id)}
                onToggleSelect={handleToggleSelect} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ScorecardModal candidate={selected} clientCompany={clientCompany}
          cannotProcess={selected.client_conflict?.is_current_employee === true}
          screeningContext={answers}
          onClose={() => setSelectedId(null)}
          onStatusChange={handleStatusChange}
          onPipelineChange={handlePipelineChange}
          onCallGuide={cand => { setSelectedId(null); setCallGuideCandidate(cand); trackFeature(recruiterEmail, 'call_guide') }}
          onAskAI={cand => { setSelectedId(null); setChatCandidate(cand); trackFeature(recruiterEmail, 'ask_ai') }}
          onCommentChange={(id, v) => updateCandidate(id, { comments: v })}
          onRemarkChange={(id, updates) => updateCandidate(id, updates)}
          onWhatsApp={cand => { setSelectedId(null); setWhatsappCandidate(cand); trackFeature(recruiterEmail, 'whatsapp') }} />
      )}
      {callGuideCandidate && (
        <CallGuide
          candidate={callGuideCandidate}
          jdText={jdText}
          answers={answers}
          clientCompany={clientCompany}
          onBack={() => setCallGuideCandidate(null)}
        />
      )}
      {chatCandidate && (
        <CandidateChat
          candidate={chatCandidate}
          projectId={projectId}
          onClose={() => setChatCandidate(null)}
        />
      )}
      {whatsappCandidate && (
        <WhatsAppModal
          candidate={whatsappCandidate}
          onClose={() => setWhatsappCandidate(null)}
          recruiterName={recruiterName}
        />
      )}
      {pendingFeedback && (
        <FeedbackModal
          candidateName={pendingFeedback.candidateName}
          action={pendingFeedback.value}
          onSubmit={handleFeedbackSubmit}
          onSkip={handleFeedbackSkip}
        />
      )}

      {/* Max selection warning toast */}
      {showMaxWarning && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 110, background: '#1a1a1a', color: 'white', borderRadius: 8, padding: '8px 16px', fontSize: 13, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          Maximum 4 candidates can be compared at once
        </div>
      )}

      {/* Duplicate candidate amber toast */}
      {dupToast && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 110, background: '#78350f', color: '#fef3c7', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', whiteSpace: 'nowrap', maxWidth: '90vw', textAlign: 'center', pointerEvents: 'none' }}>
          {dupToast}
        </div>
      )}

      {/* Placed toast */}
      {placedToast && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 111, background: '#059669', color: 'white', padding: '10px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {placedToast}
        </div>
      )}

      {/* Floating compare bar — always in DOM, animated via transform */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: `translateX(-50%) translateY(${selectedCandidates.length >= 2 ? '0' : '120px'})`,
          transition: 'transform 0.3s ease-out',
          zIndex: 100,
          pointerEvents: selectedCandidates.length >= 2 ? 'auto' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: '#0F6E56',
          borderRadius: 50,
          padding: '12px 24px',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Avatars */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {selectedCandidates.slice(0, 4).map((c, i) => {
            const ini = (c.candidate_name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
            return (
              <div key={c.id} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', marginLeft: i > 0 ? -8 : 0, flexShrink: 0 }}>
                {ini}
              </div>
            )
          })}
        </div>
        {/* Count */}
        <span style={{ color: 'white', fontSize: 13 }}>
          {selectedCandidates.length} candidate{selectedCandidates.length !== 1 ? 's' : ''} selected
        </span>
        {/* Clear */}
        <button
          onClick={onClearCompareSelection}
          style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
        >
          Clear
        </button>
        {/* Compare */}
        <button
          onClick={() => { onCompare(selectedCandidates); trackFeature(recruiterEmail, 'compare') }}
          style={{ background: 'white', color: '#0F6E56', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}
        >
          Compare →
        </button>
      </div>
    </div>
  )
}

// ─── Step 6: Comparison View ──────────────────────────────────────────────────

function CompareCell({ value, isBest, children }) {
  return (
    <td className={`px-4 py-3.5 text-sm align-top transition-colors ${isBest ? 'bg-emerald-50' : ''}`}>
      {children ?? (value ?? '—')}
    </td>
  )
}

function Step6_Compare({ candidates, clientCompany, onBack, benchmarkFingerprint = null }) {
  const top = candidates
  const compareRef = useRef(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const downloadPDF = async () => {
    if (!compareRef.current) return
    setPdfLoading(true)
    try {
      const el = compareRef.current
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', windowWidth: el.scrollWidth, windowHeight: el.scrollHeight })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight()
      const imgW = pageW, imgH = (canvas.height * pageW) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH)
      if (imgH > pageH) {
        let rem = imgH - pageH, pg = 1
        while (rem > 0) { pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, -(pg * pageH), imgW, imgH); rem -= pageH; pg++ }
      }
      pdf.save('Top_Candidates_Comparison.pdf')
    } finally { setPdfLoading(false) }
  }

  // Find best index (higher is better unless lowerBetter=true)
  const bestIdx = (vals, lowerBetter = false) => {
    const nums = vals.map((v, i) => ({ v: v ?? (lowerBetter ? Infinity : -Infinity), i }))
    return lowerBetter
      ? nums.reduce((b, x) => x.v < b.v ? x : b).i
      : nums.reduce((b, x) => x.v > b.v ? x : b).i
  }

  const hasBenchmark = benchmarkFingerprint != null

  const rows = [
    {
      label: 'Overall Score',
      vals: top.map(c => c.score),
      render: (c) => <span className="text-lg font-bold">{c.score}<span className="text-xs text-gray-400">/100</span></span>,
      best: bestIdx(top.map(c => c.score)),
      benchmarkRender: () => <span className="text-sm text-amber-600 italic font-medium">Reference</span>,
      highlightFn: null,
    },
    {
      label: 'Total Experience',
      vals: top.map(c => c.experience_total_months || 0),
      render: (c) => <span className="font-semibold">{fmtExpDisplay(c.total_experience_display, c.total_experience_years, c.experience_total_months)}</span>,
      best: bestIdx(top.map(c => c.experience_total_months || 0)),
      benchmarkRender: (fp) => fp.total_experience_years != null
        ? <span className="font-semibold text-amber-700">{fp.total_experience_years} yrs</span>
        : <span className="text-gray-300 text-sm">—</span>,
      highlightFn: (c, fp) => {
        if (fp.total_experience_years == null) return null
        const diff = Math.abs((c.total_experience_years || 0) - fp.total_experience_years)
        return diff <= 2 ? 'green' : 'amber'
      },
    },
    {
      label: 'Relevant Experience',
      vals: top.map(c => c.experience_relevant_months || 0),
      render: (c) => <span className="font-semibold">{fmtExpDisplay(c.relevant_experience_display, c.relevant_experience_years, c.experience_relevant_months)}</span>,
      best: bestIdx(top.map(c => c.experience_relevant_months || 0)),
      benchmarkRender: (fp) => fp.total_experience_years != null
        ? <span className="font-semibold text-amber-700">{fp.total_experience_years} yrs</span>
        : <span className="text-gray-300 text-sm">—</span>,
      highlightFn: (c, fp) => {
        if (fp.total_experience_years == null) return null
        const diff = Math.abs((c.relevant_experience_years || 0) - fp.total_experience_years)
        return diff <= 2 ? 'green' : 'amber'
      },
    },
    {
      label: 'Skills Matched',
      vals: top.map(c => c.matched_skills?.length || 0),
      render: (c) => (
        <div>
          <div className="font-semibold text-gray-800">{c.matched_skills?.length || 0} matched</div>
          {c.matched_skills?.length > 0 && <div className="text-xs text-gray-400 mt-0.5">{c.matched_skills.slice(0, 3).join(', ')}{c.matched_skills.length > 3 ? `…+${c.matched_skills.length - 3}` : ''}</div>}
        </div>
      ),
      best: bestIdx(top.map(c => c.matched_skills?.length || 0)),
      benchmarkRender: (fp) => fp.key_skills?.length > 0 ? (
        <div>
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wide mb-0.5">Benchmark skills</div>
          <div className="text-xs text-amber-700">{fp.key_skills.slice(0, 3).join(', ')}{fp.key_skills.length > 3 ? ` …+${fp.key_skills.length - 3}` : ''}</div>
        </div>
      ) : <span className="text-gray-300 text-sm">—</span>,
      highlightFn: (c, fp) => {
        if (!fp.key_skills?.length) return null
        const overlap = fp.key_skills.filter(skill =>
          (c.matched_skills || []).some(ms => ms.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(ms.toLowerCase()))
        ).length
        return overlap / fp.key_skills.length >= 0.5 ? 'green' : 'amber'
      },
    },
    {
      label: 'Missing Skills',
      vals: top.map(c => c.missing_skills?.length || 0),
      render: (c) => (
        <div>
          <div className={`font-semibold ${(c.missing_skills?.length || 0) === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {c.missing_skills?.length || 0} missing
          </div>
          {c.missing_skills?.length > 0 && <div className="text-xs text-gray-400 mt-0.5">{c.missing_skills.slice(0, 2).join(', ')}</div>}
        </div>
      ),
      best: bestIdx(top.map(c => c.missing_skills?.length || 0), true),
      benchmarkRender: () => <span className="text-gray-300 text-sm">—</span>,
      highlightFn: null,
    },
    {
      label: 'Company Fit Score',
      vals: top.map(c => c.company_fit?.company_fit_score ?? 0),
      render: (c) => c.company_fit?.company_fit_score != null ? (
        <div>
          <div className={`font-semibold ${c.company_fit.company_fit_score >= 7 ? 'text-emerald-600' : c.company_fit.company_fit_score >= 5 ? 'text-amber-600' : 'text-red-500'}`}>
            {c.company_fit.company_fit_score}/10
          </div>
          {c.company_fit.company_fit_verdict && <div className="text-xs text-gray-500 mt-0.5 capitalize">{c.company_fit.company_fit_verdict.replace(/_/g, ' ')}</div>}
          {c.company_fit.mismatch_flag && <div className="text-xs text-amber-600 mt-0.5">🟡 Mismatch</div>}
        </div>
      ) : <span className="text-gray-300">—</span>,
      best: bestIdx(top.map(c => c.company_fit?.company_fit_score ?? 0)),
      benchmarkRender: (fp) => fp.company_tier != null
        ? <span className="font-semibold text-amber-700">Tier {fp.company_tier}</span>
        : <span className="text-gray-300 text-sm">—</span>,
      highlightFn: (c, fp) => {
        if (fp.company_tier == null) return null
        return c.company_fit?.candidate_company_tier === fp.company_tier ? 'green' : 'amber'
      },
    },
    {
      label: 'Education',
      vals: top.map(c => c.degree_match === true ? 2 : c.degree_match === false ? 0 : 1),
      render: (c) => (
        <div>
          <div className={`font-semibold ${c.degree_match === true ? 'text-emerald-600' : c.degree_match === false ? 'text-red-500' : 'text-gray-600'}`}>
            {c.education_level || '—'}
            {c.degree_match === true && ' ✓'}
            {c.degree_match === false && ' ✗'}
          </div>
          {c.degree_mismatch_note && <div className="text-xs text-red-500 mt-0.5">{c.degree_mismatch_note}</div>}
        </div>
      ),
      best: bestIdx(top.map(c => c.degree_match === true ? 2 : c.degree_match === false ? 0 : 1)),
      benchmarkRender: (fp) => fp.education_level
        ? <span className="font-semibold text-amber-700">{fp.education_level}</span>
        : <span className="text-gray-300 text-sm">—</span>,
      highlightFn: (c, fp) => {
        if (!fp.education_level || !c.education_level) return null
        const fpIdx = EDU_ORDER.indexOf(fp.education_level)
        const cIdx  = EDU_ORDER.indexOf(c.education_level)
        if (fpIdx < 0 || cIdx < 0) return null
        return cIdx >= fpIdx ? 'green' : 'amber'
      },
    },
    {
      label: 'Job Hopping',
      vals: top.map(c => c.job_hopping_flags?.length > 0 ? 0 : 1),
      render: (c) => c.job_hopping_flags?.length > 0 ? (
        <div><div className="text-amber-600 font-semibold">🚩 Flagged</div>
          <div className="text-xs text-gray-400 mt-0.5">{c.job_hopping_flags.length} role{c.job_hopping_flags.length !== 1 ? 's' : ''} &lt; 12m</div></div>
      ) : <span className="text-emerald-600 font-semibold">✓ Clean</span>,
      best: bestIdx(top.map(c => c.job_hopping_flags?.length > 0 ? 0 : 1)),
      benchmarkRender: (fp) => fp.career_stability
        ? <span className={fp.career_stability === 'stable' ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>{fp.career_stability.charAt(0).toUpperCase() + fp.career_stability.slice(1)}</span>
        : <span className="text-gray-300 text-sm">—</span>,
      highlightFn: null,
    },
    {
      label: 'Career Gaps',
      vals: top.map(c => {
        const sig = c.career_gaps?.filter(g => g.gap_months > 6).length || 0
        return sig === 0 ? 1 : 0
      }),
      render: (c) => {
        const sig = c.career_gaps?.filter(g => g.gap_months > 6) || []
        return sig.length > 0 ? (
          <div><div className="text-amber-600 font-semibold">⏸ {sig.length} gap{sig.length !== 1 ? 's' : ''} &gt;6m</div></div>
        ) : <span className="text-emerald-600 font-semibold">✓ No significant gaps</span>
      },
      best: bestIdx(top.map(c => (c.career_gaps?.filter(g => g.gap_months > 6).length || 0) === 0 ? 1 : 0)),
      benchmarkRender: () => <span className="text-gray-300 text-sm">—</span>,
      highlightFn: null,
    },
    {
      label: 'Key Strengths',
      vals: top.map(() => 0),
      render: (c) => c.strengths?.length > 0 ? (
        <ul className="space-y-0.5">{c.strengths.slice(0, 2).map((s, i) => <li key={i} className="text-xs text-gray-600 flex gap-1"><span className="text-emerald-400 flex-shrink-0">✓</span>{s}</li>)}</ul>
      ) : <span className="text-gray-300 text-xs">—</span>,
      best: -1,
      benchmarkRender: (fp) => fp.standout_qualities?.length > 0 ? (
        <ul className="space-y-0.5">{fp.standout_qualities.slice(0, 2).map((s, i) => <li key={i} className="text-xs text-amber-700 flex gap-1"><span className="text-amber-400 flex-shrink-0">★</span>{s}</li>)}</ul>
      ) : <span className="text-gray-300 text-xs">—</span>,
      highlightFn: null,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="w-full px-6 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors mb-2">
              ← Back to results
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{top.length} Candidate Comparison</h2>
            {clientCompany && <p className="text-sm text-gray-500 mt-0.5">Screening for: {clientCompany}</p>}
          </div>
          <button onClick={downloadPDF} disabled={pdfLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${pdfLoading ? 'bg-indigo-300 text-white cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
            {pdfLoading ? <><Spinner className="w-4 h-4" />Generating…</> : <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>Download Comparison PDF</>}
          </button>
        </div>

        <ProTip tipId="compare_scores" text="When scores are close (within 5–10 points), look at 'Skills Matched' and 'Relevant Experience' — these often separate equally-scored candidates for client-specific roles." />

        <div style={{ overflowX: 'auto', width: '100%' }}>
        <div ref={compareRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ minWidth: hasBenchmark ? `${140 + 160 + 180 * top.length}px` : `${140 + 180 * top.length}px` }}>
          {/* Candidate headers */}
          <div className={`grid border-b border-gray-100`} style={{ gridTemplateColumns: hasBenchmark ? `minmax(140px,200px) minmax(160px,180px) repeat(${top.length},minmax(180px,1fr))` : `minmax(140px,200px) repeat(${top.length},minmax(180px,1fr))` }}>
            <div className="px-4 py-4 bg-gray-50 border-r border-gray-100 min-w-0 overflow-hidden">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Criteria</p>
            </div>
            {hasBenchmark && (
              <div className="px-4 py-4 border-r border-amber-200 min-w-0 overflow-hidden" style={{ background: '#FAEEDA' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-amber-500 text-base leading-none">★</span>
                  <p className="font-bold text-amber-900 text-sm">Benchmark</p>
                </div>
                <p className="text-xs text-amber-600 truncate leading-snug">
                  {benchmarkFingerprint.candidate_name || 'Ideal Profile'}
                </p>
                {benchmarkFingerprint.current_role && (
                  <p className="text-[10px] text-amber-400 mt-0.5 truncate">{benchmarkFingerprint.current_role}</p>
                )}
              </div>
            )}
            {top.map((c, i) => (
              <div key={i} className={`px-4 py-4 min-w-0 overflow-hidden ${i < top.length - 1 ? 'border-r border-gray-100' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <ScoreRing score={c.score} size={40} />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="font-bold text-gray-900 truncate" style={{ fontSize: 13, maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.candidate_name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.current_role}</p>
                  </div>
                </div>
                <div className="mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${TIER_COLOR[c.company_fit?.candidate_company_tier] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {c.company_fit?.candidate_current_company || c.filename}
                  </span>
                </div>
                {c.benchmark_match_percent != null && (
                  <div className="mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      c.benchmark_match_percent >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      c.benchmark_match_percent >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      🎯 Bench {c.benchmark_match_percent}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Comparison rows */}
          {rows.map((row, ri) => (
            <div key={ri} className={`grid border-b border-gray-50 ${ri % 2 === 0 ? '' : 'bg-gray-50/30'}`}
              style={{ gridTemplateColumns: hasBenchmark ? `minmax(140px,200px) minmax(160px,180px) repeat(${top.length},minmax(180px,1fr))` : `minmax(140px,200px) repeat(${top.length},minmax(180px,1fr))` }}>
              <div className="px-4 py-3.5 border-r border-gray-100 flex items-start min-w-0 overflow-hidden">
                <p className="text-xs font-semibold text-gray-500 truncate">{row.label}</p>
              </div>
              {hasBenchmark && (
                <div className="px-4 py-3.5 border-r border-amber-100 min-w-0 overflow-hidden" style={{ background: '#FDFAF4' }}>
                  {row.benchmarkRender ? row.benchmarkRender(benchmarkFingerprint) : <span className="text-gray-300 text-sm">—</span>}
                </div>
              )}
              {top.map((c, i) => {
                const benchHL = hasBenchmark && row.highlightFn ? row.highlightFn(c, benchmarkFingerprint) : null
                const cellBg = (i === row.best && row.best !== -1) ? 'bg-emerald-50'
                             : benchHL === 'green' ? 'bg-green-50'
                             : benchHL === 'amber' ? 'bg-amber-50/40'
                             : ''
                return (
                  <div key={i} className={`px-4 py-3.5 min-w-0 overflow-hidden ${i < top.length - 1 ? 'border-r border-gray-100' : ''} ${cellBg}`}>
                    {row.render(c)}
                    {i === row.best && row.best !== -1 && (
                      <span className="mt-1 inline-block text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">BEST</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          Green cells = best value in category or close match to benchmark · Amber cells = differs from benchmark · Comparison is indicative, not a replacement for human judgment
        </p>
      </div>
    </div>
  )
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [loginStep, setLoginStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRequestOtp = async () => {
    if (!email.trim()) return
    setIsLoading(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Failed to send code') }
      setLoginStep(2)
    } catch (e) { setError(e.message) }
    finally { setIsLoading(false) }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return
    setIsLoading(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otp }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('resumeai_recruiter', JSON.stringify(data.recruiter))
        onLogin(data.recruiter)
      } else {
        setError(data.message || 'Invalid or expired code. Please try again.')
      }
    } catch (e) { setError(e.message) }
    finally { setIsLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-xl">ResumeAI</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {loginStep === 1 ? 'Sign in to continue' : 'Check your email'}
          </h2>
          <p className="text-gray-500 mt-1.5 text-sm">
            {loginStep === 1 ? 'Enter your details to receive a login code' : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          {loginStep === 1 ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Work Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && email.trim() && handleRequestOtp()}
                  placeholder="you@company.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>}
              <button onClick={handleRequestOtp} disabled={!email.trim() || isLoading}
                className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all ${email.trim() && !isLoading ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                {isLoading ? <span className="flex items-center justify-center gap-2"><Spinner />Sending code…</span> : 'Send login code →'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">6-digit code</label>
                <input type="text" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && otp.length === 6 && handleVerifyOtp()}
                  placeholder="000000" maxLength={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-center tracking-[0.4em] text-xl font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>}
              <button onClick={handleVerifyOtp} disabled={otp.length !== 6 || isLoading}
                className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all ${otp.length === 6 && !isLoading ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                {isLoading ? <span className="flex items-center justify-center gap-2"><Spinner />Verifying…</span> : 'Verify and sign in →'}
              </button>
              <div className="text-center space-x-3">
                <button onClick={() => { setLoginStep(1); setOtp(''); setError(null) }}
                  className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">← Change email</button>
                <span className="text-gray-200">|</span>
                <button onClick={handleRequestOtp} disabled={isLoading}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">Resend code</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Projects Dashboard ────────────────────────────────────────────────────────

function NewProjectModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setIsSaving(true)
    try { await onSave({ name: name.trim(), client_name: clientName.trim() }) }
    finally { setIsSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">New Project</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-2xl leading-none">×</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && handleSave()}
              placeholder="e.g. Senior Data Analyst — Q2 Hiring"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Client Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
              placeholder="e.g. Volkswagen India"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!name.trim() || isSaving}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${name.trim() && !isSaving ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {isSaving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminDashboard({ recruiter, onLogout, onBackToProjects, onOpenProject }) {
  const [stats, setStats] = useState(null)
  const [recruiters, setRecruiters] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [recruiterFilter, setRecruiterFilter] = useState('all')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [sRes, rRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`),
        fetch(`${API_URL}/api/admin/recruiters`),
        fetch(`${API_URL}/api/admin/projects`),
      ])
      if (!sRes.ok || !rRes.ok || !pRes.ok) throw new Error('Failed to load')
      const [s, r, p] = await Promise.all([sRes.json(), rRes.json(), pRes.json()])
      setStats(s)
      setRecruiters(r)
      setProjects(p)
    } catch {
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const fmtDate = iso => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const lastActiveLabel = iso => {
    if (!iso) return { text: 'No activity', color: 'text-gray-400' }
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
    if (days === 0) return { text: 'Today', color: 'text-emerald-600 font-semibold' }
    if (days <= 7) return { text: `${days}d ago`, color: 'text-amber-500' }
    return { text: `${days}d ago`, color: 'text-gray-400' }
  }

  const statCards = stats ? [
    { label: 'Total Recruiters', value: stats.total_recruiters, color: 'text-blue-600', bg: 'bg-blue-50', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { label: 'Total Projects', value: stats.total_projects, color: 'text-purple-600', bg: 'bg-purple-50', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> },
    { label: 'Candidates Screened', value: stats.total_candidates_screened, color: 'text-gray-700', bg: 'bg-gray-100', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { label: 'Shortlisted', value: stats.total_shortlisted, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: 'On Hold', value: stats.total_on_hold, color: 'text-amber-600', bg: 'bg-amber-50', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: 'Rejected', value: stats.total_rejected, color: 'text-red-500', bg: 'bg-red-50', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ] : []

  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="w-8 h-8 bg-gray-200 rounded-xl mb-3" />
      <div className="w-16 h-8 bg-gray-200 rounded mb-2" />
      <div className="w-24 h-3 bg-gray-200 rounded" />
    </div>
  )

  const SkeletonRow = ({ cols = 5 }) => (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
      ))}
    </tr>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-base">ResumeAI</span>
              <span className="text-gray-300">|</span>
              <button onClick={onBackToProjects}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1">
                ← Projects
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 font-medium hidden sm:block">{recruiter.name}</span>
              <button onClick={onLogout} className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">Sign out</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Platform activity — Agile Technology Solutions</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button onClick={fetchData}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* ── Overview Stats ── */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : statCards.map(card => (
                  <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className={`w-9 h-9 ${card.bg} ${card.color} rounded-xl flex items-center justify-center mb-3`}>
                      {card.icon}
                    </div>
                    <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
                    <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">{card.label}</div>
                  </div>
                ))
            }
          </div>
        </section>

        {/* ── Recruiter Activity ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recruiter Activity</h2>
            <p className="text-sm text-gray-500">Sorted by candidates screened</p>
          </div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-gray-500">Filter by recruiter:</span>
            <select value={recruiterFilter} onChange={e => setRecruiterFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
              <option value="all">All Recruiters</option>
              {recruiters.map(r => (
                <option key={r.id} value={String(r.id)}>{r.name} ({r.email})</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full bg-white text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Recruiter</th>
                  <th className="px-4 py-3 text-left">Projects</th>
                  <th className="px-4 py-3 text-left">Screened</th>
                  <th className="px-4 py-3 text-left">Shortlisted</th>
                  <th className="px-4 py-3 text-left">On Hold</th>
                  <th className="px-4 py-3 text-left">Rejected</th>
                  <th className="px-4 py-3 text-left">Shortlist %</th>
                  <th className="px-4 py-3 text-left">Last Active</th>
                  <th className="px-4 py-3 text-left">Role</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={9} />)
                  : (recruiterFilter === 'all' ? recruiters : recruiters.filter(r => String(r.id) === recruiterFilter))
                      .map((r, i) => {
                        const la = lastActiveLabel(r.last_active)
                        const pct = r.candidates_screened
                          ? Math.round((r.shortlisted || 0) / r.candidates_screened * 100)
                          : null
                        const pctCls = pct === null ? 'text-gray-400'
                          : pct > 30 ? 'text-emerald-600'
                          : pct >= 10 ? 'text-amber-600'
                          : 'text-red-500'
                        return (
                          <tr key={r.id}
                            className={`border-t border-gray-50 hover:bg-indigo-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-800">{r.name}</div>
                              <div className="text-[11px] text-gray-400">{r.email}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{r.projects_count}</td>
                            <td className="px-4 py-3 font-semibold text-gray-700">{r.candidates_screened}</td>
                            <td className={`px-4 py-3 font-semibold ${(r.shortlisted || 0) > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {r.shortlisted || 0}
                            </td>
                            <td className={`px-4 py-3 font-semibold ${(r.on_hold || 0) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                              {r.on_hold || 0}
                            </td>
                            <td className={`px-4 py-3 font-semibold ${(r.rejected || 0) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                              {r.rejected || 0}
                            </td>
                            <td className={`px-4 py-3 font-semibold ${pctCls}`}>
                              {pct === null ? '—' : `${pct}%`}
                            </td>
                            <td className={`px-4 py-3 ${la.color}`}>{la.text}</td>
                            <td className="px-4 py-3">
                              {r.is_admin
                                ? <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Admin</span>
                                : <span className="text-gray-400 text-xs">Recruiter</span>
                              }
                            </td>
                          </tr>
                        )
                      })
                }
              </tbody>
            </table>
          </div>
        </section>

        {/* ── All Projects ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">All Projects</h2>
            <p className="text-sm text-gray-500">Most recent first</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full bg-white text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Project Name</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Created By</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Candidates</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                  : projects.map((p, i) => (
                      <tr key={p.id}
                        className={`border-t border-gray-50 hover:bg-indigo-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
                        <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                        <td className="px-4 py-3 text-gray-500">{p.client_name || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-700">{p.recruiter_name}</div>
                          <div className="text-[11px] text-gray-400">{p.created_by_email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-700">{p.candidates_count}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => onOpenProject({ id: p.id })}
                            className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors">
                            Open →
                          </button>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

function ProjectsDashboard({ recruiter, onLogout, onOpenProject, onAdminClick }) {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState(null)

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects`)
      if (res.ok) setProjects(await res.json())
    } catch { /* silent */ }
    finally { setIsLoading(false) }
  }

  useEffect(() => { fetchProjects() }, [])

  const handleCreateProject = async ({ name, client_name }) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, client_name, created_by_email: recruiter.email }),
      })
      if (!res.ok) throw new Error('Failed to create project')
      const project = await res.json()
      setShowModal(false)
      onOpenProject(project)
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-base">ResumeAI</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 font-medium hidden sm:block">{recruiter.name}</span>
              {recruiter.is_admin && (
                <button onClick={onAdminClick}
                  className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Admin
                </button>
              )}
              <button onClick={onLogout} className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">Sign out</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage your screening projects</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm">
            + New Project
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
            ⚠️ {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24 flex-col gap-3">
            <Spinner className="w-8 h-8 text-indigo-400" />
            <p className="text-gray-400 text-sm">Loading projects…</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No projects yet</h3>
            <p className="text-gray-400 text-sm mb-6">Create your first screening project to get started</p>
            <button onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm">
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <div key={project.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base leading-snug">{project.name}</h3>
                  {project.client_name && (
                    <p className="text-sm text-indigo-600 mt-0.5 font-medium">{project.client_name}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      👤 {project.created_by_email.split('@')[0]}
                    </span>
                    <span className="text-[11px] text-gray-400">{fmtDate(project.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    <span className={`font-bold mr-1 ${project.candidate_count > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                      {project.candidate_count}
                    </span>
                    candidate{project.candidate_count !== 1 ? 's' : ''} screened
                  </span>
                  <button onClick={() => onOpenProject(project)}
                    className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors">
                    Open →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} onSave={handleCreateProject} />}
    </div>
  )
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-start gap-3 bg-white border border-red-200 rounded-2xl p-4 shadow-xl max-w-sm">
      <span className="text-red-500 text-xl flex-shrink-0">⚠️</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">Something went wrong</p>
        <p className="text-xs text-gray-500 mt-0.5">{message}</p>
      </div>
      <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none flex-shrink-0">×</button>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

const INIT_ANSWERS = { min_experience: '', max_experience: '', must_have_skills: '', nice_to_have_skills: '', client_company: '', work_location: '', industry: '', product_client_check: '' }
const INIT_KEYWORDS = { must_have: [], nice_to_have: [] }

const HYGIENE_QUESTIONS = [
  'What is your current CTC? (ask for fixed and variable separately)',
  'What is your expected CTC?',
  'What is your current notice period?',
  'Are you currently serving your notice period? If yes, what is your last working day?',
  'What is your current work location and native place?',
  'What is your primary reason for looking for a change?',
  'Do you have any other offers in hand currently? If yes — which companies, what CTC offered, and what stage?',
  'How many interviews are you currently appearing for?',
  'What is your expected joining date if selected?',
  'Are you open to travelling as part of the role if required?',
  'Have you worked directly with clients or was your role internal facing?',
  'Have you managed people or led a team? If yes, how many reportees?',
  'What is your current take-home per month?',
  'Does your current CTC include any variables or bonuses?',
  'Are there any joining bonuses or increments due that you would be forfeiting by leaving now?',
  'What is your minimum acceptable CTC to make this move?',
  'Why are you interested in this specific role?',
  'What do you know about our client company?',
]

export default function App() {
  // ── Invite token from URL ─────────────────────────────────────────────────
  const [inviteToken] = useState(() => new URLSearchParams(window.location.search).get('token'))

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [recruiter, setRecruiter] = useState(() => {
    const stored = safeJsonParse(localStorage.getItem('resumeai_recruiter'))
    const r = stored?.recruiter || stored  // normalize nested {recruiter:{...}} or flat object
    const expiry = localStorage.getItem('resumeai_session_expiry')
    if (r && expiry && Date.now() < parseInt(expiry)) return r
    return null
  })
  const [dailyContent, setDailyContent] = useState(null)

  // ── App view: 'projects' | 'screening' ────────────────────────────────────
  const [appView, setAppView]           = useState('home')
  const [currentProject, setCurrentProject] = useState(null)

  // ── Screening state ───────────────────────────────────────────────────────
  const [step, setStep]                   = useState(1)
  const [maxStep, setMaxStep]             = useState(1)
  const [jdText, setJdText]               = useState('')
  const [missingFields, setMissingFields] = useState([])
  const [answers, setAnswers]             = useState(INIT_ANSWERS)
  const [suggestedKeywords, setSuggested] = useState(INIT_KEYWORDS)
  const [selectedKeywords, setSelected]   = useState(INIT_KEYWORDS)
  const [candidates, setCandidates]       = useState([])
  const [jdGaps, setJdGaps]               = useState(null)
  const [jdHistory, setJdHistory]         = useState(() => loadHistory())
  const [isLoading, setIsLoading]         = useState(false)
  const [error, setError]                 = useState(null)
  const [compareSelection, setCompareSelection] = useState(new Set())
  const [compareWith, setCompareWith]     = useState([])
  const [benchmarkFile, setBenchmarkFile]               = useState(null)
  const [benchmarkFingerprint, setBenchmarkFingerprint] = useState(null)
  const [benchmarkPrompt, setBenchmarkPrompt]           = useState(null)  // null | { count }
  const [benchmarkUpdating, setBenchmarkUpdating]       = useState(false)

  const goToStep = (n) => { setStep(n); setMaxStep(s => Math.max(s, n)) }

  const handleToggleCompareSelect = (id) => {
    setCompareSelection(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 4) next.add(id)
      return next
    })
  }

  const handleClearCompareSelection = () => setCompareSelection(new Set())

  const handleCompare = (manualCandidates) => {
    if (manualCandidates?.length >= 2) {
      setCompareWith(manualCandidates)
    } else {
      const processable = candidates.filter(c => !c.client_conflict?.is_current_employee)
      const top3 = [...processable].sort((a, b) => b.score - a.score).slice(0, Math.min(3, processable.length))
      setCompareWith(top3)
    }
    goToStep(6)
  }

  // fetch daily content on mount when session is already restored (skipped login)
  useEffect(() => {
    if (recruiter) {
      fetch(`${API_URL}/api/daily-content`).then(r => r.ok ? r.json() : null).then(d => { if (d) setDailyContent(d) }).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLogin = (recruiterData) => {
    const normalized = recruiterData.recruiter || recruiterData  // normalize nested or flat
    localStorage.setItem('resumeai_recruiter', JSON.stringify(normalized))
    setRecruiter(normalized)
    setAppView('home')
    fetch(`${API_URL}/api/daily-content`).then(r => r.ok ? r.json() : null).then(d => { if (d) setDailyContent(d) }).catch(() => {})
  }

  const handleLogout = () => {
    localStorage.removeItem('resumeai_recruiter')
    localStorage.removeItem('resumeai_session_expiry')
    setRecruiter(null)
    setAppView('projects')
    setCurrentProject(null)
  }

  // ── Open a project ────────────────────────────────────────────────────────
  const handleOpenProject = async (projectStub) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectStub.id}`)
      if (!res.ok) throw new Error('Failed to load project')
      const data = await res.json()
      setCurrentProject(data)

      if (data.candidates && data.candidates.length > 0) {
        // Project already has screened candidates → jump to results
        setJdText(data.jd_text || '')
        const ctx = safeJsonParse(data.jd_context, {})
        setAnswers({ ...INIT_ANSWERS, ...ctx })
        const loaded = data.candidates.map(c => {
          const parsed = safeJsonParse(c.result_json, {})
          return {
            ...parsed,
            id: c.id,
            comments: '',
            status: c.status || 'pending',
            remark: c.remark || '',
            linkedin_url: c.linkedin_url || '',
            linkedin_text: c.linkedin_text || '',
            benchmark_match_percent: c.benchmark_match_percent ?? parsed.benchmark_match_percent,
            benchmark_similarities: c.benchmark_similarities ? safeJsonParse(c.benchmark_similarities, []) : (parsed.benchmark_similarities || []),
            benchmark_differences: c.benchmark_differences ? safeJsonParse(c.benchmark_differences, []) : (parsed.benchmark_differences || []),
            benchmark_verdict: c.benchmark_verdict ?? parsed.benchmark_verdict,
            candidate_phone: c.candidate_phone ?? parsed.candidate_phone ?? null,
            is_duplicate: c.is_duplicate ?? false,
            duplicate_projects: Array.isArray(c.duplicate_projects) ? c.duplicate_projects : [],
            pipeline_stage: c.pipeline_stage || 'screened',
          }
        })
        setCandidates(loaded)
        setJdGaps(null)
        setCompareSelection(new Set()); setCompareWith([])
        setBenchmarkFile(null)
        setBenchmarkFingerprint(data.benchmark_fingerprint ? safeJsonParse(data.benchmark_fingerprint, null) : null)
        setStep(5); setMaxStep(5)
      } else if (data.jd_text) {
        // JD saved but no candidates yet → resume at upload step
        setJdText(data.jd_text)
        const ctx = safeJsonParse(data.jd_context, {})
        setAnswers({ ...INIT_ANSWERS, ...ctx })
        const kw = safeJsonParse(data.keywords, null)
        if (kw) {
          setSuggested({ must_have: kw.must_have || [], nice_to_have: kw.nice_to_have || [] })
          setSelected({ must_have: kw.must_have || [], nice_to_have: kw.nice_to_have || [] })
        } else {
          setSuggested(INIT_KEYWORDS); setSelected(INIT_KEYWORDS)
        }
        setCandidates([]); setJdGaps(null)
        setBenchmarkFile(null)
        setBenchmarkFingerprint(data.benchmark_fingerprint ? safeJsonParse(data.benchmark_fingerprint, null) : null)
        setStep(4); setMaxStep(4)
      } else {
        // Fresh project → start from step 1
        setJdText(''); setMissingFields([])
        setAnswers(INIT_ANSWERS); setSuggested(INIT_KEYWORDS); setSelected(INIT_KEYWORDS)
        setCandidates([]); setJdGaps(null)
        setBenchmarkFile(null); setBenchmarkFingerprint(null)
        setStep(1); setMaxStep(1)
      }
      setAppView('screening')
    } catch (e) { setError(e.message) }
  }

  // ── Step 1 → 2: analyse JD ────────────────────────────────────────────────
  const handleJdSubmit = async ({ text, file }) => {
    setIsLoading(true); setError(null)
    try {
      const form = new FormData()
      if (file) form.append('jd_file', file)
      else form.append('job_description', text)

      const res = await fetch(`${API_URL}/api/analyze-jd`, { method: 'POST', body: form })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Failed to analyse JD') }
      const data = await res.json()

      setJdText(data.job_description || text || '')
      setMissingFields(data.missing_fields || [])
      const ext = data.extracted || {}
      setAnswers({
        min_experience:       ext.min_experience?.toString() || '',
        max_experience:       ext.max_experience?.toString() || '',
        must_have_skills:     Array.isArray(ext.must_have_skills)    ? ext.must_have_skills.join(', ')    : '',
        nice_to_have_skills:  Array.isArray(ext.nice_to_have_skills) ? ext.nice_to_have_skills.join(', ') : '',
        client_company:       ext.client_company        || '',
        work_location:        ext.work_location         || '',
        industry:             ext.industry              || '',
        product_client_check: ext.product_client_check  || '',
      })

      // Upload benchmark CV if provided (fire before advancing step)
      if (benchmarkFile && currentProject) {
        try {
          const bForm = new FormData()
          bForm.append('benchmark_cv', benchmarkFile)
          const bRes = await fetch(`${API_URL}/api/projects/${currentProject.id}/benchmark`, { method: 'POST', body: bForm })
          if (bRes.ok) {
            const fp = await bRes.json()
            setBenchmarkFingerprint(fp)
            // Check DB for existing candidates — local state may be empty on a new run
            try {
              const projRes = await fetch(`${API_URL}/api/projects/${currentProject.id}`)
              if (projRes.ok) {
                const projData = await projRes.json()
                const existingCount = projData.candidates?.length || 0
                if (existingCount > 0) {
                  setBenchmarkPrompt({ count: existingCount })
                }
              }
            } catch { /* non-blocking */ }
          }
        } catch { /* non-blocking — benchmark is optional */ }
      }

      goToStep(2)
    } catch (e) { setError(e.message) }
    finally { setIsLoading(false) }
  }

  const handleApplyBenchmark = async () => {
    if (!currentProject) return
    setBenchmarkUpdating(true)
    try {
      const res = await fetch(`${API_URL}/api/projects/${currentProject.id}/apply-benchmark`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.candidates && data.candidates.length > 0) {
          // Build a map of id → benchmark fields extracted from the updated result_json
          const benchMap = {}
          data.candidates.forEach(c => {
            const r = safeJsonParse(c.result_json, {})
            benchMap[c.id] = {
              benchmark_match_percent: r.benchmark_match_percent ?? null,
              benchmark_similarities: Array.isArray(r.benchmark_similarities) ? r.benchmark_similarities : [],
              benchmark_differences: Array.isArray(r.benchmark_differences) ? r.benchmark_differences : [],
              benchmark_verdict: r.benchmark_verdict ?? null,
            }
          })
          setCandidates(prev => {
            if (prev.length === 0) {
              // Empty state (e.g. after "New Run") — build full candidates from API response
              return data.candidates.map(c => {
                const parsed = safeJsonParse(c.result_json, {})
                return {
                  ...parsed,
                  id: c.id,
                  comments: '',
                  status: c.status || 'pending',
                  pipeline_stage: c.pipeline_stage || 'screened',
                  remark: c.remark || '',
                  linkedin_url: c.linkedin_url || '',
                  linkedin_text: c.linkedin_text || '',
                  benchmark_match_percent: parsed.benchmark_match_percent ?? null,
                  benchmark_similarities: Array.isArray(parsed.benchmark_similarities) ? parsed.benchmark_similarities : [],
                  benchmark_differences: Array.isArray(parsed.benchmark_differences) ? parsed.benchmark_differences : [],
                  benchmark_verdict: parsed.benchmark_verdict ?? null,
                }
              })
            }
            // Merge benchmark data into existing state — preserves comments, status, etc.
            return prev.map(c => {
              const bench = benchMap[c.id]
              return bench ? { ...c, ...bench } : c
            })
          })
          goToStep(5)
        }
      }
    } catch { /* non-blocking */ }
    finally {
      setBenchmarkUpdating(false)
      setBenchmarkPrompt(null)
    }
  }

  // ── Step 2 → 3: suggest keywords + save JD context to project ─────────────
  const handleClarifySubmit = async () => {
    setIsLoading(true); setError(null)
    try {
      const form = new FormData()
      form.append('job_description', jdText)
      Object.entries(answers).forEach(([k, v]) => form.append(k, v))

      const res = await fetch(`${API_URL}/api/suggest-keywords`, { method: 'POST', body: form })
      if (!res.ok) throw new Error('Failed to suggest keywords')
      const data = await res.json()

      setSuggested({ must_have: data.must_have_keywords || [], nice_to_have: data.nice_to_have_keywords || [] })
      setSelected(INIT_KEYWORDS)

      if (currentProject) {
        fetch(`${API_URL}/api/projects/${currentProject.id}/jd-context`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jd_text: jdText,
            jd_context: JSON.stringify(answers),
            required_location: answers.work_location || '',
            keywords: '',
          }),
        }).catch(() => {})
      }

      goToStep(3)
    } catch (e) { setError(e.message) }
    finally { setIsLoading(false) }
  }

  // ── Step 3 → 4: save selected keywords to project ─────────────────────────
  const handleKeywordsConfirm = () => {
    if (currentProject) {
      fetch(`${API_URL}/api/projects/${currentProject.id}/jd-context`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd_text: jdText,
          jd_context: JSON.stringify(answers),
          required_location: answers.work_location || '',
          keywords: JSON.stringify(selectedKeywords),
        }),
      }).catch(() => {})
    }
    goToStep(4)
  }

  // ── Step 4 → 5: analyse resumes + save candidates to project ──────────────
  const handleAnalyze = async (files) => {
    setError(null)
    const form = new FormData()
    form.append('job_description', jdText)
    form.append('client_company', answers.client_company || '')
    form.append('min_experience', answers.min_experience || '')
    form.append('max_experience', answers.max_experience || '')
    const mustAll = [answers.must_have_skills, selectedKeywords.must_have.join(', ')].filter(Boolean).join(', ')
    const niceAll = [answers.nice_to_have_skills, selectedKeywords.nice_to_have.join(', ')].filter(Boolean).join(', ')
    form.append('must_have_skills', mustAll)
    form.append('nice_to_have_skills', niceAll)
    form.append('work_location', answers.work_location || '')
    form.append('industry', answers.industry || '')
    form.append('product_client_check', answers.product_client_check || '')
    if (benchmarkFingerprint) form.append('benchmark_fingerprint', JSON.stringify(benchmarkFingerprint))
    files.forEach(f => form.append('resumes', f))

    const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', body: form })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error(e.detail || `Server error ${res.status}`)
    }
    const data = await res.json()
    if (!data.candidates?.length) throw new Error(data.errors?.[0]?.error || 'No resumes could be processed.')

    // Save candidates to DB project and get real DB IDs for status persistence
    let savedCandidates = data.candidates
    if (currentProject) {
      const saves = await Promise.allSettled(
        data.candidates.map(c =>
          fetch(`${API_URL}/api/projects/${currentProject.id}/candidates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: c.candidate_name || '',
              filename: c.filename || '',
              score: c.score || 0,
              result_json: JSON.stringify(c),
              candidate_phone: c.candidate_phone || null,
            }),
          }).then(r => r.ok ? r.json() : null).catch(() => null)
        )
      )
      savedCandidates = data.candidates.map((c, i) => {
        const saved = saves[i]?.value
        if (!saved) return c
        return {
          ...c,
          id: saved.id,
          pipeline_stage: 'screened',
          is_duplicate: Array.isArray(saved.duplicate_info) && saved.duplicate_info.length > 0,
          duplicate_projects: saved.duplicate_info || [],
        }
      })
    }

    setCandidates(savedCandidates)
    setJdGaps(data.jd_gaps ?? null)
    setCompareSelection(new Set()); setCompareWith([])
    setBenchmarkFile(null)

    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      jdText,
      clientCompany: answers.client_company || '',
      answers: { ...answers },
      selectedKeywords: { must_have: [...selectedKeywords.must_have], nice_to_have: [...selectedKeywords.nice_to_have] },
      results: { candidates: data.candidates, jd_gaps: data.jd_gaps ?? null },
    }
    setJdHistory(saveToHistory(entry))

    if (data.errors?.length) setError(`${data.errors.length} file(s) skipped: ${data.errors[0].error}`)
    goToStep(5)
  }

  // ── History handlers (localStorage) ───────────────────────────────────────
  const handleViewHistory = (entry) => {
    setCandidates(entry.results.candidates)
    setJdGaps(entry.results.jd_gaps ?? null)
    setJdText(entry.jdText)
    setAnswers(entry.answers || INIT_ANSWERS)
    setSelected(entry.selectedKeywords || INIT_KEYWORDS)
    setCompareSelection(new Set()); setCompareWith([])
    setBenchmarkFile(null); setBenchmarkFingerprint(null)
    goToStep(5)
  }

  const handleReuseSession = (entry) => {
    setJdText(entry.jdText)
    setAnswers(entry.answers || INIT_ANSWERS)
    setSelected(entry.selectedKeywords || INIT_KEYWORDS)
    setSuggested({ must_have: entry.selectedKeywords?.must_have || [], nice_to_have: entry.selectedKeywords?.nice_to_have || [] })
    setMissingFields([])
    setCompareSelection(new Set()); setCompareWith([])
    setBenchmarkFile(null); setBenchmarkFingerprint(null)
    goToStep(4)
  }

  // ── Reset — go back to projects dashboard ─────────────────────────────────
  const handleReset = () => {
    setStep(1); setMaxStep(1)
    setJdText(''); setMissingFields([])
    setAnswers(INIT_ANSWERS); setSuggested(INIT_KEYWORDS); setSelected(INIT_KEYWORDS)
    setCandidates([]); setJdGaps(null); setError(null)
    setCompareSelection(new Set()); setCompareWith([])
    setBenchmarkFile(null); setBenchmarkFingerprint(null)
    setAppView('projects'); setCurrentProject(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const rightSlot = (
    <div className="flex items-center gap-2 flex-shrink-0">
      {step >= 5 && appView === 'screening' && (
        <button onClick={() => { setStep(1); setMaxStep(1); setJdText(''); setMissingFields([]); setAnswers(INIT_ANSWERS); setSuggested(INIT_KEYWORDS); setSelected(INIT_KEYWORDS); setCandidates([]); setJdGaps(null); setError(null) }}
          className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors hidden sm:block">
          New Run
        </button>
      )}
      {appView === 'screening' && (
        <button onClick={() => { setAppView('projects'); setCurrentProject(null) }}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
          ← Projects
        </button>
      )}
      {recruiter && (
        <button onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors">
          Sign out
        </button>
      )}
    </div>
  )

  const handleNavigate = (view) => setAppView(view)

  return (
    <>
      <NewGlobalStyles />
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      {!recruiter && inviteToken && (
        <ActivationPage token={inviteToken} onActivated={handleLogin} />
      )}
      {!recruiter && !inviteToken && <NewLoginScreen onLogin={handleLogin} />}

      {recruiter && appView === 'home' && (
        <HomeDashboard recruiter={recruiter} appView={appView} onNavigate={handleNavigate} onOpenProject={handleOpenProject} onLogout={handleLogout} dailyContent={dailyContent} onToastDone={() => setDailyContent(null)} />
      )}

      {recruiter && appView === 'projects' && (
        <NewProjectsDashboard recruiter={recruiter} appView={appView} onNavigate={handleNavigate} onLogout={handleLogout} onOpenProject={handleOpenProject} />
      )}

      {recruiter && appView === 'admin' && (
        <NewAdminDashboard recruiter={recruiter} appView={appView} onNavigate={handleNavigate} onLogout={handleLogout} onOpenProject={handleOpenProject} />
      )}

      {recruiter && appView === 'games' && (
        <GamesPage recruiter={recruiter} onNavigate={handleNavigate} />
      )}

      {recruiter && appView === 'screening' && (
        <div className="min-h-screen bg-primary-bg">
          <AppHeader recruiter={recruiter} appView={appView} onNavigate={handleNavigate} onLogout={handleLogout} />
          <div className="w-full px-6 py-8">
            <div className="mb-6">
              <NewStepIndicator step={step} maxStep={maxStep} onStepClick={goToStep} />
            </div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => { setAppView('projects'); setCurrentProject(null) }}
                className="text-xs text-primary hover:text-primary-light font-medium transition-colors">
                ← Back to Projects
              </button>
              {step >= 5 && (
                <button onClick={() => { setStep(1); setMaxStep(1); setJdText(''); setMissingFields([]); setAnswers(INIT_ANSWERS); setSuggested(INIT_KEYWORDS); setSelected(INIT_KEYWORDS); setCandidates([]); setJdGaps(null); setError(null) }}
                  className="text-xs text-ink-3 hover:text-ink-2 font-medium transition-colors">
                  New Run
                </button>
              )}
            </div>
            {step === 1 && (
              <Step1_JDInput jdHistory={jdHistory} onSubmit={handleJdSubmit} onViewHistory={handleViewHistory} onReuseSession={handleReuseSession} isLoading={isLoading} jdGaps={jdGaps} benchmarkFile={benchmarkFile} onBenchmarkFileChange={f => { setBenchmarkFile(f); if (f) trackFeature(recruiter?.email, 'benchmark_upload') }} />
            )}
            {step === 2 && (
              <Step2_Clarify jdText={jdText} answers={answers} setAnswers={setAnswers} missingFields={missingFields} onContinue={handleClarifySubmit} isLoading={isLoading} jdGaps={jdGaps} />
            )}
            {step === 3 && (
              <Step3_Keywords suggestedKeywords={suggestedKeywords} selectedKeywords={selectedKeywords} setSelectedKeywords={setSelected} onContinue={handleKeywordsConfirm} />
            )}
            {step === 4 && (
              <Step4_Upload answers={answers} onAnalyze={handleAnalyze} />
            )}
            {step === 5 && (
              <Step5_Results initialCandidates={candidates} jdGaps={jdGaps} clientCompany={answers.client_company || ''} answers={answers} jdText={jdText} onCompare={handleCompare} onReset={handleReset} projectId={currentProject?.id} compareSelection={compareSelection} onToggleCompareSelect={handleToggleCompareSelect} onClearCompareSelection={handleClearCompareSelection} recruiterName={recruiter?.name || ''} recruiterEmail={recruiter?.email || ''} />
            )}
            {step === 6 && (
              <Step6_Compare candidates={compareWith} clientCompany={answers.client_company || ''} onBack={() => goToStep(5)} benchmarkFingerprint={benchmarkFingerprint} />
            )}
          </div>
        </div>
      )}

      {/* Benchmark apply-to-existing-candidates modal */}
      {benchmarkPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-amber-100">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎯</span>
              <h2 className="text-lg font-bold text-gray-900">Benchmark CV Uploaded</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              <span className="font-semibold text-amber-700">{benchmarkPrompt.count} candidate{benchmarkPrompt.count !== 1 ? 's' : ''}</span> were screened before this benchmark was added. Would you like to update their Bench Fit scores?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleApplyBenchmark}
                disabled={benchmarkUpdating}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl px-6 py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {benchmarkUpdating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Updating scores…
                  </>
                ) : (
                  'Yes, update all'
                )}
              </button>
              <button
                onClick={() => setBenchmarkPrompt(null)}
                disabled={benchmarkUpdating}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors disabled:opacity-50"
              >
                Skip — only new candidates get benchmark scoring
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
