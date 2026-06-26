import { X, ChevronRight, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'

const STEPS = ['Describe your idea', 'Generate with AI', 'Export your video']

export function WelcomeBanner({ onDismiss, onStart }: { onDismiss: () => void; onStart: () => void }) {
  return (
    <div className="welcome-banner dash-section animate-fade-up">
      <div className="welcome-orb" aria-hidden="true" />
      <IconButton label="Dismiss welcome" variant="ghost" size="sm" className="welcome-close" onClick={onDismiss}>
        <X size={16} />
      </IconButton>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Welcome to VydeoAI</div>
      <h2 className="text-heading-2" style={{ marginBottom: 4 }}>
        You&apos;re 3 steps away from your first AI video
      </h2>
      <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
        No timelines to learn, no templates to fill in. Just describe what you want.
      </p>
      <div className="welcome-steps">
        {STEPS.map((label, i) => (
          <div key={label} className="welcome-step">
            <span className="welcome-step-num">{i + 1}</span>
            <span className="welcome-step-label">{label}</span>
            {i < STEPS.length - 1 && <ChevronRight size={14} color="var(--text-tertiary)" />}
          </div>
        ))}
      </div>
      <Button variant="primary" leftIcon={<Sparkles size={14} />} onClick={onStart}>
        Start now
      </Button>
    </div>
  )
}
