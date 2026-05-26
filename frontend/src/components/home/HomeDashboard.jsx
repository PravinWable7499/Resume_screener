import { useState, useEffect, useMemo } from 'react'
import { API_URL, fmtDate } from '../../utils.js'
import AppHeader from '../shared/AppHeader.jsx'

export default function HomeDashboard({ recruiter, appView, onNavigate, onOpenProject, onLogout, dailyContent, onToastDone }) {
  const [projects, setProjects] = useState([])
  const [daily, setDaily] = useState(null)
  const [stats, setStats] = useState(null)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [modalClosing, setModalClosing] = useState(false)
  const [showQuote, setShowQuote] = useState(true)
  const [tickerIdx, setTickerIdx] = useState(0)
  const [tickerVisible, setTickerVisible] = useState(true)
  const [gamesData, setGamesData] = useState(null)

  // Survey state
  const [showSurveyBanner, setShowSurveyBanner] = useState(false)
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [surveyDismissed, setSurveyDismissed] = useState(false)
  const [surveyQ1, setSurveyQ1] = useState(0)
  const [surveyQ2, setSurveyQ2] = useState('')
  const [surveyQ3, setSurveyQ3] = useState('')
  const [surveySubmitting, setSurveySubmitting] = useState(false)
  const [surveyDone, setSurveyDone] = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = recruiter?.name?.split(' ')[0] || 'there'

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/projects`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_URL}/api/daily-content`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_URL}/api/admin/stats`).then(r => r.ok ? r.json() : null).catch(() => null),
      recruiter?.email
        ? fetch(`${API_URL}/api/games/daily?email=${encodeURIComponent(recruiter.email)}`).then(r => r.ok ? r.json() : null).catch(() => null)
        : Promise.resolve(null),
    ]).then(([p, d, s, g]) => { setProjects(p); if (d) setDaily(d); if (s) setStats(s); if (g) setGamesData(g) })
  }, [])

  // Check monthly survey
  useEffect(() => {
    if (!recruiter?.email) return
    const remind = localStorage.getItem('resumeai_survey_remind')
    const today = new Date().toISOString().slice(0, 10)
    if (remind && remind > today) return
    fetch(`${API_URL}/api/survey/check?email=${encodeURIComponent(recruiter.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.completed) setShowSurveyBanner(true) })
      .catch(() => {})
  }, [recruiter?.email])

  // Show modal when dailyContent prop arrives from App.jsx; randomly pick quote or trivia
  useEffect(() => {
    if (dailyContent) {
      setShowQuote(Math.random() > 0.5)
      setShowQuoteModal(true)
    }
  }, [dailyContent])

  const recent = projects.slice(0, 8)
  const awaitingReview = projects.reduce((a, p) => a + (p.candidates_count || 0), 0)

  const tickerMessages = useMemo(() => {
    const msgs = []
    if (awaitingReview > 0) msgs.push(`🎯 ${awaitingReview} candidates awaiting your decision`)
    if (stats?.total_candidates_screened > 0 && stats?.total_shortlisted > 0)
      msgs.push(`📊 Shortlist rate: ${Math.round((stats.total_shortlisted / stats.total_candidates_screened) * 100)}%`)
    msgs.push(`💡 Tip: Use the Call Guide before every recruiter call`)
    if (stats?.total_candidates_screened > 0)
      msgs.push(`🔥 You've screened ${stats.total_candidates_screened} candidates total`)
    msgs.push(`⚡ ResumeAI screens a resume in under 30 seconds`)
    if (projects.length > 0)
      msgs.push(`👥 ${projects.length} open project${projects.length !== 1 ? 's' : ''} in your workspace`)
    return msgs
  }, [awaitingReview, stats, projects.length])

  useEffect(() => {
    if (tickerMessages.length <= 1) return
    const id = setInterval(() => {
      setTickerVisible(false)
      setTimeout(() => {
        setTickerIdx(i => (i + 1) % tickerMessages.length)
        setTickerVisible(true)
      }, 500)
    }, 5000)
    return () => clearInterval(id)
  }, [tickerMessages.length])

  const closeModal = () => {
    setModalClosing(true)
    setTimeout(() => { setShowQuoteModal(false); setModalClosing(false) }, 300)
  }

  useEffect(() => {
    if (!showQuoteModal) return
    const t = setTimeout(closeModal, 12000)
    return () => clearTimeout(t)
  }, [showQuoteModal])

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setCreateError('Project name is required')
      return
    }

    setCreating(true)
    setCreateError('')

    try {
      const recruiterData = JSON.parse(
        localStorage.getItem('resumeai_recruiter') || '{}'
      )

      const res = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          client_name: newClientName.trim() || null,
          created_by_email: recruiterData.email || '',
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || data.message || 'Failed to create project')
      }

      const project = await res.json()

      setShowNewProjectModal(false)
      setNewProjectName('')
      setNewClientName('')
      setCreateError('')

      if (onOpenProject) {
        onOpenProject(project)
      }
    } catch (err) {
      setCreateError(
        typeof err === 'string' ? err : err?.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setCreating(false)
    }
  }

  const handleSurveyDismiss = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    localStorage.setItem('resumeai_survey_remind', tomorrow.toISOString().slice(0, 10))
    setShowSurveyBanner(false)
    setSurveyDismissed(true)
  }

  const handleSurveySubmit = async () => {
    if (!surveyQ1 || !surveyQ2) return
    setSurveySubmitting(true)
    try {
      await fetch(`${API_URL}/api/survey/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recruiter_email: recruiter.email,
          q1_rating: surveyQ1,
          q2_rating: ['Less than 30 mins', '30 mins to 1 hour', '1 to 2 hours', 'More than 2 hours'].indexOf(surveyQ2) + 1,
          q3_text: surveyQ3,
        }),
      })
      setSurveyDone(true)
      setTimeout(() => { setShowSurveyModal(false); setShowSurveyBanner(false) }, 2000)
    } catch {}
    setSurveySubmitting(false)
  }

  const sidebarItems = [
    { icon: '🏠', label: 'Home', id: 'home' },
    { icon: '📁', label: 'Projects', id: 'projects' },
    { icon: '🎯', label: 'Games', id: 'games' },
    { icon: '⚙️', label: 'Settings', id: null },
  ]

  return (
    <div className="min-h-screen bg-primary-bg" style={{ width: '100%', paddingRight: 64 }}>
      <AppHeader recruiter={recruiter} appView={appView} onNavigate={onNavigate} onLogout={onLogout} />

      <main style={{ padding: 24, width: '100%', boxSizing: 'border-box' }}>
        <div className="space-y-6">
          {/* Greeting bar */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0F6E56, #1D9E75)',
              borderRadius: 14,
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              animation: 'spring-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          >
            <div>
              <p style={{ color: 'white', fontSize: 18, fontWeight: 500, margin: 0 }}>{greeting}, {firstName} 👋</p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
                {projects.length} open project{projects.length !== 1 ? 's' : ''} · {awaitingReview} candidate{awaitingReview !== 1 ? 's' : ''} screened
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 420 }}>
              {tickerMessages.length > 0 && (
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontStyle: 'italic', textAlign: 'right', margin: 0, opacity: tickerVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
                  {tickerMessages[tickerIdx]}
                </p>
              )}
              {!showQuoteModal && dailyContent && (
                <button
                  onClick={() => setShowQuoteModal(true)}
                  title="View today's thought"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, opacity: 0.85, flexShrink: 0 }}
                >💭</button>
              )}
            </div>
          </div>

          {/* Monthly survey banner */}
          {showSurveyBanner && !surveyDismissed && (
            <div style={{ background: 'linear-gradient(90deg, #0F6E56, #1D9E75)', borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'white', fontSize: 13 }}>📋 Quick 30-second survey — help us improve ResumeAI</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setShowSurveyModal(true)}
                  style={{ background: 'white', color: '#0F6E56', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Take survey →
                </button>
                <button onClick={handleSurveyDismiss}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 11, cursor: 'pointer' }}>
                  Remind me tomorrow
                </button>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
            {[
              { label: 'Total projects',         value: stats?.total_projects ?? projects.length,           color: '#2C2C2A', icon: '📁' },
              { label: 'Candidates screened',    value: stats?.total_candidates_screened ?? awaitingReview, color: '#2C2C2A', icon: '📄' },
              { label: 'Shortlisted',            value: stats?.total_shortlisted ?? 0,                     color: '#3B6D11', icon: '✅' },
              { label: 'Rejected',               value: stats?.total_rejected ?? 0,                        color: '#A32D2D', icon: '❌' },
              { label: 'Interviews Scheduled',   value: stats?.total_interviewing ?? 0,                    color: '#7C3AED', icon: '🗓️' },
              { label: 'Joined',                 value: stats?.total_joined ?? 0,                          color: '#3B6D11', icon: '🎉' },
            ].map(card => (
              <div key={card.label} style={{ background: 'white', border: '0.5px solid #e0f0ec', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 18 }}>{card.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, color: card.color }}>{card.value ?? '—'}</div>
                <div style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Recent projects */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-ink font-medium text-base">Your projects</h2>
              <button
                onClick={() => { setCreateError(''); setShowNewProjectModal(true) }}
                className="text-xs border border-primary-border text-primary rounded-lg px-3 py-1.5 hover:bg-primary-surface transition-colors">
                + New project
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {recent.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => onOpenProject(p)}
                  className="project-card bg-white rounded-xl border border-primary-border p-4 cursor-pointer transition-colors"
                  style={{ animation: `card-enter 0.3s ease-out ${0.2 + idx * 0.1}s both` }}
                >
                  <p className="text-ink font-medium text-sm">{p.name}</p>
                  {p.client_name && <p className="text-ink-3 text-xs mt-0.5">{p.client_name}</p>}
                  <p className="text-ink-3 text-xs mt-2">Screened {p.candidates_count || 0}</p>
                  <p className="text-ink-3 text-[10px] mt-1">{fmtDate(p.created_at)}</p>
                </div>
              ))}
              {recent.length < 9 && (
                <div
                  onClick={() => { setCreateError(''); setShowNewProjectModal(true) }}
                  className="border-2 border-dashed border-primary-border rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary-light transition-colors min-h-[100px]"
                  style={{ animation: `card-enter 0.3s ease-out ${0.2 + recent.length * 0.1}s both` }}
                >
                  <span className="text-2xl text-ink-3">+</span>
                  <span className="text-ink-3 text-xs mt-1">New project</span>
                </div>
              )}
            </div>
            {projects.length > 8 && (
              <button onClick={() => onNavigate('projects')}
                className="text-primary text-xs mt-3 hover:underline">
                View all {projects.length} projects →
              </button>
            )}
          </div>

          {/* Daily challenges */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-ink font-medium text-base">Daily challenges</h2>
              <span className="text-xs bg-warn-bg text-warn rounded-full px-3 py-0.5">
                🔥 {gamesData?.streak?.current || 0} day streak
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { type: 'mcq',            icon: '🔍', title: 'Recruitment Challenge', sub: 'Test your HR knowledge' },
                { type: 'red_flag',       icon: '🚩', title: 'Resume Red Flag',        sub: 'Spot the screening issue' },
                { type: 'jd_match',       icon: '🎯', title: 'JD Match',               sub: 'Pick the best candidate' },
                { type: 'sliding_puzzle', icon: '🔲', title: 'Sliding Puzzle',          sub: 'Slide tiles into order' },
              ].map(card => {
                const played = gamesData?.[card.type]?.played
                const score = gamesData?.[card.type]?.score || 0
                return (
                  <div key={card.title}
                    onClick={() => onNavigate('games')}
                    className="bg-white rounded-xl border border-primary-border p-4 text-center hover:border-primary-light cursor-pointer transition-colors">
                    <div className="text-2xl mb-2">{card.icon}</div>
                    <p className="text-ink text-xs font-medium">{card.title}</p>
                    <p className="text-ink-3 text-[10px] mt-0.5">{card.sub}</p>
                    <p className={`text-[10px] mt-2 ${played ? 'text-success' : 'text-primary'}`}>
                      {played ? `✓ Played · ${score} pts` : "Today's challenge ready"}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Right icon sidebar — fixed */}
      <div
        className="home-sidebar flex flex-col gap-2 pt-2"
        style={{ position: 'fixed', right: 0, top: 48, height: 'calc(100vh - 48px)', width: 64, zIndex: 50, background: 'white', borderLeft: '0.5px solid #e0f0ec' }}
      >
        {sidebarItems.map(item => (
          <button key={item.label}
            onClick={() => item.id && onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              appView === item.id ? 'bg-primary-surface' : 'hover:bg-primary-surface/50'
            } ${!item.id ? 'opacity-40 cursor-default' : ''}`}>
            <span className={`text-lg ${appView === item.id ? 'text-primary' : 'text-ink-3'}`}>{item.icon}</span>
            <span className={`text-[8px] ${appView === item.id ? 'text-primary' : 'text-ink-3'}`}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Quote modal */}
      {showQuoteModal && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: modalClosing ? 'fade-out 0.3s ease forwards' : 'fade-in 0.3s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '42vw', minWidth: 400, maxWidth: 560,
              background: 'white', borderRadius: 20, padding: '32px 40px',
              position: 'relative',
              animation: modalClosing
                ? 'modal-exit 0.3s ease-in forwards'
                : 'modal-enter 0.45s cubic-bezier(0.34,1.4,0.64,1) forwards',
            }}
          >
            <button
              onClick={closeModal}
              style={{ position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderRadius: '50%', background: '#f0f0f0', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >×</button>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>🌿</span>
              <p style={{ color: '#0F6E56', fontWeight: 600, fontSize: 16, margin: '4px 0 0' }}>ResumeAI</p>
            </div>
            <hr style={{ border: 'none', borderTop: '0.5px solid #e0f0ec', marginBottom: 20 }} />

            {showQuote ? (
              <>
                <p style={{ color: '#1D9E75', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', margin: '0 0 16px' }}>TODAY'S THOUGHT</p>
                <p style={{ fontSize: 17, fontStyle: 'italic', color: '#2C2C2A', lineHeight: 1.7, textAlign: 'center', margin: '0 0 12px' }}>"{dailyContent?.quote}"</p>
                <p style={{ fontSize: 13, color: '#888780', textAlign: 'center', margin: 0 }}>— {dailyContent?.quote_author}</p>
              </>
            ) : (
              <>
                <p style={{ color: '#D97706', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', margin: '0 0 12px' }}>DID YOU KNOW?</p>
                <p style={{ fontSize: 13, color: '#5F5E5A', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>{dailyContent?.trivia}</p>
              </>
            )}

            <div style={{ width: '100%', height: 3, background: '#e0f0ec', borderRadius: 2, marginTop: 24, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#1D9E75', borderRadius: 2, animation: 'timer-progress 12s linear forwards' }} />
            </div>
            <p style={{ fontSize: 11, color: '#b0b0a8', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>Click anywhere to close</p>
          </div>
        </div>
      )}

      {/* Monthly survey modal */}
      {showSurveyModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 200 }} onClick={() => !surveySubmitting && setShowSurveyModal(false)} />
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 201, padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
              {surveyDone ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🙏</div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#0F6E56' }}>Thank you for your feedback!</p>
                  <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>Your response helps us improve ResumeAI.</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>📋 Quick Survey</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 24 }}>Takes about 30 seconds</p>

                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 10 }}>Q1: How easy is ResumeAI to use for your daily screening?</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setSurveyQ1(n)}
                          style={{ width: 40, height: 40, borderRadius: 8, border: `2px solid ${surveyQ1 >= n ? '#0F6E56' : '#E5E7EB'}`, background: surveyQ1 >= n ? '#0F6E56' : 'white', color: surveyQ1 >= n ? 'white' : '#6B7280', fontSize: 16, cursor: 'pointer' }}>
                          {'★'}
                        </button>
                      ))}
                      {surveyQ1 > 0 && <span style={{ fontSize: 12, color: '#6B7280', alignSelf: 'center', marginLeft: 4 }}>{['', 'Very Hard', 'Hard', 'Neutral', 'Easy', 'Very Easy'][surveyQ1]}</span>}
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 10 }}>Q2: How much time does ResumeAI save you per day?</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {['Less than 30 mins', '30 mins to 1 hour', '1 to 2 hours', 'More than 2 hours'].map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                          <input type="radio" name="q2" checked={surveyQ2 === opt} onChange={() => setSurveyQ2(opt)} style={{ accentColor: '#0F6E56' }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Q3: What one feature would make ResumeAI even better? <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></p>
                    <textarea value={surveyQ3} onChange={e => setSurveyQ3(e.target.value.slice(0, 200))}
                      placeholder="e.g. I'd love a bulk export feature…"
                      rows={3}
                      style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
                    <p style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'right', marginTop: 2 }}>{surveyQ3.length}/200</p>
                  </div>

                  <button onClick={handleSurveySubmit} disabled={!surveyQ1 || !surveyQ2 || surveySubmitting}
                    style={{ width: '100%', padding: '11px 0', background: (!surveyQ1 || !surveyQ2) ? '#9CA3AF' : '#0F6E56', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: (!surveyQ1 || !surveyQ2) ? 'not-allowed' : 'pointer' }}>
                    {surveySubmitting ? 'Submitting…' : 'Submit feedback →'}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* New project modal */}
      {showNewProjectModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowNewProjectModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border border-primary-border p-6 w-full max-w-sm">
              <h3 className="text-ink font-medium text-base mb-4">New project</h3>
              <div className="space-y-3">
                <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                  placeholder="Project name *"
                  className="w-full border border-primary-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-light" />
                <input value={newClientName} onChange={e => setNewClientName(e.target.value)}
                  placeholder="Client name (optional)"
                  className="w-full border border-primary-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-light" />
                {createError && (
                  <p style={{ color: '#A32D2D', fontSize: '12px', marginTop: '8px' }}>{createError}</p>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setShowNewProjectModal(false); setNewProjectName(''); setNewClientName(''); setCreateError('') }}
                  className="flex-1 py-2 border border-primary-border rounded-lg text-sm text-ink-2 hover:bg-primary-surface transition-colors">
                  Cancel
                </button>
                <button onClick={handleCreateProject} disabled={!newProjectName.trim() || creating}
                  className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-60">
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
