import { REC_CFG } from '../../constants.js'

export default function RecBadge({ recommendation, size = 'sm' }) {
  const cfg = REC_CFG[recommendation]
  if (!cfg) return null
  const pad = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-4 py-1.5 text-sm'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${pad} ${cfg.cls} ${cfg.glow ? 'rec-proceed-glow' : ''}`}>
      <span>{cfg.icon}</span>{cfg.label}
    </span>
  )
}
