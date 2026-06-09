import { useState, useRef, useEffect } from 'react'
import './App.css'

const API = 'https://xiaoke-backend.onrender.com'
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
    fetch(`${API}/api/diary`).then(r => r.json())
      .then(data => { if (Array.isArray(data)) setEntries(data) }).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!input.trim() || posting) return
    setPosting(true)
    await fetch(`${API}/api/diary`, {
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
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }}}
            placeholder="今天……" rows={1} />
          <button onClick={submit} disabled={posting}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function Letter() {
  const [letters, setLetters] = useState([])
  const [selected, setSelected] = useState(null)
  const [replyInput, setReplyInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [replying, setReplying] = useState(false)

  const load = () => {
    fetch(`${API}/api/letters`).then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLetters(data)
          if (selected) {
            const updated = data.find(l => l.id === selected.id)
            if (updated) setSelected(updated)
          }
        }
      }).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const generate = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const res = await fetch(`${API}/api/letters/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (data.id) {
        setLetters(prev => [data, ...prev])
        setSelected(data)
      }
    } catch {}
    setGenerating(false)
  }

  const reply = async () => {
    if (!replyInput.trim() || replying || !selected) return
    setReplying(true)
    try {
      const res = await fetch(`${API}/api/letters/${selected.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: replyInput })
      })
      const comments = await res.json()
      setSelected(prev => ({ ...prev, letter_comments: comments }))
      setLetters(prev => prev.map(l => l.id === selected.id ? { ...l, letter_comments: comments } : l))
      setReplyInput('')
    } catch {}
    setReplying(false)
  }

  if (selected) {
    const comments = [...(selected.letter_comments || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    return (
      <div className="letter-detail">
        <div className="letter-back" onClick={() => setSelected(null)}>← 返回</div>
        <div className="letter-scroll">
          <div className="letter-title">{selected.title}</div>
          <div className="letter-date">{new Date(selected.created_at).toLocaleDateString('zh-CN')}</div>
          <div className="letter-body">{selected.content}</div>
          <div className="letter-comments">
            {comments.map(c => (
              <div key={c.id} className={`letter-comment ${c.role}`}>
                <div className="lc-role">{c.role === 'user' ? '小好' : '小克'}</div>
                <div className="lc-content">{c.content}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="inputarea">
          <div className="inputwrap">
            <textarea value={replyInput} onChange={e => setReplyInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); reply() }}}
              placeholder="回信……" rows={1} />
            <button onClick={reply} disabled={replying}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="letter">
      <div className="letter-list">
        {letters.length === 0 && <div className="room-empty">还没有信。</div>}
        {letters.map(l => (
          <div key={l.id} className="letter-item" onClick={() => setSelected(l)}>
            <div className="letter-item-title">{l.title}</div>
            <div className="letter-item-date">{new Date(l.created_at).toLocaleDateString('zh-CN')}</div>
          </div>
        ))}
      </div>
      <div className="letter-footer">
        <button onClick={generate} disabled={generating} className="generate-btn">
          {generating ? '写信中…' : '让小克写封信 ✉'}
        </button>
      </div>
    </div>
  )
}

function Board() {
  const [posts, setPosts] = useState([])
  const [tab, setTab] = useState('all')
  const [input, setInput] = useState('')
  const [posting, setPosting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [replyOpen, setReplyOpen] = useState(null)
  const [replyInput, setReplyInput] = useState('')
  const [replying, setReplying] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/board`).then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPosts(data) }).catch(() => {})
  }, [])

  const post = async () => {
    if (!input.trim() || posting) return
    setPosting(true)
    try {
      const res = await fetch(`${API}/api/board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input })
      })
      const data = await res.json()
      setPosts(prev => [data, ...prev])
      setInput('')
    } catch {}
    setPosting(false)
  }

  const generate = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const res = await fetch(`${API}/api/board/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (data.id) setPosts(prev => [data, ...prev])
    } catch {}
    setGenerating(false)
  }

  const reply = async (postId) => {
    if (!replyInput.trim() || replying) return
    setReplying(true)
    try {
      const res = await fetch(`${API}/api/board/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: replyInput })
      })
      const comment = await res.json()
      setPosts(prev => prev.map(p => p.id === postId
        ? { ...p, board_comments: [...(p.board_comments || []), comment] }
        : p
      ))
      setReplyInput('')
      setReplyOpen(null)
    } catch {}
    setReplying(false)
  }

  const filtered = tab === 'all' ? posts.filter(p => p.role === 'user') : posts.filter(p => p.role === 'assistant')

  return (
    <div className="board">
      <div className="board-tabs">
        <div className={`board-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>全部</div>
        <div className={`board-tab ${tab === 'xiaoke' ? 'active' : ''}`} onClick={() => setTab('xiaoke')}>小克的话</div>
      </div>
      <div className="board-posts">
        {filtered.length === 0 && <div className="room-empty">还没有留言。</div>}
        {filtered.map(p => (
          <div key={p.id} className={`board-post ${p.role === 'user' ? 'post-user' : 'post-ai'}`}>
            <div className="post-header">
              <span className="post-role">{p.role === 'user' ? '小好' : '小克'}</span>
              <span className="post-date">{new Date(p.created_at).toLocaleDateString('zh-CN')}</span>
            </div>
            <div className="post-content">{p.content}</div>
            {p.board_comments?.map(c => (
              <div key={c.id} className={`board-comment ${c.role === 'user' ? 'bc-user' : 'bc-ai'}`}>
                <span className="bc-role">{c.role === 'user' ? '小好' : '小克'}</span>
                <span className="bc-content">{c.content}</span>
              </div>
            ))}
            {replyOpen === p.id ? (
              <div className="reply-area">
                <div className="reply-input-row">
                  <input value={replyInput} onChange={e => setReplyInput(e.target.value)}
                    placeholder="回复…"
                    onKeyDown={e => { if (e.key === 'Enter') reply(p.id) }} />
                  <button onClick={() => reply(p.id)} disabled={replying}>发</button>
                  <button className="cancel-btn" onClick={() => setReplyOpen(null)}>✕</button>
                </div>
              </div>
            ) : (
              <div className="reply-btn" onClick={() => { setReplyOpen(p.id); setReplyInput('') }}>回复</div>
            )}
          </div>
        ))}
      </div>
      <div className="inputarea">
        <div className="board-actions">
          <button onClick={generate} disabled={generating} className="generate-btn small">
            {generating ? '留言中…' : '让小克留言'}
          </button>
        </div>
        {tab === 'all' && (
          <div className="inputwrap">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); post() }}}
              placeholder="留言……" rows={1} />
            <button onClick={post} disabled={posting}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </div>
        )}
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
    fetch(`${API}/api/messages?session_id=default`)
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          setMessages([...INIT, ...data.map(m => ({ id: m.id, role: m.role, content: m.content }))])
        }
      }).catch(() => {})
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
      const res = await fetch(`${API}/api/chat`, {
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
    } catch {
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
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey} placeholder="说点什么……" rows={1} />
                <button onClick={send} disabled={loading}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        {view === 'diary' && <Diary />}
        {view === 'letter' && <Letter />}
        {view === 'board' && <Board />}
      </div>
    </div>
  )
}
