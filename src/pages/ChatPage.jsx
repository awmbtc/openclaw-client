import React, { useState, useRef, useEffect } from 'react'
import useAuthStore from '../store/auth'
import { sendChat } from '../api'

export default function ChatPage() {
  const { activeAgent } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [convId, setConvId] = useState(null)
  const bottomRef = useRef(null)

  // 切换 Agent 时清空当前对话
  useEffect(() => {
    setMessages([])
    setConvId(null)
  }, [activeAgent])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await sendChat(activeAgent, text, convId)
      setConvId(res.data.conversationId)
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `错误：${err.response?.data?.error || '请求失败，请检查网络或 Token'}`,
        isError: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm">开始和 {activeAgent === 'openclaw' ? 'OpenClaw 🦾' : '爱马仕 👜'} 对话</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
              ${msg.role === 'user'
                ? 'bg-brand-600 text-white rounded-br-sm'
                : msg.isError
                  ? 'bg-red-900/40 text-red-300 rounded-bl-sm'
                  : 'bg-[#1e2535] text-gray-200 rounded-bl-sm'}`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1e2535] px-4 py-3 rounded-2xl rounded-bl-sm">
              <span className="flex gap-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSend} className="px-6 py-4 border-t border-[#2a2f3e] bg-[#161b27]">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`发送给 ${activeAgent === 'openclaw' ? 'OpenClaw' : '爱马仕'}...`}
            className="flex-1 px-4 py-3 bg-[#0f1117] border border-[#2a2f3e] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors text-sm font-medium"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  )
}
