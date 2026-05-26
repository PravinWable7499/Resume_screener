import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from 'recharts'
import { API_URL, fmtDate } from '../../utils.js'
import AppHeader from '../shared/AppHeader.jsx'

const TEAL       = '#0F6E56'
const TEAL_LIGHT = '#1D9E75'

// ── Role badge ─────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const cfg = {
    admin:     { label: 'Admin',     bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
    manager:   { label: 'Manager',   bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    recruiter: { label: 'Recruiter', bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  }[role] || { label: role, bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, textTransform: 'capitalize' }}>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const active = status === 'active'
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: active ? '#ECFDF5' : '#FEF2F2', color: active ? '#065F46' : '#991B1B', border: `1px solid ${active ? '#A7F3D0' : '#FECACA'}` }}>
      {active ? 'Active' : 'Suspended'}
    </span>
  )
}

// ── Chart tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || TEAL }}>{p.name}: <strong>{p.value}</strong>{p.unit || ''}</p>
      ))}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-primary-border p-4 animate-pulse">
    <div className="w-16 h-8 bg-primary-surface rounded mb-2" />
    <div className="w-24 h-3 bg-primary-surface rounded" />
  </div>
)

const SkeletonRow = ({ cols = 5 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3"><div className="h-4 bg-primary-surface rounded w-3/4" /></td>
    ))}
  </tr>
)

// ── Reports helpers ────────────────────────────────────────────────────────

function colorForRate(val, hi, lo) {
  if (val > hi)  return '#065F46'
  if (val >= lo) return '#92400E'
  return '#991B1B'
}

