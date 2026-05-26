export default function AppHeader({ recruiter, appView, onNavigate, onLogout }) {
  const initials = recruiter?.name
    ? recruiter.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'projects', label: 'Projects' },
    { id: 'games', label: 'Games' },
    ...(recruiter?.is_admin || recruiter?.role === 'manager' || recruiter?.role === 'admin' ? [{ id: 'admin', label: 'Admin' }] : []),
  ]

  return (
    <header className="h-12 bg-white border-b border-primary-border sticky top-0 z-30 flex items-center px-6">
      <div className="flex items-center gap-2 w-40">
        <span className="text-lg">🌿</span>
        <span className="text-primary font-medium text-sm tracking-tight">ResumeAI</span>
      </div>

      <nav className="flex-1 flex items-center justify-center gap-6">
        {navLinks.map(link => (
          <button
            key={link.id}
            onClick={() => onNavigate(link.id)}
            className={`text-sm pb-0.5 transition-colors ${
              appView === link.id
                ? 'text-primary border-b border-primary font-medium'
                : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {link.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3 w-40 justify-end">
        <div className="w-7 h-7 rounded-full bg-primary-surface flex items-center justify-center">
          <span className="text-primary text-xs font-medium">{initials}</span>
        </div>
        <span className="text-ink-2 text-xs hidden sm:block">{recruiter?.name}</span>
        <button
          onClick={onLogout}
          className="text-ink-3 text-xs hover:text-danger transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
