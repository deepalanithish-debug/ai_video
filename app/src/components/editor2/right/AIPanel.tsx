'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, ArrowUp } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { IconButton } from '@/components/ui'
import { processAICommand, QUICK_CHIPS } from '../lib/aiCommands'

interface ChatMessage { id: string; role: 'user' | 'assistant' | 'system'; text: string; isError?: boolean }

export function AIPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'system', text: "Hi — I'm your AI creative director. Ask me to refine pacing, add captions, change the look, or anything else." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const setIsGenerating = useEditorStore((s) => s.setIsGenerating)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'user', text: text.trim() }])
    setInput('')
    setLoading(true)
    setIsGenerating(true)
    try {
      const reply = await processAICommand(text.trim(), useEditorStore.getState())
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', text: reply }])
    } catch (e) {
      setMessages((m) => [...m, {
        id: crypto.randomUUID(), role: 'assistant', isError: true,
        text: e instanceof Error ? e.message : 'Something went wrong — try rephrasing, or adjust it manually in the tools on the left.',
      }])
    } finally {
      setLoading(false)
      setIsGenerating(false)
    }
  }, [loading, setIsGenerating])

  return (
    <div className="ai-panel">
      <div className="ai-log" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`ai-msg${m.role === 'user' ? ' is-user' : ''}`}>
            {m.role !== 'user' && <span className="ai-avatar" aria-hidden="true"><Sparkles size={11} /></span>}
            <div className={`ai-bubble ${m.role === 'user' ? 'is-user' : m.isError ? 'is-error' : 'is-assistant'}`}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="ai-msg">
            <span className="ai-avatar" aria-hidden="true"><Sparkles size={11} /></span>
            <div className="ai-bubble is-assistant"><span className="ai-thinking"><span /><span /><span /></span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="ai-suggest">
        {QUICK_CHIPS.map((c) => (
          <button key={c} type="button" className="chip" onClick={() => send(c)}>{c}</button>
        ))}
      </div>

      <div className="ai-input-row">
        <textarea
          className="textarea-base"
          rows={1}
          value={input}
          placeholder="Ask your AI director…"
          disabled={loading}
          aria-label="Message the AI creative director"
          style={{ minHeight: 38 }}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
        />
        <IconButton label="Send" variant="primary" size="md" disabled={!input.trim() || loading} onClick={() => send(input)}>
          <ArrowUp size={15} />
        </IconButton>
      </div>
    </div>
  )
}
