# VydeoAI Design System

One reusable design language. **Every page composes from `@/components/ui` and the tokens in `src/styles/`. Never hardcode colors, spacing, radii, or shadows — use the tokens.**

## Architecture

```
src/styles/
  tokens.css       ← single source of truth: colors, spacing, radii, shadows, motion
  base.css         ← reset, document, focus-visible, prefers-reduced-motion
  components.css    ← shared class primitives (.btn, .card, .input-base, .modal-*, …)
  ui.css           ← class layer for the React ui/ library (form controls, overlays, states)
  utilities.css    ← glass, gradients, keyframes, layout helpers
src/components/ui/  ← the React component library (import from '@/components/ui')
```

React components are thin wrappers that render **token-driven CSS classes**, so `:hover`, `:focus-visible`, `:disabled`, `:active`, and reduced-motion all work natively. Inline `style` is used **only for dynamic geometry** (progress width, tooltip position) — never for color/spacing.

## Tokens (excerpt)

| Group | Tokens |
|---|---|
| Brand | `--accent` (primary), `--ai` (secondary), `--accent-light`, `--on-accent` |
| Surfaces | `--bg-base` · `--bg-surface` (sidebar/toolbar) · `--bg-elevated` (card) · `--bg-panel` · `--bg-inset` |
| Text | `--text-primary` · `--text-secondary` · `--text-tertiary` · `--text-placeholder` |
| Borders | `--border` · `--border-strong` · `--border-hover` · `--border-active` · `--border-focus` |
| Status | `--success` · `--warning` · `--error`/`--danger` · `--info` |
| Radius | `--r-sm` `--r-md` `--r-lg` `--r-xl` (primary four) |
| Spacing | `--sp-1`…`--sp-24` (4px grid) |
| Shadows | `--shadow-xs`…`--shadow-xl` (elevation 1–5) + `--glow-accent` |
| Motion | `--ease-out` `--ease-spring` · `--dur-fast` `--dur-base` `--dur-slow` |

Breakpoints: tablet ≤768 · laptop ≤1024 · desktop ≤1440 · wide >1440.

## Components

- **Atoms** — `Button` (primary/secondary/ghost/outline/danger/ai · xs–lg · isLoading · icons), `IconButton` (requires `label`), `Spinner`, `Badge`
- **Surfaces** — `Card` (+ `CardHeader/Content/Footer`), `Panel`
- **Forms** — `Input`, `Textarea`, `SearchInput`, `PromptInput`, `Select`, `Toggle`, `Checkbox`, `RadioGroup`, `Slider`, `Segmented`, `Dropzone`/`UploadCard`
- **Overlays & feedback** — `Modal` + `ConfirmDialog`, `ToastProvider`/`useToast`, `Tooltip`, `Tabs`/`TabPanel`, `ProgressBar`
- **States** — `Skeleton` (+Text/Card/Avatar), `EmptyState`, `ErrorState`
- **Icons** — `Icons.<Name>` (stroke icons via `currentColor`)

## Usage

```tsx
import { Button, Card, EmptyState, useToast } from '@/components/ui'

const { success } = useToast()         // requires <ToastProvider> ancestor (in the protected layout)
<Button variant="primary" leftIcon={<Icons.Plus size={16} />}>New project</Button>
<EmptyState icon={<Icons.Film size={22} />} title="No projects yet" description="…" action={<Button>Create</Button>} />
```

## Rules

1. Import primitives from `@/components/ui` — don't re-implement buttons/inputs/cards.
2. Colors/spacing/radii/shadows come from tokens (`var(--…)`), never literals.
3. Every async surface needs loading (`Skeleton`/`Spinner`/`ProgressBar`), empty (`EmptyState`), and error (`ErrorState`) states.
4. Interactive elements need an accessible name, visible focus, and keyboard operability.
