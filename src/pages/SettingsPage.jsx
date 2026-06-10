import React, { useState } from 'react'
import useAuthStore from '../store/auth'
import { saveApiKey } from '../api'

const PROVIDERS = [
  { id: 'openai',    label: 'OpenAI',    placeholder: 'sk-...' },
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'gemini',    label: 'Google Gemini', placeholder: 'AIza...' },
]

export default function SettingsPage() {
  const { activeAgent } = useAuthStore()
  const [keys, setKeys] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})

  async function handleSave(provider) {
    const key = keys[provider]?.trim()
    if (!key) return
    setSaving(s => ({ ...s, [provider]: true }))
    try {
      await saveApiKey(activeAgent, provider, key)
      setSaved(s => ({ ...s, [provider]: true }))
      setKeys(k => ({ ...k, [provider]: '' }))
      setTimeout(() => setSaved(s => ({ ...s, [provider]: false })), 2000)
    } catch (err) {
      alert(`保存失败：${err.response?.data?.error || '未知错误'}`)
    } finally {
      setSaving(s => ({ ...s, [provider]: false }))
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <h1 className="text-lg font-semibold text-white mb-1">设置</h1>
      <p className="text-sm text-gray-500 mb-6">
        API Key 加密保存在服务器，当前 Agent：<span className="text-gray-300">{activeAgent}</span>
      </p>

      <div className="space-y-4">
        {PROVIDERS.map(p => (
          <div key={p.id} className="bg-[#161b27] border border-[#2a2f3e] rounded-xl p-4">
            <label className="block text-sm font-medium text-white mb-3">{p.label} API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={keys[p.id] || ''}
                onChange={e => setKeys(k => ({ ...k, [p.id]: e.target.value }))}
                placeholder={p.placeholder}
                className="flex-1 px-3 py-2 bg-[#0f1117] border border-[#2a2f3e] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <button
                onClick={() => handleSave(p.id)}
                disabled={saving[p.id] || !keys[p.id]?.trim()}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors whitespace-nowrap"
              >
                {saved[p.id] ? '✓ 已保存' : saving[p.id] ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-[#161b27] border border-[#2a2f3e] rounded-xl">
        <p className="text-xs text-gray-500 leading-relaxed">
          🔒 你的 API Key 使用 AES-256-GCM 加密存储，服务器不会以明文形式记录或传输。
          每次执行 Agent 时，Key 在内存中临时解密使用，请求结束后立即销毁。
        </p>
      </div>
    </div>
  )
}
