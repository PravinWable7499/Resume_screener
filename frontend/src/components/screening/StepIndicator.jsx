import { STEP_LABELS } from '../../constants.js'

export default function StepIndicator({ step, maxStep, onStepClick }) {
  return (
    <div className="flex items-center justify-center gap-0 py-4">
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
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all
                ${active    ? 'bg-primary text-white ring-4 ring-primary-surface' :
                  done      ? 'bg-primary text-white' :
                  reachable ? 'border border-primary-border text-ink-3 hover:border-primary hover:text-primary cursor-pointer' :
                              'border border-primary-border text-ink-3 opacity-40 cursor-default'}`}>
                {done ? '✓' : n}
              </div>
              <span className={`text-[9px] hidden sm:block whitespace-nowrap mt-0.5
                ${active ? 'text-primary font-medium' : done ? 'text-primary/60' : 'text-ink-3'}`}>
                {label}
              </span>
            </button>
            {i < STEP_LABELS.length - 1 && (
              <div className={`w-8 sm:w-10 h-px mx-1 transition-colors ${n < step ? 'bg-primary' : 'bg-primary-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
