'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  MessageCircle, X, Send, Loader2, Bot, User,
  Sparkles, ChevronDown, RotateCcw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id:      string
  role:    'user' | 'assistant'
  content: string
  error?:  boolean
}

const SUGGESTED = [
  'Kapan barang saya tiba?',
  'Berapa lama lagi sampai?',
  'Apa status pengiriman saat ini?',
  'Dokumen apa yang sudah siap?',
  'Apakah ada keterlambatan?',
  'Apa itu status "Bea Cukai"?',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 9) }

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'

  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
        isUser ? 'bg-brand-600' : 'bg-slate-100 border border-slate-200'
      )}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot className="w-3.5 h-3.5 text-slate-500" />
        }
      </div>

      {/* Bubble */}
      <div className={cn(
        'max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
        isUser
          ? 'bg-brand-600 text-white rounded-tr-sm'
          : msg.error
          ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm'
          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm shadow-sm'
      )}>
        {/* Render newlines and simple markdown-like formatting */}
        {msg.content.split('\n').map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
        {msg.content === '' && (
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PortalChatbotProps {
  orgName:    string
  clientName: string
}

export function PortalChatbot({ orgName, clientName }: PortalChatbotProps) {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [streaming, setStreaming] = useState(false)
  const [unread, setUnread]     = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const abortRef       = useRef<AbortController | null>(null)

  // Scroll ke bawah saat pesan baru masuk
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input saat chat dibuka
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
      setUnread(0)
    }
  }, [open])

  // Pesan sambutan saat pertama dibuka
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id:      genId(),
        role:    'assistant',
        content: `Halo${clientName ? `, ${clientName.split(' ')[0]}` : ''}! 👋\n\nSaya asisten AI dari ${orgName}. Saya bisa membantu Anda mengecek status pengiriman, jadwal kedatangan, atau informasi dokumen.\n\nAda yang bisa saya bantu?`,
      }])
    }
  }, [open, messages.length, clientName, orgName])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return

    setInput('')
    const userMsg: Message = { id: genId(), role: 'user', content: trimmed }
    const asstMsg: Message = { id: genId(), role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMsg, asstMsg])
    setStreaming(true)

    // Build history for API (exclude the empty assistant msg we just added)
    const history = [...messages, userMsg].map(m => ({
      role:    m.role,
      content: m.content,
    }))

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/portal/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: trimmed, history }),
        signal:  abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('Gagal menghubungi asisten')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      let   full    = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') continue

          try {
            const { text, error } = JSON.parse(payload)
            if (error) throw new Error(error)
            if (text) {
              full += text
              setMessages(prev => prev.map(m =>
                m.id === asstMsg.id ? { ...m, content: full } : m
              ))
            }
          } catch (parseErr) {
            // Skip malformed chunks
          }
        }
      }

      // Bump unread jika chat tertutup
      if (!open) setUnread(n => n + 1)

    } catch (err: any) {
      if (err.name === 'AbortError') return
      setMessages(prev => prev.map(m =>
        m.id === asstMsg.id
          ? { ...m, content: 'Maaf, terjadi kesalahan. Silakan coba lagi.', error: true }
          : m
      ))
    } finally {
      setStreaming(false)
    }
  }, [messages, streaming, open])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const reset = () => {
    abortRef.current?.abort()
    setMessages([])
    setInput('')
    setStreaming(false)
  }

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="relative w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center"
            aria-label="Buka chat asisten"
          >
            <MessageCircle className="w-6 h-6" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          style={{ height: '520px', maxHeight: 'calc(100vh - 5rem)' }}>

          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 bg-brand-600 text-white shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-none">Asisten {orgName}</p>
              <p className="text-[10px] text-white/70 mt-0.5">Tanya apa saja tentang pengiriman Anda</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 1 && (
                <button onClick={reset} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" title="Reset percakapan">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {/* Suggested questions — tampil setelah pesan sambutan */}
            {messages.length === 1 && !streaming && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold px-0.5">Pertanyaan umum:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED.map(q => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-xs px-2.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-100 bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ketik pertanyaan… (Enter untuk kirim)"
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 disabled:opacity-60 transition-all leading-relaxed"
                style={{ maxHeight: '100px' }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 100) + 'px'
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || streaming}
                className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 active:scale-95"
              >
                {streaming
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
              </button>
            </div>
            <p className="text-[9px] text-slate-300 text-center mt-2">
              Powered by AI · Informasi berdasarkan data real-time
            </p>
          </div>
        </div>
      )}
    </>
  )
}
