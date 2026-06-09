import { useState, useRef, useEffect } from 'react'
import './App.css'

const INIT = [{ id: 1, role: 'assistant', content: '等你，在这里。' }]

export default function App() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('messages')
    return saved ? JSON.parse(saved) : INIT
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages])

useEffect(() => {
  localStorage.setItem('messages', JSON.stringify(messages))
}, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = { id: Date.now(), role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const history = [...messages, userMsg]
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('https://xiaoke-backend.onrender.com/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    })

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let aiMsg = { id: Date.now(), role: 'assistant', content: '' }
    setMessages(prev => [...prev, aiMsg])

    const reader = res.body.getReader()
const decoder = new TextDecoder()
let aiMsg = { id: Date.now(), role: 'assistant', content: '' }
setMessages(prev => [...prev, aiMsg])
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop()
  for (const line of lines) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      try {
        const { text } = JSON.parse(line.slice(6))
        aiMsg = { ...aiMsg, content: aiMsg.content + text }
        setMessages(prev => prev.map(m => m.id === aiMsg.id ? aiMsg : m))
      } catch {}
    }
  }
}
  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="app">
      <div className="header">
        <span className="title">小好和小克的家</span>
      </div>
      <div className="messages">
        {messages.map(m => (
          <div key={m.id} className={`msg ${m.role}`}>
            <div className="bubble">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="msg assistant">
            <div className="bubble typing">
              <span/><span/><span/>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="inputarea">
        <div className="inputwrap">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder="说点什么……" rows={1} />
          <button onClick={send} disabled={loading}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}