import { useState, useEffect } from 'react'
import { API_URL } from '../../utils.js'

export default function ActivationPage({ token, onActivated }) {
  const [phase, setPhase] = useState('validating') // validating | valid | activating | success | error
  const [inviteInfo, setInviteInfo] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/activate?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (!res.ok) {
          setErrorMsg(data.detail || 'This invitation link is invalid or has expired.')
          setPhase('error')
          return
        }
        setInviteInfo(data)
        setPhase('valid')
        // Auto-activate after showing the welcome state
        setTimeout(() => activateAccount(), 1200)
      } catch {
        setErrorMsg('Unable to validate your invitation. Please check your connection.')
        setPhase('error')
      }
    }
    validate()
  }, [token])

  const activateAccount = async () => {
    setPhase('activating')
    try {
      const res = await fetch(`${API_URL}/api/admin/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.detail || 'Activation failed. Please request a new invitation.')
        setPhase('error')
        return
      }
      setPhase('success')
      // Save recruiter and redirect
      const recruiter = data.recruiter
      localStorage.setItem('resumeai_recruiter', JSON.stringify(recruiter))
      localStorage.setItem('resumeai_session_expiry', String(Date.now() + 7 * 24 * 60 * 60 * 1000))
      // Clear token from URL
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => onActivated(recruiter), 1500)
    } catch {
      setErrorMsg('Activation failed. Please try again or request a new invitation.')
      setPhase('error')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F8FFFE', padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <span style={{ fontSize: 32 }}>🌿</span>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#0F6E56', marginTop: 6 }}>ResumeAI</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Agile Technology Solutions</div>
        </div>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: 20, padding: '36px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB',
        }}>
          {(phase === 'validating' || phase === 'valid' || phase === 'activating') && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                Activate your account
              </h1>
              {inviteInfo && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 14, color: '#374151' }}>
                    Welcome, <strong>{inviteInfo.name || inviteInfo.email}</strong>
                  </p>
                  <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{inviteInfo.email}</p>
                  <div style={{
                    display: 'inline-block', marginTop: 8,
                    padding: '3px 12px', borderRadius: 20,
                    fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                    background: inviteInfo.role === 'manager' ? '#EFF6FF' : '#ECFDF5',
                    color: inviteInfo.role === 'manager' ? '#1D4ED8' : '#065F46',
                    border: `1px solid ${inviteInfo.role === 'manager' ? '#BFDBFE' : '#A7F3D0'}`,
                  }}>
                    {inviteInfo.role}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#6B7280', fontSize: 13 }}>
                <svg style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#E5E7EB" strokeWidth="3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#0F6E56" strokeWidth="3" strokeLinecap="round" />
                </svg>
                {phase === 'activating' ? 'Activating your account…' : 'Validating invitation…'}
              </div>
            </>
          )}

          {phase === 'success' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#065F46', marginBottom: 8 }}>
                Welcome{inviteInfo?.name ? `, ${inviteInfo.name.split(' ')[0]}` : ''}!
              </h1>
              <p style={{ fontSize: 14, color: '#374151' }}>
                Your account is ready. Signing you in…
              </p>
            </>
          )}

          {phase === 'error' && (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#991B1B', marginBottom: 8 }}>
                Invitation Invalid
              </h1>
              <p style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.6, marginBottom: 20 }}>
                {errorMsg}
              </p>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                Contact <strong style={{ color: '#374151' }}>chetan@agile-tech.in</strong> for a new invitation.
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
