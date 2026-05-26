import { useState, useEffect } from 'react'
import { API_URL, fmtDate } from '../../utils.js'
import AppHeader from '../shared/AppHeader.jsx'
import Spinner from '../shared/Spinner.jsx'

export default function ProjectsDashboard({ recruiter, appView, onNavigate, onLogout, onOpenProject }) {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)
  const [newName, setNewName] = useState('')
  const [newClient, setNewClient] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/projects`)
      .then(r => r.ok ? r.json() : [])
      .then(p => setProjects(p))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.client_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), client_name: newClient.trim(), created_by_email: recruiter.email }),
      })
      if (!res.ok) throw new Error('Failed to create project')
      const project = await res.json()
      setShowModal(false); setNewName(''); setNewClient('')
      onOpenProject(project)
    } catch (e) { setError(e.message) }
    finally { setCreating(false) }
  }

  return (
    <div className="min-h-screen bg-primary-bg">
      <AppHeader recruiter={recruiter} appView={appView} onNavigate={onNavigate} onLogout={onLogout} />

      <main className="w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-ink font-medium text-xl">Projects</h1>
            <p className="text-ink-3 text-sm mt-0.5">Manage your screening projects</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="border border-primary-border rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:border-primary-light bg-white"
            />
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors">
              + New project
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-danger-bg border border-danger/20 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24 flex-col gap-3">
            <Spinner className="w-7 h-7" />
            <p className="text-ink-3 text-sm">Loading projects…</p>
          </div>
        ) : filtered.length === 0 && search ? (
          <div className="text-center py-16">
            <p className="text-ink-3 text-sm">No projects match "{search}"</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📂</div>
            <h3 className="text-ink font-medium text-base mb-1">No projects yet</h3>
            <p className="text-ink-3 text-sm mb-6">Create your first screening project to get started</p>
            <button onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors">
              Create first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(project => (
              <div key={project.id}
                className="project-card bg-white rounded-xl border border-primary-border p-5 flex flex-col gap-4 transition-colors cursor-pointer"
                onClick={() => onOpenProject(project)}>
                <div className="flex-1">
                  <h3 className="text-ink font-medium text-sm leading-snug">{project.name}</h3>
                  {project.client_name && (
                    <p className="text-primary text-xs mt-0.5">{project.client_name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[11px] bg-primary-surface text-primary px-2 py-0.5 rounded-full">
                      {project.created_by_email.split('@')[0]}
                    </span>
                    <span className="text-[11px] text-ink-3">{fmtDate(project.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-3">
                    <span className={`font-medium mr-1 ${(project.candidates_count || 0) > 0 ? 'text-primary' : 'text-ink-3'}`}>
                      {project.candidates_count || 0}
                    </span>
                    screened
                  </span>
                  <span className="text-xs text-primary hover:underline">Open →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border border-primary-border p-6 w-full max-w-sm">
              <h3 className="text-ink font-medium text-base mb-4">New project</h3>
              <div className="space-y-3">
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="Project name *"
                  className="w-full border border-primary-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-light" />
                <input value={newClient} onChange={e => setNewClient(e.target.value)}
                  placeholder="Client name (optional)"
                  className="w-full border border-primary-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-light" />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setShowModal(false); setNewName(''); setNewClient('') }}
                  className="flex-1 py-2 border border-primary-border rounded-lg text-sm text-ink-2 hover:bg-primary-surface transition-colors">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={!newName.trim() || creating}
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
