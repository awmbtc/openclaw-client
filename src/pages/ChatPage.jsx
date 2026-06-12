import React, { useState, useRef, useEffect } from 'react'
import useAuthStore from '../store/auth'
import { listLocalConversations, saveLocalConversation, sendChat } from '../api'

export default function ChatPage() {
  const { activeAgent } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [convId, setConvId] = useState(null)
  const [convCreatedAt, setConvCreatedAt] = useState(null)
  const bottomRef = useRef(null)

  // 切换 Agent 时加载本机最近会话；本地数据不包含 API Key
  useEffect(() => {
    let cancelled = false

    async function loadLocalConversation() {
      try {
        const conversations = await listLocalConversations(activeAgent)
        if (cancelled) return

        const latest = conversations[0]
        setMessages(normalizeMessages(latest?.messages || []))
        setConvId(latest?.id || null)
        setConvCreatedAt(latest?.createdAt || null)
      } catch {
        if (!cancelled) {
          setMessages([])
          setConvId(null)
          setConvCreatedAt(null)
        }
      }
    }

    loadLocalConversation()

    return () => {
      cancelled = true
    }
  }, [activeAgent])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    const userMessage = { role: 'user', content: text, createdAt: new Date().toISOString() }
    const nextUserMessages = [...messages, userMessage]
    setMessages(nextUserMessages)
    setLoading(true)

    try {
      const res = await sendChat(activeAgent, text, convId)
      const reply = normalizeAssistantReply(res.data.reply)
      const assistantMessage = {
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
      }
      const nextMessages = [...nextUserMessages, assistantMessage]
      const nextConvId = res.data.conversationId || convId || `local_${Date.now()}`
      const now = new Date().toISOString()
      const nextCreatedAt = convCreatedAt || now

      setConvId(nextConvId)
      setConvCreatedAt(nextCreatedAt)
      setMessages(nextMessages)
      await saveLocalConversation({
        id: nextConvId,
        agentName: activeAgent,
        title: nextMessages.find(message => message.role === 'user')?.content?.slice(0, 48) || '新会话',
        messages: nextMessages,
        createdAt: nextCreatedAt,
        updatedAt: now,
      })
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
    <div className="flex h-full min-h-0 flex-col">
      {/* 消息列表 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4 sm:px-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-600">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm">开始和 {activeAgent === 'openclaw' ? 'OpenClaw 🦾' : '爱马仕 👜'} 对话</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`min-w-0 max-w-[86%] overflow-hidden px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] sm:max-w-[70%]
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
      <form onSubmit={handleSend} className="border-t border-[#2a2f3e] bg-[#161b27] px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`发送给 ${activeAgent === 'openclaw' ? 'OpenClaw' : '爱马仕'}...`}
            className="min-w-0 flex-1 px-4 py-3 bg-[#0f1117] border border-[#2a2f3e] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors text-sm font-medium sm:px-5"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  )
}

function normalizeMessages(messages) {
  return messages.map(message => ({
    ...message,
    content: message.role === 'assistant'
      ? normalizeAssistantReply(message.content)
      : normalizeMessageContent(message.content),
  }))
}

function normalizeMessageContent(content) {
  if (typeof content === 'string') return content
  if (content == null) return ''
  try {
    return JSON.stringify(content, null, 2)
  } catch {
    return String(content)
  }
}

function normalizeAssistantReply(content) {
  const text = normalizeMessageContent(content).trim()
  if (!text) return ''

  const parsed = parseJsonEnvelope(text)
  if (!parsed) return text

  const payloadText = extractPayloadText(parsed)
  if (payloadText) return payloadText

  const fallback = [
    parsed.finalAssistantVisibleText,
    parsed.finalAssistantRawText,
    parsed.meta?.finalAssistantVisibleText,
    parsed.meta?.finalAssistantRawText,
    parsed.result?.finalAssistantVisibleText,
    parsed.result?.finalAssistantRawText,
  ].find(value => typeof value === 'string' && value.trim() && value.trim() !== 'NO_REPLY')

  return fallback?.trim() || '我没理解这条消息想让我处理什么，可以换个说法吗？'
}

function parseJsonEnvelope(text) {
  const candidate = extractJsonObject(text)
  if (!candidate) return null

  try {
    const parsed = JSON.parse(candidate)
    if (Array.isArray(parsed.payloads) || Array.isArray(parsed.result?.payloads) || parsed.meta) {
      return parsed
    }
  } catch {
    return null
  }
  return null
}

function extractJsonObject(text) {
  const start = text.indexOf('{')
  if (start < 0) return ''

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i += 1) {
    const char = text[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
    } else if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return text.slice(start, i + 1)
      }
    }
  }

  return text.slice(start)
}

function extractPayloadText(parsed) {
  const payloads = Array.isArray(parsed.payloads)
    ? parsed.payloads
    : parsed.result?.payloads

  if (!Array.isArray(payloads)) return ''

  return payloads
    .map(payload => payload?.text)
    .filter(value => typeof value === 'string' && value.trim())
    .join('\n\n')
    .trim()
}
