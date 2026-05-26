export default function Tag({ children, variant = 'match' }) {
  const cls = {
    match:   'bg-primary-surface text-primary border border-primary-border',
    missing: 'bg-danger-bg text-danger border border-danger',
    warning: 'bg-warn-bg text-warn border border-warn',
    neutral: 'bg-gray-100 text-ink-3 border border-gray-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls[variant]}`}>
      {children}
    </span>
  )
}
