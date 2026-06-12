import React, { useState, useRef, useEffect } from 'react'
import useAuthStore from '../store/auth'
import { listLocalConversations, saveLocalConversation, sendChat } from '../api'

const EMPTY_ASSISTANT_FALLBACK = '我没有生成有效回复。你可以换个说法，或贴出你要处理的项目、日志、配置，我继续帮你看。'

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
      const reply = normalizeAssistantReply(res.data.reply) || EMPTY_ASSISTANT_FALLBACK
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
        {messages.filter(hasVisibleMessageContent).map((msg, i) => (
          <MessageItem key={i} message={msg} />
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

function MessageItem({ message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="min-w-0 max-w-[86%] overflow-hidden rounded-2xl rounded-br-sm bg-brand-600 px-4 py-3 text-sm leading-relaxed text-white whitespace-pre-wrap break-words [overflow-wrap:anywhere] sm:max-w-[70%]">
          {message.content}
        </div>
      </div>
    )
  }

  if (message.isError) {
    return (
      <div className="flex justify-start">
        <div className="min-w-0 max-w-[86%] overflow-hidden rounded-2xl rounded-bl-sm bg-red-900/40 px-4 py-3 text-sm leading-relaxed text-red-300 whitespace-pre-wrap break-words [overflow-wrap:anywhere] sm:max-w-[70%]">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <article className="min-w-0 w-full max-w-[52rem] rounded-xl px-1 py-1 text-[15px] leading-7 text-gray-100 sm:px-2">
        <RichAssistantContent content={message.content} />
      </article>
    </div>
  )
}

function RichAssistantContent({ content }) {
  const { thoughts, visibleText } = extractThoughts(content)
  const parts = parseAssistantBlocks(visibleText)

  return (
    <div className="space-y-4">
      {thoughts.map((thought, index) => (
        <ThoughtBlock key={`thought-${index}`} content={thought} />
      ))}

      {parts.map((part, index) => {
        if (part.type === 'thought') {
          return <ThoughtBlock key={index} content={part.content} />
        }
        if (part.type === 'code') {
          return <CodeBlock key={index} language={part.language} code={part.content} />
        }
        return <TextBlock key={index} text={part.content} />
      })}
    </div>
  )
}

function TextBlock({ text }) {
  const blocks = text
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)

  return blocks.map((block, index) => {
    if (isListBlock(block)) {
      return <ListBlock key={index} text={block} />
    }

    return (
      <p key={index} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {renderInlineCode(block)}
      </p>
    )
  })
}

function ListBlock({ text }) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  return (
    <ul className="space-y-1 pl-5">
      {lines.map((line, index) => (
        <li key={index} className="list-disc break-words [overflow-wrap:anywhere]">
          {renderInlineCode(line.replace(/^[-*]\s+/, ''))}
        </li>
      ))}
    </ul>
  )
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false)
  const label = language || 'text'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#2a2f3e] bg-[#0b0e14]">
      <div className="flex items-center justify-between gap-3 border-b border-[#2a2f3e] bg-[#111722] px-3 py-2">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-[#1e2535] hover:text-white"
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="max-h-[28rem] overflow-auto p-4 text-[13px] leading-6 text-gray-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function ThoughtBlock({ content }) {
  if (!content?.trim()) return null

  return (
    <details className="group rounded-lg border border-[#2a2f3e] bg-[#111722]/70 px-3 py-2">
      <summary className="cursor-pointer select-none text-sm text-gray-400 transition-colors group-open:text-gray-200">
        思考
      </summary>
      <div className="mt-3 space-y-3 border-t border-[#2a2f3e] pt-3 text-sm leading-6 text-gray-400">
        <TextBlock text={content} />
      </div>
    </details>
  )
}

function extractThoughts(content) {
  let visibleText = normalizeMessageContent(content)
  const thoughts = []
  const thoughtPattern = /<(think|thinking|thought)>\s*([\s\S]*?)\s*<\/\1>/gi

  visibleText = visibleText.replace(thoughtPattern, (_, _tag, thought) => {
    if (thought?.trim()) thoughts.push(thought.trim())
    return '\n'
  })

  return { thoughts, visibleText: visibleText.trim() }
}

function parseAssistantBlocks(text) {
  const blocks = []
  const fencePattern = /```([^\n`]*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = fencePattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim()
    if (before) blocks.push({ type: 'text', content: before })

    const language = match[1]?.trim()
    const content = match[2]?.replace(/\n$/, '') || ''
    blocks.push({
      type: isThoughtLanguage(language) ? 'thought' : 'code',
      language,
      content,
    })
    lastIndex = fencePattern.lastIndex
  }

  const after = text.slice(lastIndex).trim()
  if (after) blocks.push({ type: 'text', content: after })

  return blocks.length ? blocks : [{ type: 'text', content: text }]
}

function isThoughtLanguage(language) {
  return ['think', 'thinking', 'thought', 'reasoning', '思考'].includes((language || '').toLowerCase())
}

function isListBlock(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  return lines.length > 1 && lines.every(line => /^[-*]\s+/.test(line))
}

function renderInlineCode(text) {
  const parts = text.split(/(`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={index} className="rounded-md bg-[#e8eaef] px-1.5 py-0.5 font-mono text-[0.92em] text-[#1f2328]">
          {part.slice(1, -1)}
        </code>
      )
    }

    return part
  })
}

function normalizeMessages(messages) {
  return messages
    .filter(message => message.role !== 'assistant' || normalizeMessageContent(message.content).trim())
    .map(message => ({
      ...message,
      content: message.role === 'assistant'
        ? normalizeAssistantReply(message.content)
        : normalizeMessageContent(message.content),
    }))
    .filter(message => message.role !== 'assistant' || hasVisibleMessageContent(message))
}

function hasVisibleMessageContent(message) {
  return typeof message?.content === 'string'
    ? message.content.trim().length > 0
    : message?.content != null
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
  if (!text || text === 'NO_REPLY') return EMPTY_ASSISTANT_FALLBACK

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

  return fallback?.trim() || EMPTY_ASSISTANT_FALLBACK
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
