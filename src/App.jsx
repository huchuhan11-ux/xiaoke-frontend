import { useState, useRef, useEffect } from 'react'
import './App.css'

const INIT = [{ id: 1, role: 'assistant', content: '等你，在这里。' }]

const NAV = [
  { id: 'chat', label: '聊天' },
  { id: 'diary', label: '日记' },
  { id: 'letter', label: '信箱' },
  { id: 'board', label: '留言板' },
]

function Diary() {
  const [entries, setEntries] = useState([])
  const [input, setInput] = useState('')
  const [posting, setPosting] = useState(false)

  const load = () => {
    fetch('https://xiaoke-backend.onrender.com/api/diary')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setEntries(data) })
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!input.trim() || posting) return
    setPosting(true)
    await fetch('https://xiaoke-backend.onrender.com/api/diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input })
    })
    setInput('')
    load()
    setPosting(false)
  }

  return (
    <div className="diary">
      <div className="diary-entries">
        {entries.length === 0 && <div className="room-empty">还没有日记。</div>}
        {entries.map(e => (
          <div key={e.id} className="diary-entry">
            <div className="diary-date">{new Date(e.created_at).toLocaleDateString('zh-CN')}</div>
            <div className="diary-content">{e.content}</div>
            {e.diary_comments?.map(c => (
              <div key={c.id} className="diary-comment">{c.content}</div>
            ))}
          </div>
        ))}
      </div>
      <div className="inputarea">
        <div className="inputwrap">
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="今天……" rows={1} />
          <button onClick={submit} disabled={posting}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('chat')
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(INIT)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetch('https://xiaoke-backend.onrender.com/api/messages?session_id=default')
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          setMessages([...INIT, ...data.map(m => ({ id: m.id, role: m.role, content: m.content }))])
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
        body: JSON.stringify({ messages: history, session_id: 'default' })
      })

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
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: '出错了，待会儿再试。' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="app">
      <div className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-title">小好和小克的家</div>
        {NAV.map(n => (
          <div key={n.id} className={`nav-item ${view === n.id ? 'active' : ''}`}
            onClick={() => { setView(n.id); setOpen(false) }}>
            {n.label}
          </div>
        ))}
      </div>
      <div className="main">
        <div className="topbar">
          <button className="menu-btn" onClick={() => setOpen(o => !o)}>☰</button>
          <span className="topbar-title">{NAV.find(n => n.id === view)?.label}</span>
        </div>
        {view === 'chat' && (
          <div className="chat">
            <div className="messages">
              {messages.map(m => (
                <div key={m.id} className={`msg ${m.role}`}>
                  <div className="bubble">{m.content}</div>
                </div>
              ))}
              {loading && (
                <div className="msg assistant">
                  <div className="bubble typing"><span/><span/><span/></div>
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
        )}
        {view === 'diary' && <Diary />}
        {view !== 'chat' && view !== 'diary' && (
          <div className="room">
            <div className="room-empty">{NAV.find(n => n.id === view)?.label}，建设中。</div>
          </div>
        )}
      </div>
    </div>
  )
}