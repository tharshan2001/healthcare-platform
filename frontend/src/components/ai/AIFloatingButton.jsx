import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import botImage from '../../assets/bot.png'

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

const EXCLUDED_ROUTES = [
  '/doctor/dashboard',
  '/patient/dashboard',
  '/doctor/appointments',
  '/doctor/schedule',
  '/doctor/patients',
  '/doctor/prescriptions',
  '/doctor/availability',
  '/doctor/telemedicine',
  '/doctor/profile',
  '/patient/doctors',
  '/patient/appointments',
  '/patient/records',
  '/patient/telemedicine',
  '/patient/profile',
]

export default function AIFloatingButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm Dr. AI, your medical symptom assistant. Describe your symptoms (e.g., 'headache, fever, cough') and I'll suggest possible conditions. Remember to consult a doctor for proper diagnosis." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const location = useLocation()

  const isExcluded = EXCLUDED_ROUTES.some(route => location.pathname.startsWith(route))

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const closeChat = () => {
    setIsOpen(false)
  }

  if (isExcluded) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 z-50"
        aria-label="Open AI Assistant"
      >
        <img src={botImage} alt="Dr. AI" className="w-10 h-10 rounded-full" />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-200">
          <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={botImage} alt="Dr. AI" className="w-8 h-8 rounded-full" />
              <div>
                <h3 className="font-semibold">Dr. AI Medical</h3>
                <p className="text-xs text-blue-100">Your virtual health companion</p>
              </div>
            </div>
            <button onClick={closeChat} className="text-white hover:bg-blue-600 p-1 rounded">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {msg.role === 'assistant' && <BotAvatar />}
                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-800 shadow-sm'
                }`}>
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                </div>
                {msg.role === 'user' && <UserAvatar />}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <BotAvatar />
                <div className="bg-white p-3 rounded-xl shadow-sm">
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

          <form onSubmit={handleSubmit} className="p-3 border-t bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your symptoms..."
              className="flex-1 px-4 py-2 rounded-full bg-gray-100 text-gray-800 placeholder-gray-400 border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium rounded-full transition-colors text-sm"
            >
              {loading ? '...' : 'Send'}
            </button>
          </form>

          <div className="bg-gray-50 px-3 pb-2 text-center">
            <p className="text-gray-400 text-[10px]">
              ⚠️ For educational purposes only. Always consult a medical professional.
            </p>
          </div>
        </div>
      )}
    </>
  )
}