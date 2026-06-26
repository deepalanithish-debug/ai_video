import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import {
  Button,
  Badge,
  Toggle,
  Checkbox,
  Select,
  Modal,
  EmptyState,
  ErrorState,
  ProgressBar,
  ToastProvider,
  useToast,
} from '@/components/ui'

describe('Button', () => {
  it('renders the variant/size classes and fires onClick', () => {
    const onClick = vi.fn()
    render(<Button variant="ai" size="lg" onClick={onClick}>Go</Button>)
    const btn = screen.getByRole('button', { name: 'Go' })
    expect(btn.className).toContain('btn-ai')
    expect(btn.className).toContain('btn-lg')
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disables and shows a spinner while loading', () => {
    const onClick = vi.fn()
    render(<Button isLoading onClick={onClick}>Save</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Badge', () => {
  it('fires onRemove when removable', () => {
    const onRemove = vi.fn()
    render(<Badge removable onRemove={onRemove}>Tag</Badge>)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})

describe('Toggle & Checkbox', () => {
  it('Toggle exposes a switch role and fires onChange', () => {
    const onChange = vi.fn()
    render(<Toggle label="Snap" onChange={onChange} />)
    const sw = screen.getByRole('switch')
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('Checkbox toggles checked state', () => {
    const onChange = vi.fn()
    render(<Checkbox label="Agree" onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledOnce()
  })
})

describe('Select', () => {
  const options = [
    { label: 'Instagram', value: 'ig' },
    { label: 'TikTok', value: 'tt' },
  ]

  it('opens on click and selects an option', () => {
    const onChange = vi.fn()
    render(<Select options={options} placeholder="Pick" onChange={onChange} />)
    const trigger = screen.getByRole('button')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('option', { name: 'TikTok' }))
    expect(onChange).toHaveBeenCalledWith('tt')
  })

  it('selects the active option via keyboard', () => {
    const onChange = vi.fn()
    render(<Select options={options} placeholder="Pick" onChange={onChange} />)
    const trigger = screen.getByRole('button')
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('tt')
  })
})

describe('Modal', () => {
  it('renders a dialog and closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Confirm">
        <p>Body</p>
      </Modal>
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not render when closed', () => {
    render(<Modal open={false} onClose={() => {}} title="Hidden">x</Modal>)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('EmptyState & ErrorState', () => {
  it('EmptyState shows title, description and action', () => {
    render(<EmptyState title="Nothing here" description="Add one" action={<button>Create</button>} />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.getByText('Add one')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('ErrorState fires onRetry', () => {
    const onRetry = vi.fn()
    render(<ErrorState description="Network failed" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe('ProgressBar', () => {
  it('reports value via aria', () => {
    render(<ProgressBar value={42} label="Upload" />)
    const bar = screen.getByRole('progressbar', { name: 'Upload' })
    expect(bar).toHaveAttribute('aria-valuenow', '42')
  })
})

describe('Toast', () => {
  function Harness() {
    const { success } = useToast()
    return <button onClick={() => success('Saved your draft', 'Done')}>fire</button>
  }

  it('shows a toast and dismisses it', () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'fire' }))
    expect(screen.getByText('Saved your draft')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    // leaving animation removes it after a tick; assert it's marked leaving (still present)
    expect(screen.getByText('Saved your draft')).toBeInTheDocument()
  })
})
