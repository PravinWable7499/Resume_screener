import { useState, useEffect } from 'react'
import { API_URL } from '../../utils.js'

function RecruitmentIllustration() {
  const [score, setScore] = useState(0)

  useEffect(() => {
    let current = 0
    let direction = 1
    let frame

    const animate = () => {
      current += direction * 1.2

      if (current >= 92) {
        current = 92
        setTimeout(() => {
          direction = -1
          frame = requestAnimationFrame(animate)
        }, 1000)
        setScore(Math.round(current))
        return
      }

      if (current <= 0) {
        current = 0
        setTimeout(() => {
          direction = 1
          frame = requestAnimationFrame(animate)
        }, 800)
        setScore(0)
        return
      }

      setScore(Math.round(current))
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <svg viewBox="0 0 280 320" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto' }}>
      {/* Resume doc 1 */}
      <g className="float-1">
        <rect x="28" y="10" width="50" height="64" rx="4" fill="white" fillOpacity="0.18" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
        <line x1="36" y1="26" x2="70" y2="26" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="36" y1="34" x2="70" y2="34" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        <line x1="36" y1="41" x2="62" y2="41" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        <line x1="36" y1="48" x2="66" y2="48" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        <line x1="36" y1="55" x2="58" y2="55" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
      </g>
      {/* Resume doc 2 */}
      <g className="float-2">
        <rect x="115" y="4" width="50" height="64" rx="4" fill="white" fillOpacity="0.22" stroke="white" strokeOpacity="0.35" strokeWidth="1" />
        <line x1="123" y1="20" x2="157" y2="20" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="123" y1="28" x2="157" y2="28" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        <line x1="123" y1="35" x2="148" y2="35" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        <line x1="123" y1="42" x2="152" y2="42" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        <line x1="123" y1="49" x2="144" y2="49" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
      </g>
      {/* Resume doc 3 */}
      <g className="float-3">
        <rect x="202" y="10" width="50" height="64" rx="4" fill="white" fillOpacity="0.18" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
        <line x1="210" y1="26" x2="244" y2="26" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="210" y1="34" x2="244" y2="34" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        <line x1="210" y1="41" x2="236" y2="41" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        <line x1="210" y1="48" x2="240" y2="48" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        <line x1="210" y1="55" x2="232" y2="55" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
      </g>

      {/* Funnel */}
      <path d="M 60 88 L 220 88 L 168 132 L 168 155 L 112 155 L 112 132 Z" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.25" strokeWidth="1" />
      <line x1="140" y1="155" x2="140" y2="170" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />

      {/* Score ring background */}
      <circle cx="140" cy="210" r="44" fill="white" fillOpacity="0.08" />
      {/* Score ring track */}
      <circle cx="140" cy="210" r="38" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="5" />
      {/* Score ring animated fill */}
      <circle
        cx="140" cy="210" r="38"
        fill="none"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="239"
        strokeDashoffset={Math.round(239 * (1 - score / 100))}
        style={{ transformOrigin: '140px 210px', transform: 'rotate(-90deg)' }}
      />
      {/* Score number */}
      <text x="140" y="207" textAnchor="middle" fill="white" fontSize="22" fontWeight="500" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">{score}</text>
      <text x="140" y="222" textAnchor="middle" fill="white" fillOpacity="0.6" fontSize="9" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">SCORE</text>

      {/* Checkmark badge — only visible when score is meaningful */}
      {score > 10 && (
        <g style={{ transformOrigin: '195px 178px' }}>
          <circle cx="195" cy="178" r="16" fill="#1D9E75" />
          <polyline points="187,178 193,184 204,172" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {/* Logo area */}
      <text x="140" y="276" textAnchor="middle" fill="white" fontSize="18" fontWeight="500" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">🌿 ResumeAI</text>
      <text x="140" y="296" textAnchor="middle" fill="white" fillOpacity="0.65" fontSize="11" fontStyle="italic" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">Screen smarter. Hire better.</text>
    </svg>
  )
}

export default function LoginScreen({ onLogin }) {
  const [loginStep, setLoginStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)

  const handleRequestOtp = async () => {
    if (!name.trim() || !email.trim()) { setError('Please enter your name and email'); return }
    setIsLoading(true); setError(null); setAccessDenied(false)
    try {
      const res = await fetch(`${API_URL}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const data = await res.json()
      if (res.status === 403 && data.detail?.error === 'access_denied') {
        setAccessDenied(true)
        return
      }
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP')
      setLoginStep(2)
    } catch (e) { setError(e.message) }
    finally { setIsLoading(false) }
  }

  const handleVerifyOtp = async () => {
    if (!otp.trim()) { setError('Please enter the 6-digit code'); return }
    setIsLoading(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Invalid code')
      if (rememberMe) {
        localStorage.setItem('resumeai_session_expiry', String(Date.now() + 7 * 24 * 60 * 60 * 1000))
      } else {
        localStorage.removeItem('resumeai_session_expiry')
      }
      onLogin({ ...data, name: name.trim() })
    } catch (e) { setError(e.message) }
    finally { setIsLoading(false) }
  }

  return (
    <div className="login-outer" style={{ position: 'fixed', inset: 0, display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Left panel */}
      <div
        className="login-panel-left"
        style={{ width: '50%', height: '100vh', flexShrink: 0, overflow: 'hidden', background: '#0F6E56', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}
      >
        <div className="login-illustration" style={{ width: '100%' }}>
          <RecruitmentIllustration />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 32, textAlign: 'center' }}>
          Agile Technology Solutions, Pune
        </p>
      </div>

      {/* Right panel */}
      <div
        className="login-panel-right"
        style={{ width: '50%', height: '100vh', overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#F8FFFE' }}
      >
        <div style={{ width: '100%', maxWidth: 400, padding: '40px 48px' }}>
          <h1 className="text-primary font-medium text-2xl">Welcome back</h1>
          <p className="text-ink-3 text-sm mt-1 mb-8">Sign in to your ResumeAI workspace</p>

          {error && !accessDenied && (
            <div className="mb-4 px-3 py-2 bg-danger-bg border border-danger/20 rounded-lg text-danger text-sm">
              {error}
            </div>
          )}

          {accessDenied ? (
            <div className="space-y-5">
              <div style={{ border: '1.5px solid #fca5a5', borderRadius: 16, padding: '28px 24px', background: '#fff1f2', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>Access Restricted</h2>
                <p style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.6 }}>
                  You are not authorised to access ResumeAI. Please ask your admin to invite you at{' '}
                  <strong>chetan@agile-tech.in</strong>
                </p>
              </div>
              <button
                onClick={() => { setAccessDenied(false); setEmail(''); setName(''); setError(null) }}
                className="w-full py-2.5 border border-primary-border text-ink-2 rounded-lg text-sm font-medium hover:bg-primary-surface transition-colors"
              >
                ← Try a different email
              </button>
            </div>
          ) : loginStep === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-ink-2 text-xs mb-1.5">Your name</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRequestOtp()}
                  placeholder="Full name"
                  className="w-full border border-primary-border rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-primary-light bg-white"
                />
              </div>
              <div>
                <label className="block text-ink-2 text-xs mb-1.5">Work email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRequestOtp()}
                  placeholder="you@company.com"
                  className="w-full border border-primary-border rounded-lg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-primary-light bg-white"
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5F5E5A', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#0F6E56', width: 14, height: 14 }}
                />
                Remember me for 7 days
              </label>
              <button
                onClick={handleRequestOtp} disabled={isLoading}
                className="w-full py-2.5 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 mt-1"
              >
                {isLoading ? 'Sending…' : 'Send login code →'}
              </button>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-primary-border" />
                <span className="text-ink-3 text-xs">secure · OTP login</span>
                <div className="flex-1 h-px bg-primary-border" />
              </div>
              <div className="bg-primary-surface rounded-lg p-3 text-ink-2 text-xs leading-relaxed">
                We'll email a 6-digit code to your address. No password needed — your code expires in 10 minutes.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-success text-sm flex items-center gap-2">
                <span>✓</span> We sent a code to <strong>{email}</strong>
              </div>
              <div>
                <label className="block text-ink-2 text-xs mb-1.5">6-digit code</label>
                <input
                  type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                  placeholder="000000"
                  className="w-full border border-primary-border rounded-lg px-3.5 py-3 text-2xl tracking-widest text-center text-ink font-medium focus:outline-none focus:border-primary-light bg-white"
                  maxLength={6}
                />
              </div>
              <button
                onClick={handleVerifyOtp} disabled={isLoading}
                className="w-full py-2.5 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {isLoading ? 'Verifying…' : 'Verify and sign in'}
              </button>
              <button
                onClick={() => { setLoginStep(1); setOtp(''); setError(null) }}
                className="w-full text-ink-3 text-xs underline hover:text-ink-2"
              >
                Resend code or use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