function SortTh({ label, field, sortField, sortDir, onSort, style = {} }) {
  const active = sortField === field
  return (
    <th
      onClick={() => onSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
      className="px-4 py-3 text-left font-medium"
    >
      {label}
      <span style={{ marginLeft: 4, color: active ? TEAL : '#D1D5DB', fontSize: 10 }}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
      </span>
    </th>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function AdminDashboard({ recruiter, appView, onNavigate, onLogout, onOpenProject }) {
  const isAdmin   = recruiter?.is_admin || recruiter?.role === 'admin'
  const isManager = recruiter?.role === 'manager'

  // Core dashboard data
  const [stats,          setStats]          = useState(null)
  const [team,           setTeam]           = useState([])
  const [invitations,    setInvitations]    = useState([])
  const [weeklyActivity, setWeeklyActivity] = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)

  // Top-level tab: analytics | team | reports
  const [activeTab,  setActiveTab]  = useState('analytics')
  // Inner team sub-tab: team | invitations
  const [teamSubTab, setTeamSubTab] = useState('team')

  // Reports
  const [reports,           setReports]           = useState(null)
  const [reportsLoading,    setReportsLoading]    = useState(false)
  const [sortField,         setSortField]         = useState('total_screened')
  const [sortDir,           setSortDir]           = useState('desc')
  const [cliSortField,      setCliSortField]      = useState('total_screened')
  const [cliSortDir,        setCliSortDir]        = useState('desc')
  const [clientLearning,    setClientLearning]    = useState(null)
  const [featureUsage,      setFeatureUsage]      = useState(null)

  // Invite form
  const [inviteName,    setInviteName]    = useState('')
  const [inviteEmail,   setInviteEmail]   = useState('')
  const [inviteRole,    setInviteRole]    = useState('recruiter')
  const [inviteManager, setInviteManager] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(null)
  const [inviteError,   setInviteError]   = useState(null)

  const fetchData = async () => {
    setLoading(true); setError(null)
    try {
      const [sRes, tRes, iRes, wRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`),
        fetch(`${API_URL}/api/admin/team`),
        fetch(`${API_URL}/api/admin/invitations`),
        fetch(`${API_URL}/api/admin/weekly-activity`),
      ])
      const [s, t, inv, w] = await Promise.all([sRes.json(), tRes.json(), iRes.json(), wRes.json()])
      setStats(s)
      const filteredTeam = isManager
        ? t.filter(r => r.team_manager_email === recruiter.email || r.email === recruiter.email)
        : t
      setTeam(filteredTeam)
      setInvitations(inv)
      setWeeklyActivity(w)
    } catch { setError('Failed to load dashboard data. Please try again.') }
    finally { setLoading(false) }
  }

  const fetchReports = async () => {
    if (reports) return
    setReportsLoading(true)
    try {
      const [rRes, clRes, fuRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/reports`),
        fetch(`${API_URL}/api/admin/client-learning`),
        fetch(`${API_URL}/api/admin/feature-usage`),
      ])
      if (rRes.ok)  setReports(await rRes.json())
      if (clRes.ok) setClientLearning(await clRes.json())
      if (fuRes.ok) setFeatureUsage(await fuRes.json())
    } catch {}
    setReportsLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'reports') fetchReports()
  }

  // ── Data derived from state ──────────────────────────────────────────────

  const statCards = stats ? [
    { label: 'Total Recruiters',     value: stats.total_recruiters,          border: 'border-l-4 border-primary' },
    { label: 'Total Projects',       value: stats.total_projects,            border: 'border-l-4 border-primary-light' },
    { label: 'Candidates Screened',  value: stats.total_candidates_screened, border: 'border-l-4 border-ink-3' },
    { label: 'Shortlisted',          value: stats.total_shortlisted,         border: 'border-l-4 border-success' },
    { label: 'Interviews Scheduled', value: stats.total_interviewing,        border: 'border-l-4 border-warn' },
    { label: '🎉 Joined',            value: stats.total_joined,              border: 'border-l-4 border-success' },
  ] : []

  const funnelData = stats ? [
    { name: 'Screened',    value: stats.total_candidates_screened || 0 },
    { name: 'Shortlisted', value: stats.total_shortlisted || 0 },
    { name: 'Interviewed', value: stats.total_interviewing || 0 },
    { name: 'Offered',     value: stats.total_offers || 0 },
    { name: 'Joined',      value: stats.total_joined || 0 },
  ] : []

  const FUNNEL_COLORS = ['#0F6E56', '#1D9E75', '#34D399', '#6EE7B7', '#A7F3D0']

  const recruiterPerfData = team
    .filter(r => r.candidates_screened > 0)
    .slice(0, 10)
    .map(r => ({ name: r.name.split(' ')[0], full: r.name, value: r.candidates_screened }))
    .sort((a, b) => b.value - a.value)

  const shortlistRateData = team
    .filter(r => r.candidates_screened > 0)
    .map(r => ({
      name: r.name.split(' ')[0],
      rate: Math.round((r.shortlisted || 0) / r.candidates_screened * 100),
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10)

  const managers = team.filter(r => r.role === 'manager' || r.role === 'admin')

  // ── Sort helpers ──────────────────────────────────────────────────────────

  const sortedRecruiters = reports?.recruiter_summary
    ? [...reports.recruiter_summary].sort((a, b) => {
        const v = sortDir === 'asc' ? 1 : -1
        return (a[sortField] > b[sortField] ? 1 : -1) * v
      })
    : []

  const sortedClients = reports?.client_summary
    ? [...reports.client_summary].sort((a, b) => {
        const v = cliSortDir === 'asc' ? 1 : -1
        return (a[cliSortField] > b[cliSortField] ? 1 : -1) * v
      })
    : []

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const handleCliSort = (field) => {
    if (cliSortField === field) setCliSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setCliSortField(field); setCliSortDir('desc') }
  }

  // ── Recruiter table totals ─────────────────────────────────────────────────

  const recTotals = sortedRecruiters.reduce((acc, r) => ({
    projects_count: acc.projects_count + r.projects_count,
    total_screened: acc.total_screened + r.total_screened,
    shortlisted:    acc.shortlisted    + r.shortlisted,
    submitted:      acc.submitted      + r.submitted,
    interviewed:    acc.interviewed    + r.interviewed,
    offered:        acc.offered        + r.offered,
    joined:         acc.joined         + r.joined,
    _score_sum:     acc._score_sum     + r.avg_score * r.total_screened,
  }), { projects_count: 0, total_screened: 0, shortlisted: 0, submitted: 0, interviewed: 0, offered: 0, joined: 0, _score_sum: 0 })

  const recTotalsShortlistRate  = recTotals.total_screened ? Math.round(recTotals.shortlisted / recTotals.total_screened * 100) : 0
  const recTotalsConversionRate = recTotals.total_screened ? Math.round(recTotals.joined / recTotals.total_screened * 100) : 0
  const recTotalsAvgScore       = recTotals.total_screened ? Math.round(recTotals._score_sum / recTotals.total_screened) : 0

  // ── CSV export ────────────────────────────────────────────────────────────

  const downloadCSV = () => {
    const headers = ['Recruiter', 'Projects', 'Screened', 'Shortlisted', 'Submitted', 'Interviewed', 'Offered', 'Joined', 'Shortlist%', 'Conversion%', 'Avg Score']
    const rows = (reports?.recruiter_summary || []).map(r => [
      `"${r.recruiter_name}"`, r.projects_count, r.total_screened, r.shortlisted,
      r.submitted, r.interviewed, r.offered, r.joined,
      r.shortlist_rate, r.conversion_rate, r.avg_score,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'recruiter_report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleStatusToggle = async (memberId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    try {
      await fetch(`${API_URL}/api/admin/recruiters/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      setTeam(prev => prev.map(r => r.id === memberId ? { ...r, status: newStatus } : r))
    } catch { /* silent */ }
  }

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await fetch(`${API_URL}/api/admin/recruiters/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      setTeam(prev => prev.map(r => r.id === memberId ? { ...r, role: newRole } : r))
    } catch { /* silent */ }
  }

  const handleCancelInvitation = async (id) => {
    try {
      await fetch(`${API_URL}/api/admin/invitations/${id}`, { method: 'DELETE' })
      setInvitations(prev => prev.filter(inv => inv.id !== id))
    } catch { /* silent */ }
  }

  const handleResendInvitation = async (inv) => {
    try {
      await fetch(`${API_URL}/api/admin/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inv.email,
          name: inv.name,
          role: inv.role,
          team_manager_email: inv.team_manager_email || '',
          requester_email: recruiter.email,
        }),
      })
      fetchData()
    } catch { /* silent */ }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviteError(null); setInviteSuccess(null)
    if (!inviteName.trim() || !inviteEmail.trim()) { setInviteError('Name and email are required'); return }
    if (inviteRole === 'recruiter' && !inviteManager) { setInviteError('Please select a team manager'); return }
    setInviteLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          role: inviteRole,
          team_manager_email: inviteRole === 'recruiter' ? inviteManager : '',
          requester_email: recruiter.email,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to send invitation')
      setInviteSuccess(inviteEmail.trim())
      setInviteName(''); setInviteEmail(''); setInviteRole('recruiter'); setInviteManager('')
      fetchData()
    } catch (err) { setInviteError(err.message) }
    finally { setInviteLoading(false) }
  }

  const lastActiveLabel = (iso) => {
    if (!iso) return { text: 'No activity', color: 'text-ink-3' }
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
    if (days === 0) return { text: 'Today',       color: 'text-success font-medium' }
    if (days <= 7)  return { text: `${days}d ago`, color: 'text-warn' }
    return { text: `${days}d ago`, color: 'text-ink-3' }
  }

  // ── Top-level tabs config ─────────────────────────────────────────────────

  const topTabs = isManager
    ? [['analytics', 'Analytics'], ['team', 'Team Management']]
    : [['analytics', 'Analytics'], ['team', 'Team Management'], ['reports', 'Reports']]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-primary-bg">
      <AppHeader recruiter={recruiter} appView={appView} onNavigate={onNavigate} onLogout={onLogout} />

      <main className="w-full px-6 py-8 space-y-6 max-w-screen-xl mx-auto">

        {/* Title */}
        <div>
          <h1 className="text-ink font-medium text-xl">
            {isManager ? 'Team Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-ink-3 text-sm mt-0.5">
            {isManager ? `Your team — ${recruiter.name}` : 'Platform activity — Agile Technology Solutions'}
          </p>
        </div>

        {error && (
          <div className="bg-danger-bg border border-danger/20 rounded-xl p-5 text-center">
            <p className="text-sm text-danger mb-3">{error}</p>
            <button onClick={fetchData} className="px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Retry
            </button>
          </div>
        )}

        {/* Overview stat cards — always visible for admins */}
        {!isManager && (
          <section>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : statCards.map(card => (
                    <div key={card.label} className={`bg-white rounded-xl border border-primary-border p-4 ${card.border}`}>
                      <div className="text-2xl font-medium text-ink">{card.value}</div>
                      <div className="text-xs text-ink-3 mt-1 uppercase tracking-wide">{card.label}</div>
                    </div>
                  ))
              }
            </div>
          </section>
        )}

        {/* ── TOP-LEVEL TABS ────────────────────────────────────────────────── */}
        <div className="flex gap-0 border-b border-primary-border -mb-2">
          {topTabs.map(([id, label]) => (
            <button key={id} onClick={() => handleTabChange(id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === id ? 'border-primary text-primary' : 'border-transparent text-ink-3 hover:text-ink-2'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ══ ANALYTICS TAB ════════════════════════════════════════════════════ */}
        {activeTab === 'analytics' && !loading && (
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Chart 1 — Hiring Funnel */}
              <div className="bg-white rounded-xl border border-primary-border p-5">
                <p className="text-sm font-semibold text-ink mb-1">Hiring Funnel</p>
                <p className="text-xs text-ink-3 mb-4">Pipeline stage conversion</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funnelData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Candidates" radius={[4,4,0,0]}>
                      {funnelData.map((_, idx) => (
                        <Cell key={idx} fill={FUNNEL_COLORS[idx] || TEAL} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 2 — Weekly Activity */}
              <div className="bg-white rounded-xl border border-primary-border p-5">
                <p className="text-sm font-semibold text-ink mb-1">Screening Activity This Week</p>
                <p className="text-xs text-ink-3 mb-4">Candidates screened per day</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weeklyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="count" name="Screened" stroke={TEAL} strokeWidth={2} dot={{ fill: TEAL, r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 3 — Recruiter Performance */}
              {recruiterPerfData.length > 0 && (
                <div className="bg-white rounded-xl border border-primary-border p-5">
                  <p className="text-sm font-semibold text-ink mb-1">Candidates Screened by Recruiter</p>
                  <p className="text-xs text-ink-3 mb-4">Top {Math.min(recruiterPerfData.length, 10)} recruiters</p>
                  <ResponsiveContainer width="100%" height={Math.max(160, recruiterPerfData.length * 28)}>
                    <BarChart data={recruiterPerfData} layout="vertical" barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={60} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" name="Screened" fill={TEAL} radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Chart 4 — Shortlist Rate */}
              {shortlistRateData.length > 0 && (
                <div className="bg-white rounded-xl border border-primary-border p-5">
                  <p className="text-sm font-semibold text-ink mb-1">Shortlist Rate by Recruiter</p>
                  <p className="text-xs text-ink-3 mb-4">
                    <span style={{ color: '#10b981' }}>■</span> &gt;30%{' '}
                    <span style={{ color: '#f59e0b', marginLeft: 8 }}>■</span> 10–30%{' '}
                    <span style={{ color: '#ef4444', marginLeft: 8 }}>■</span> &lt;10%
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={shortlistRateData} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="rate" name="Shortlist Rate" radius={[4,4,0,0]} unit="%">
                        {shortlistRateData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.rate > 30 ? '#10b981' : entry.rate >= 10 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

            </div>
          </section>
        )}

        {/* ══ TEAM MANAGEMENT TAB ══════════════════════════════════════════════ */}
        {activeTab === 'team' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Team table (2/3) */}
            <section className="xl:col-span-2">
              {/* Sub-tabs */}
              <div className="flex gap-0 mb-4 border-b border-primary-border">
                {['team', 'invitations'].map(tab => (
                  <button key={tab} onClick={() => setTeamSubTab(tab)}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${teamSubTab === tab ? 'border-primary text-primary' : 'border-transparent text-ink-3 hover:text-ink-2'}`}>
                    {tab === 'team'
                      ? `Active Team ${!loading ? `(${team.filter(r => r.status === 'active').length})` : ''}`
                      : `Pending Invitations ${!loading ? `(${invitations.length})` : ''}`}
                  </button>
                ))}
              </div>

              {/* Active Team */}
              {teamSubTab === 'team' && (
                <div className="overflow-x-auto rounded-xl border border-primary-border">
                  <table className="w-full bg-white text-sm">
                    <thead>
                      <tr className="bg-primary-surface text-xs text-ink-3 uppercase tracking-wide">
                        {['Name / Email', 'Role', 'Manager', 'Projects', 'Screened', 'Last Active', 'Status', ...(isAdmin ? ['Actions'] : [])].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading
                        ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={isAdmin ? 8 : 7} />)
                        : team.map((r, i) => {
                            const la = lastActiveLabel(r.last_active)
                            return (
                              <tr key={r.id} className={`border-t border-primary-border hover:bg-primary-surface/50 ${i % 2 === 1 ? 'bg-primary-bg/40' : 'bg-white'}`}>
                                <td className="px-4 py-3">
                                  <div className="text-ink font-medium text-xs">{r.name}</div>
                                  <div className="text-[11px] text-ink-3">{r.email}</div>
                                </td>
                                <td className="px-4 py-3"><RoleBadge role={r.role} /></td>
                                <td className="px-4 py-3 text-xs text-ink-3">
                                  {r.team_manager_email ? r.team_manager_email.split('@')[0] : '—'}
                                </td>
                                <td className="px-4 py-3 text-xs text-ink-2">{r.projects_count}</td>
                                <td className="px-4 py-3 text-xs font-medium text-ink">{r.candidates_screened}</td>
                                <td className={`px-4 py-3 text-xs ${la.color}`}>{la.text}</td>
                                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                                {isAdmin && (
                                  <td className="px-4 py-3">
                                    {r.email !== recruiter?.email && (
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleStatusToggle(r.id, r.status)}
                                          className={`text-[11px] px-2 py-1 rounded-lg font-medium border transition-colors ${r.status === 'active' ? 'border-danger/30 text-danger hover:bg-danger-bg' : 'text-success hover:bg-primary-surface'}`}
                                          style={r.status !== 'active' ? { border: '1px solid #A7F3D0' } : {}}>
                                          {r.status === 'active' ? 'Suspend' : 'Activate'}
                                        </button>
                                        <select
                                          value={r.role}
                                          onChange={e => handleRoleChange(r.id, e.target.value)}
                                          className="text-[11px] border border-primary-border rounded-lg px-1.5 py-1 text-ink focus:outline-none bg-white"
                                        >
                                          <option value="recruiter">Recruiter</option>
                                          <option value="manager">Manager</option>
                                          <option value="admin">Admin</option>
                                        </select>
                                      </div>
                                    )}
                                  </td>
                                )}
                              </tr>
                            )
                          })
                      }
                      {!loading && team.length === 0 && (
                        <tr><td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-ink-3 text-sm">No team members found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pending Invitations */}
              {teamSubTab === 'invitations' && (
                <div className="overflow-x-auto rounded-xl border border-primary-border">
                  <table className="w-full bg-white text-sm">
                    <thead>
                      <tr className="bg-primary-surface text-xs text-ink-3 uppercase tracking-wide">
                        {['Name / Email', 'Role', 'Invited By', 'Invited Date', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading
                        ? Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                        : invitations.map((inv, i) => (
                            <tr key={inv.id} className={`border-t border-primary-border hover:bg-primary-surface/50 ${i % 2 === 1 ? 'bg-primary-bg/40' : 'bg-white'}`}>
                              <td className="px-4 py-3">
                                <div className="text-ink font-medium text-xs">{inv.name || '—'}</div>
                                <div className="text-[11px] text-ink-3">{inv.email}</div>
                              </td>
                              <td className="px-4 py-3"><RoleBadge role={inv.role} /></td>
                              <td className="px-4 py-3 text-xs text-ink-3">{inv.invited_by?.split('@')[0] || '—'}</td>
                              <td className="px-4 py-3 text-xs text-ink-3 whitespace-nowrap">{fmtDate(inv.created_at)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => handleResendInvitation(inv)}
                                    className="text-[11px] px-2 py-1 rounded-lg font-medium border border-primary/30 text-primary hover:bg-primary-surface transition-colors">
                                    Resend
                                  </button>
                                  <button onClick={() => handleCancelInvitation(inv.id)}
                                    className="text-[11px] px-2 py-1 rounded-lg font-medium border border-danger/30 text-danger hover:bg-danger-bg transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      }
                      {!loading && invitations.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-3 text-sm">No pending invitations.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Invite Form (1/3) */}
            <section>
              <div className="bg-white rounded-xl border border-primary-border p-6">
                <h2 className="text-ink font-medium text-base mb-1">Invite Team Member</h2>
                <p className="text-ink-3 text-xs mb-5">Send an activation link by email</p>

                {inviteSuccess && (
                  <div className="mb-4 flex items-start gap-2 p-3 rounded-lg" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                    <span style={{ color: '#065F46' }}>✓</span>
                    <p className="text-xs font-medium" style={{ color: '#065F46' }}>Invitation sent to <strong>{inviteSuccess}</strong></p>
                  </div>
                )}
                {inviteError && (
                  <div className="mb-4 p-3 bg-danger-bg border border-danger/20 rounded-lg text-xs text-danger">
                    {inviteError}
                  </div>
                )}

                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-ink-2 text-xs mb-1.5">Full name</label>
                    <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full border border-primary-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-light bg-white" />
                  </div>
                  <div>
                    <label className="block text-ink-2 text-xs mb-1.5">Email address</label>
                    <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="w-full border border-primary-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-light bg-white" />
                  </div>

                  <div>
                    <label className="block text-ink-2 text-xs mb-2">Role</label>
                    <div className="flex gap-3">
                      {(isAdmin ? ['recruiter', 'manager'] : ['recruiter']).map(r => (
                        <label key={r} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm flex-1 ${inviteRole === r ? 'border-primary bg-primary-surface text-primary' : 'border-primary-border text-ink-2 hover:border-primary/40'}`}>
                          <input type="radio" name="role" value={r} checked={inviteRole === r} onChange={() => { setInviteRole(r); if (r === 'manager') setInviteManager('') }}
                            className="accent-primary" />
                          <span className="capitalize font-medium">{r}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {inviteRole === 'recruiter' && (
                    <div>
                      <label className="block text-ink-2 text-xs mb-1.5">Team Manager</label>
                      <select value={inviteManager} onChange={e => setInviteManager(e.target.value)}
                        className="w-full border border-primary-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-light bg-white">
                        <option value="">Select a manager…</option>
                        {managers.map(m => (
                          <option key={m.id} value={m.email}>{m.name} ({m.email})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button type="submit" disabled={inviteLoading}
                    className="w-full py-2.5 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                    {inviteLoading ? 'Sending…' : 'Send Invitation →'}
                  </button>
                </form>
              </div>
            </section>

          </div>
        )}

        {/* ══ REPORTS TAB ══════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="space-y-8">

            {reportsLoading && (
              <div className="text-center py-16 text-ink-3 text-sm">Loading report data…</div>
            )}

            {!reportsLoading && reports && (
              <>
                {/* ── Section 1: Pipeline Funnel ───────────────────────────── */}
                <section className="bg-white rounded-xl border border-primary-border p-6">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-semibold text-ink">Recruitment Pipeline</p>
                      <p className="text-xs text-ink-3 mt-0.5">Overall funnel across all recruiters and projects</p>
                    </div>
                    <button
                      onClick={downloadCSV}
                      style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      ↓ Download Report
                    </button>
                  </div>

                  <div className="mt-6 space-y-3">
                    {(() => {
                      const ps  = reports.pipeline_summary
                      const base = ps.screened || 1
                      const stages = [
                        { key: 'screened',    label: 'Screened',    color: '#0F6E56' },
                        { key: 'shortlisted', label: 'Shortlisted', color: '#1D9E75' },
                        { key: 'submitted',   label: 'Submitted',   color: '#34D399' },
                        { key: 'interviewed', label: 'Interviewed', color: '#6EE7B7' },
                        { key: 'offered',     label: 'Offered',     color: '#A7F3D0' },
                        { key: 'joined',      label: 'Joined',      color: '#D1FAE5' },
                      ]
                      return stages.map((stage, idx) => {
                        const count = ps[stage.key] || 0
                        const pct   = Math.round(count / base * 100)
                        const prev  = idx > 0 ? (ps[stages[idx - 1].key] || 0) : 0
                        const conv  = prev > 0 ? Math.round(count / prev * 100) : null
                        return (
                          <div key={stage.key}>
                            {idx > 0 && conv !== null && (
                              <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3, marginLeft: 90 }}>
                                ↓ {conv}% conversion from {stages[idx - 1].label.toLowerCase()}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 80, fontSize: 11, color: '#374151', fontWeight: 500, flexShrink: 0, textAlign: 'right' }}>
                                {stage.label}
                              </div>
                              <div style={{ flex: 1, background: '#F3F4F6', borderRadius: 6, height: 28, overflow: 'hidden' }}>
                                <div style={{
                                  width: `${Math.max(pct, 1)}%`, height: '100%',
                                  background: stage.color, borderRadius: 6,
                                  display: 'flex', alignItems: 'center', paddingLeft: 8,
                                  transition: 'width 0.4s ease',
                                }}>
                                  {pct > 8 && (
                                    <span style={{ fontSize: 11, color: idx < 3 ? 'white' : '#0F6E56', fontWeight: 600 }}>{count}</span>
                                  )}
                                </div>
                              </div>
                              <div style={{ width: 48, fontSize: 11, color: '#6B7280', textAlign: 'right', flexShrink: 0 }}>
                                {pct}%
                              </div>
                              {pct <= 8 && (
                                <div style={{ fontSize: 11, color: '#374151', fontWeight: 600, width: 32 }}>{count}</div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>

                  {reports.pipeline_summary.dropped > 0 && (
                    <div style={{ marginTop: 12, fontSize: 11, color: '#9CA3AF' }}>
                      + {reports.pipeline_summary.dropped} dropped from pipeline
                    </div>
                  )}
                </section>

                {/* ── Section 2: Recruiter Performance Table ───────────────── */}
                <section>
                  <p className="text-sm font-semibold text-ink mb-1">Recruiter Performance Report</p>
                  <p className="text-xs text-ink-3 mb-3">Click column headers to sort</p>
                  <div className="overflow-x-auto rounded-xl border border-primary-border">
                    <table className="w-full bg-white text-sm" style={{ minWidth: 900 }}>
                      <thead>
                        <tr className="bg-primary-surface text-xs text-ink-3 uppercase tracking-wide">
                          <SortTh label="Recruiter"   field="recruiter_name"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortTh label="Projects"    field="projects_count"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortTh label="Screened"    field="total_screened"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortTh label="Shortlisted" field="shortlisted"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortTh label="Submitted"   field="submitted"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortTh label="Interviewed" field="interviewed"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortTh label="Offered"     field="offered"         sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortTh label="Joined"      field="joined"          sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortTh label="Shortlist %" field="shortlist_rate"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortTh label="Conversion%" field="conversion_rate" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          <SortTh label="Avg Score"   field="avg_score"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRecruiters.map((r, i) => (
                          <tr key={r.recruiter_email} className={`border-t border-primary-border hover:bg-primary-surface/50 ${i % 2 === 1 ? 'bg-primary-bg/40' : 'bg-white'}`}>
                            <td className="px-4 py-3">
                              <div className="text-xs font-medium text-ink">{r.recruiter_name}</div>
                              <div className="text-[11px] text-ink-3">{r.recruiter_email}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-ink-2">{r.projects_count}</td>
                            <td className="px-4 py-3 text-xs font-medium text-ink">{r.total_screened}</td>
                            <td className="px-4 py-3 text-xs text-ink-2">{r.shortlisted}</td>
                            <td className="px-4 py-3 text-xs text-ink-2">{r.submitted}</td>
                            <td className="px-4 py-3 text-xs text-ink-2">{r.interviewed}</td>
                            <td className="px-4 py-3 text-xs text-ink-2">{r.offered}</td>
                            <td className="px-4 py-3 text-xs text-ink-2">{r.joined}</td>
                            <td className="px-4 py-3 text-xs font-semibold" style={{ color: colorForRate(r.shortlist_rate, 30, 10) }}>
                              {r.shortlist_rate}%
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold" style={{ color: colorForRate(r.conversion_rate, 10, 5) }}>
                              {r.conversion_rate}%
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold" style={{ color: colorForRate(r.avg_score, 75, 50) }}>
                              {r.avg_score || '—'}
                            </td>
                          </tr>
                        ))}

                        {/* Totals row */}
                        {sortedRecruiters.length > 0 && (
                          <tr className="border-t-2 border-primary-border bg-primary-surface font-semibold">
                            <td className="px-4 py-3 text-xs text-ink font-bold">Total / Avg</td>
                            <td className="px-4 py-3 text-xs text-ink">{recTotals.projects_count}</td>
                            <td className="px-4 py-3 text-xs text-ink">{recTotals.total_screened}</td>
                            <td className="px-4 py-3 text-xs text-ink">{recTotals.shortlisted}</td>
                            <td className="px-4 py-3 text-xs text-ink">{recTotals.submitted}</td>
                            <td className="px-4 py-3 text-xs text-ink">{recTotals.interviewed}</td>
                            <td className="px-4 py-3 text-xs text-ink">{recTotals.offered}</td>
                            <td className="px-4 py-3 text-xs text-ink">{recTotals.joined}</td>
                            <td className="px-4 py-3 text-xs font-bold" style={{ color: colorForRate(recTotalsShortlistRate, 30, 10) }}>
                              {recTotalsShortlistRate}%
                            </td>
                            <td className="px-4 py-3 text-xs font-bold" style={{ color: colorForRate(recTotalsConversionRate, 10, 5) }}>
                              {recTotalsConversionRate}%
                            </td>
                            <td className="px-4 py-3 text-xs font-bold" style={{ color: colorForRate(recTotalsAvgScore, 75, 50) }}>
                              {recTotalsAvgScore || '—'}
                            </td>
                          </tr>
                        )}

                        {sortedRecruiters.length === 0 && (
                          <tr><td colSpan={11} className="px-4 py-8 text-center text-ink-3 text-sm">No recruiter data yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* ── Section 3: Client Activity Table ─────────────────────── */}
                <section>
                  <p className="text-sm font-semibold text-ink mb-1">Client Activity Report</p>
                  <p className="text-xs text-ink-3 mb-3">Sorted by candidates screened</p>
                  <div className="overflow-x-auto rounded-xl border border-primary-border">
                    <table className="w-full bg-white text-sm">
                      <thead>
                        <tr className="bg-primary-surface text-xs text-ink-3 uppercase tracking-wide">
                          <SortTh label="Client Name"  field="client_name"    sortField={cliSortField} sortDir={cliSortDir} onSort={handleCliSort} />
                          <SortTh label="Projects"     field="total_projects" sortField={cliSortField} sortDir={cliSortDir} onSort={handleCliSort} />
                          <SortTh label="Screened"     field="total_screened" sortField={cliSortField} sortDir={cliSortDir} onSort={handleCliSort} />
                          <SortTh label="Shortlisted"  field="shortlisted"    sortField={cliSortField} sortDir={cliSortDir} onSort={handleCliSort} />
                          <SortTh label="Joined"       field="joined"         sortField={cliSortField} sortDir={cliSortDir} onSort={handleCliSort} />
                          <SortTh label="Conversion %" field="conversion_rate" sortField={cliSortField} sortDir={cliSortDir} onSort={handleCliSort} />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedClients.map((c, i) => (
                          <tr key={c.client_name} className={`border-t border-primary-border hover:bg-primary-surface/50 ${i % 2 === 1 ? 'bg-primary-bg/40' : 'bg-white'}`}>
                            <td className="px-4 py-3 text-xs font-medium text-ink">{c.client_name}</td>
                            <td className="px-4 py-3 text-xs text-ink-2">{c.total_projects}</td>
                            <td className="px-4 py-3 text-xs font-medium text-ink">{c.total_screened}</td>
                            <td className="px-4 py-3 text-xs text-ink-2">{c.shortlisted}</td>
                            <td className="px-4 py-3 text-xs text-ink-2">{c.joined}</td>
                            <td className="px-4 py-3 text-xs font-semibold" style={{ color: colorForRate(c.conversion_rate, 10, 5) }}>
                              {c.conversion_rate}%
                            </td>
                          </tr>
                        ))}
                        {sortedClients.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-3 text-sm">No client data yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* ── Section 4: Top Performers ─────────────────────────────── */}
                {reports.top_performers.length > 0 && (
                  <section>
                    <p className="text-sm font-semibold text-ink mb-3">Top Performers</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(() => {
                        const icons = { 'Most Active': '🏆', 'Best Shortlister': '🎯', 'Best Converter': '🔄', 'Most Placements': '🌟' }
                        return reports.top_performers.map(p => (
                          <div key={p.metric} style={{
                            background: 'white', borderRadius: 12, padding: '16px 18px',
                            border: '1px solid #E5E7EB', borderLeft: `4px solid ${TEAL}`,
                          }}>
                            <div style={{ fontSize: 20, marginBottom: 8 }}>{icons[p.metric] || '⭐'}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                              {p.metric}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                              {p.recruiter_name}
                            </div>
                            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{p.value}</div>
                          </div>
                        ))
                      })()}
                    </div>
                  </section>
                )}

                {/* ── Section 5: Feature Usage ──────────────────────────────── */}
                {featureUsage && featureUsage.most_used.length > 0 && (
                  <section className="bg-white rounded-xl border border-primary-border p-6">
                    <p className="text-sm font-semibold text-ink mb-1">Feature Usage</p>
                    <p className="text-xs text-ink-3 mb-5">How recruiters are using ResumeAI</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-3">Most Used</p>
                        <div className="space-y-2">
                          {featureUsage.most_used.slice(0, 6).map(f => {
                            const max = featureUsage.most_used[0]?.count || 1
                            return (
                              <div key={f.feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 120, fontSize: 11, color: '#374151', flexShrink: 0, textAlign: 'right' }}>{f.feature}</div>
                                <div style={{ flex: 1, background: '#F3F4F6', borderRadius: 4, height: 18, overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.round(f.count / max * 100)}%`, height: '100%', background: TEAL, borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                                    {f.count / max > 0.15 && <span style={{ fontSize: 10, color: 'white', fontWeight: 600 }}>{f.count}</span>}
                                  </div>
                                </div>
                                {f.count / max <= 0.15 && <span style={{ fontSize: 10, color: '#6B7280' }}>{f.count}</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-3">Usage by Recruiter</p>
                        <div className="overflow-x-auto rounded-lg border border-primary-border">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-primary-surface text-ink-3 uppercase tracking-wide">
                                <th className="px-3 py-2 text-left font-medium">Recruiter</th>
                                <th className="px-3 py-2 text-center font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {featureUsage.by_recruiter.slice(0, 8).map((r, i) => (
                                <tr key={r.email} className={`border-t border-primary-border ${i % 2 === 1 ? 'bg-primary-bg/40' : 'bg-white'}`}>
                                  <td className="px-3 py-2">
                                    <div className="font-medium text-ink">{r.name}</div>
                                    <div className="text-[10px] text-ink-3">{r.email}</div>
                                  </td>
                                  <td className="px-3 py-2 text-center font-semibold text-ink">{r.features_used}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* ── Section 6: Client Intelligence ────────────────────────── */}
                {clientLearning && clientLearning.length > 0 && (
                  <section>
                    <p className="text-sm font-semibold text-ink mb-1">Client Intelligence</p>
                    <p className="text-xs text-ink-3 mb-4">Learned from screening outcomes</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clientLearning.map(client => (
                        <div key={client.client_name} className="bg-white rounded-xl border border-primary-border p-5">
                          <p className="text-sm font-semibold text-ink mb-3">{client.client_name}</p>
                          <div className="space-y-3">
                            {client.rules.map(rule => {
                              const isEstablished = rule.confidence >= 3
                              const isStrong = rule.confidence >= 5
                              const signalLabel = isStrong ? 'Strong signal' : isEstablished ? 'Established' : 'Building'
                              const signalColor = isStrong ? '#065F46' : isEstablished ? '#92400E' : '#9CA3AF'
                              const signalBg    = isStrong ? '#ECFDF5'  : isEstablished ? '#FFFBEB'  : '#F9FAFB'
                              return (
                                <div key={rule.learning_type} style={{ opacity: rule.confidence < 3 ? 0.5 : 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                    <p style={{ fontSize: 12, color: '#374151', flex: 1, paddingRight: 8 }}>{rule.learning_text}</p>
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: signalBg, color: signalColor, flexShrink: 0 }}>
                                      {signalLabel}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 3 }}>
                                    {Array.from({ length: Math.min(rule.confidence, 5) }).map((_, i) => (
                                      <div key={i} style={{ height: 4, width: 16, borderRadius: 2, background: i < rule.confidence ? signalColor : '#E5E7EB' }} />
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

          </div>
        )}

      </main>
    </div>
  )
}
