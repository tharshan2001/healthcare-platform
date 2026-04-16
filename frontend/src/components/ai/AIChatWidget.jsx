import { useState, useRef, useEffect } from 'react'
import botImage from '../assets/bot.png'

const API_BASE = import.meta.env.VITE_AI_SYMPTOM_API || 'http://localhost:8000'

const BotAvatar = () => (
  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 shadow-md overflow-hidden p-1">
    <img src={botImage} alt="Dr. AI" className="w-full h-full object-cover" />
  </div>
)

const UserAvatar = () => (
  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg shrink-0">
    👤
  </div>
)

export default function AIChatWidget() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm Dr. AI, your medical symptom assistant. Describe your symptoms (e.g., 'headache, fever, cough') and I'll suggest possible conditions. Remember to consult a doctor for proper diagnosis." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Couldn\'t reach server. Please ensure backend is running.' 
      }])
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-md p-2">
              <img src={botImage} alt="Dr. AI" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">Dr. AI Medical</h1>
              <p className="text-xs text-gray-500">Your virtual health companion</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-white rounded-xl shadow-sm mb-4 min-h-[70vh]">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
              {msg.role === 'assistant' && <BotAvatar />}
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
              {msg.role === 'user' && <UserAvatar />}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <BotAvatar />
              <div className="bg-gray-100 p-4 rounded-2xl">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms..."
            className="flex-1 px-4 py-3 rounded-full bg-white text-gray-800 placeholder-gray-400 border border-gray-200 focus:outline-none focus:border-blue-500 focus:shadow-sm transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium rounded-full transition-colors"
          >
            {loading ? '...' : 'Ask'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-3">
          ⚠️ For educational purposes only. Always consult a medical professional.
        </p>
      </div>
    </div>
  )
}