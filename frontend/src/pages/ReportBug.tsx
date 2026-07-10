import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Sparkles, Upload, Bug as BugIcon, CheckCircle2, X } from 'lucide-react'
import { api, apiErrorMessage, AiExtracted, Priority, ProjectOut } from '../lib/api'
import Layout from '../components/Layout'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

function detectEnvironment() {
  const ua = navigator.userAgent
  let browser = 'Unknown Browser'
  if (ua.includes('Edg/')) browser = 'Microsoft Edge'
  else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Google Chrome'
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'

  let os = 'Unknown OS'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Linux')) os = 'Linux'

  const device = /Mobi|Android/i.test(ua) ? 'Mobile' : 'Desktop'
  const screen_resolution = `${window.screen.width}x${window.screen.height}`

  return { browser, operating_system: os, device, screen_resolution }
}

export default function ReportBug() {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { projectId?: string } }

  const [projects, setProjects] = useState<ProjectOut[]>([])
  const [projectsError, setProjectsError] = useState('')

  // --- AI helper chat (optional — never blocks submission) ---
  const [showAssistant, setShowAssistant] = useState(true)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [aiPowered, setAiPowered] = useState(false)
  const [aiStarted, setAiStarted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // --- The report form itself. Always visible, always submittable. ---
  const [form, setForm] = useState({
    project_id: location.state?.projectId || '',
    title: '',
    description: '',
    steps_to_reproduce: '',
    priority: 'medium' as Priority,
  })
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submittedBugId, setSubmittedBugId] = useState<string | null>(null)

  useEffect(() => {
    api
      .get('/projects')
      .then((res) => {
        setProjects(res.data)
        if (!form.project_id && res.data.length === 1) {
          setForm((f) => ({ ...f, project_id: res.data[0].id }))
        }
      })
      .catch((err) => setProjectsError(apiErrorMessage(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  function applyExtracted(extracted: AiExtracted | null | undefined) {
    if (!extracted) return
    setForm((f) => ({
      ...f,
      title: extracted.title || f.title,
      description: extracted.description || f.description,
      steps_to_reproduce: extracted.steps_to_reproduce || f.steps_to_reproduce,
      priority: extracted.priority || f.priority,
      project_id: extracted.project_id || f.project_id,
    }))
  }

  async function sendToAssistant(history: ChatMsg[]) {
    setThinking(true)
    setError('')
    try {
      const res = await api.post('/ai/assist', { messages: history, selected_project_id: form.project_id || null })
      const data = res.data
      setMessages([...history, { role: 'assistant', content: data.message }])
      setAiPowered(data.ai_powered)
      applyExtracted(data.extracted)
    } catch (err) {
      // The AI helper is optional — a failure here should never block the
      // person from just filling in the form manually and submitting.
      setError(`Assistant unavailable right now (${apiErrorMessage(err)}). You can still fill in the form directly below.`)
    } finally {
      setThinking(false)
    }
  }

  function startAssistant() {
    setAiStarted(true)
    sendToAssistant([])
  }

  function handleSend() {
    if (!input.trim()) return
    const next: ChatMsg[] = [...messages, { role: 'user', content: input.trim() }]
    setMessages(next)
    setInput('')
    sendToAssistant(next)
  }

  function handleScreenshotChange(file: File | null) {
    setScreenshot(file)
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview)
    setScreenshotPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmitBug(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const env = detectEnvironment()
      const res = await api.post('/bugs', {
        project_id: form.project_id,
        title: form.title,
        description: form.description || null,
        steps_to_reproduce: form.steps_to_reproduce || null,
        priority: form.priority,
        ai_conversation: messages.length ? JSON.stringify(messages) : null,
        ...env,
      })
      const bugId = res.data.id
      if (screenshot) {
        const fd = new FormData()
        fd.append('file', screenshot)
        await api.post(`/bugs/${bugId}/screenshot`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      setSubmittedBugId(bugId)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedBugId) {
    return (
      <Layout>
        <div className="container-narrow" style={{ paddingTop: 100, textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'var(--green-soft)',
              color: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <CheckCircle2 size={30} />
          </div>
          <h2 style={{ fontSize: 22 }}>Bug reported</h2>
          <p className="mt-8">Your developer-ready report is in. Thanks for the details.</p>
          <div className="flex gap-12 mt-24" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate(`/bugs/${submittedBugId}`)}>
              View bug
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              Back to dashboard
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  const canSubmit = form.project_id && form.title.trim().length >= 3

  return (
    <Layout>
      <div className="container mt-32" style={{ paddingBottom: 60 }}>
        <button className="flex items-center gap-8 text-sm text-secondary" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 18 }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-12">
          <h1 style={{ fontSize: 26 }}>Report a bug</h1>
        </div>
        <p className="mt-8">Fill in what you know below, attach a screenshot if you have one, and submit.</p>

        {projectsError && <p className="error-text mt-16">{projectsError}</p>}

        <div className="mt-24" style={{ display: 'grid', gridTemplateColumns: showAssistant ? '1fr 1fr' : '1fr', gap: 24 }}>
          {/* The actual report form — always here, always submittable */}
          <form className="card card-pad" onSubmit={handleSubmitBug} style={{ height: 'fit-content' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <div className="flex items-center gap-8">
                <BugIcon size={18} color="var(--accent-bright)" />
                <h3 style={{ fontSize: 16 }}>Bug details</h3>
              </div>
              {!showAssistant && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setShowAssistant(true)
                    if (!aiStarted) startAssistant()
                  }}
                >
                  <Sparkles size={13} /> Ask AI to help
                </button>
              )}
            </div>

            <div className="field">
              <label>Project / website</label>
              <select
                className="select"
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                required
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Title</label>
              <input
                className="input"
                placeholder="Short summary of the issue"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                minLength={3}
              />
            </div>

            <div className="field">
              <label>Description</label>
              <textarea
                className="textarea"
                placeholder="What happened?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Steps to reproduce</label>
              <textarea
                className="textarea"
                placeholder={'1. Go to...\n2. Click...\n3. Notice...'}
                value={form.steps_to_reproduce}
                onChange={(e) => setForm({ ...form, steps_to_reproduce: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Priority</label>
              <select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="field">
              <label>Screenshot (optional)</label>
              {screenshotPreview ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleScreenshotChange(null)}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(10,11,15,0.7)' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <label
                  className="flex items-center gap-8 text-sm"
                  style={{
                    border: '1px dashed var(--border-hover)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Upload size={15} />
                  Choose an image...
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => handleScreenshotChange(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>

            <p className="hint">
              Auto-captured: {detectEnvironment().browser}, {detectEnvironment().operating_system},{' '}
              {detectEnvironment().screen_resolution}
            </p>

            {error && <p className="error-text mt-8">{error}</p>}

            <button className="btn btn-primary btn-block mt-16" disabled={submitting || !canSubmit}>
              {submitting ? <span className="spinner" /> : 'Submit bug report'}
            </button>
            {!canSubmit && <p className="hint mt-8">Pick a project and enter at least a 3-character title to submit.</p>}
          </form>

          {/* Optional AI helper panel */}
          {showAssistant && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 480 }}>
              <div className="flex items-center justify-between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent-bright)' }}>
                  <Sparkles size={12} /> {aiPowered ? 'Gemini-powered' : 'Smart assistant'}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAssistant(false)}
                  title="Hide assistant"
                >
                  <X size={13} />
                </button>
              </div>

              {!aiStarted ? (
                <div className="flex-col items-center justify-center" style={{ flex: 1, padding: 24, textAlign: 'center', gap: 12 }}>
                  <Sparkles size={22} color="var(--accent-bright)" />
                  <p className="text-sm text-secondary">
                    Describe the bug in your own words and the assistant will help fill in the form on the left —
                    project, priority, and steps to reproduce.
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={startAssistant}>
                    Start describing the bug
                  </button>
                </div>
              ) : (
                <>
                  <div ref={scrollRef} className="flex-col gap-16" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                    {messages.map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div
                          style={{
                            maxWidth: '80%',
                            padding: '10px 14px',
                            borderRadius: 14,
                            fontSize: 14,
                            lineHeight: 1.5,
                            background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                            color: m.role === 'user' ? 'white' : 'var(--text-primary)',
                            border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                          }}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {thinking && (
                      <div className="flex items-center gap-8 text-sm text-muted">
                        <span className="spinner spinner-dark" /> thinking...
                      </div>
                    )}
                  </div>
                  <div className="flex gap-8" style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                    <input
                      className="input"
                      placeholder="Type your reply..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      disabled={thinking}
                    />
                    <button className="btn btn-primary" onClick={handleSend} disabled={thinking || !input.trim()}>
                      <Send size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
