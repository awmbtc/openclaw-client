import React, { useState, useEffect } from 'react'
import { getAgents, getAgentConfig, setAgentConfig, getLocalKey, setLocalKey } from '../api'

const PROVIDERS = [
  { id: 'openai',    label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
]

const MODEL_OPTIONS = {
  openai:    ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
}

const KEY_PLACEHOLDERS = {
  openai:    'sk-...',
  anthropic: 'sk-ant-...',
}

export default function SettingsPage() {
  const [agents, setAgents] = useState([])
  const [agentConfigs, setAgentConfigs] = useState({}) // { agentName: { llm_provider, llm_model } }
  const [savingConfig, setSavingConfig] = useState({})
  const [savedConfig, setSavedConfig]   = useState({})
  const [apiKeys, setApiKeys] = useState({})
  const [savedKey, setSavedKey]   = useState({})

  useEffect(() => {
    loadAgents()
  }, [])

  async function loadAgents() {
    try {
      const res = await getAgents()
      const list = res.data.agents
      setAgents(list)
      // 并行加载每个 Agent 的 LLM 配置
      const configs = await Promise.all(list.map(a => getAgentConfig(a.name)))
      const configMap = {}
      list.forEach((a, i) => { configMap[a.name] = configs[i].data })
      setAgentConfigs(configMap)
    } catch {
      // 静默失败，保持空状态
    }
  }

  function updateConfig(agentName, field, value) {
    setAgentConfigs(prev => {
      const cur = prev[agentName] || {}
      const next = { ...cur, [field]: value }
      // 切换 provider 时重置 model 为该 provider 的第一个选项
      if (field === 'llm_provider') {
        next.llm_model = MODEL_OPTIONS[value]?.[0] || ''
      }
      return { ...prev, [agentName]: next }
    })
  }

  async function handleSaveConfig(agentName) {
    const cfg = agentConfigs[agentName]
    if (!cfg?.llm_provider || !cfg?.llm_model) return
    setSavingConfig(s => ({ ...s, [agentName]: true }))
    try {
      await setAgentConfig(agentName, cfg.llm_provider, cfg.llm_model)
      setSavedConfig(s => ({ ...s, [agentName]: true }))
      setTimeout(() => setSavedConfig(s => ({ ...s, [agentName]: false })), 2000)
    } catch (err) {
      alert(`保存失败：${err.response?.data?.error || '未知错误'}`)
    } finally {
      setSavingConfig(s => ({ ...s, [agentName]: false }))
    }
  }

  // Key 仅写入浏览器 localStorage，不经过服务器
  function handleSaveKey(provider) {
    const key = apiKeys[provider]?.trim()
    if (!key) return
    setLocalKey(provider, key)
    setSavedKey(s => ({ ...s, [provider]: true }))
    setApiKeys(k => ({ ...k, [provider]: '' }))
    setTimeout(() => setSavedKey(s => ({ ...s, [provider]: false })), 2000)
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8 space-y-8">

      {/* ── Agent LLM 配置 ── */}
      <section>
        <h2 className="text-base font-semibold text-white mb-1">Agent 配置</h2>
        <p className="text-xs text-gray-500 mb-4">为每个 Agent 选择调用哪个大模型</p>

        <div className="space-y-4">
          {agents.map(agent => {
            const cfg = agentConfigs[agent.name] || {}
            const models = MODEL_OPTIONS[cfg.llm_provider] || []
            return (
              <div key={agent.name} className="bg-[#161b27] border border-[#2a2f3e] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-white">{agent.display_name}</span>
                  <span className="text-xs text-gray-500 bg-[#0f1117] px-2 py-0.5 rounded">
                    {agent.runtime_type}
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {/* Provider 选择 */}
                  <select
                    value={cfg.llm_provider || 'openai'}
                    onChange={e => updateConfig(agent.name, 'llm_provider', e.target.value)}
                    className="px-3 py-2 bg-[#0f1117] border border-[#2a2f3e] rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    {PROVIDERS.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>

                  {/* Model 选择 */}
                  <select
                    value={cfg.llm_model || ''}
                    onChange={e => updateConfig(agent.name, 'llm_model', e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 bg-[#0f1117] border border-[#2a2f3e] rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    {models.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleSaveConfig(agent.name)}
                    disabled={savingConfig[agent.name]}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors whitespace-nowrap"
                  >
                    {savedConfig[agent.name] ? '✓ 已保存' : savingConfig[agent.name] ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── API Keys ── */}
      <section>
        <h2 className="text-base font-semibold text-white mb-1">API Keys</h2>
        <p className="text-xs text-gray-500 mb-4">Key 仅保存在你的浏览器本地，随请求携带、服务端透传，不会上传存储</p>

        <div className="space-y-3">
          {PROVIDERS.map(p => (
            <div key={p.id} className="bg-[#161b27] border border-[#2a2f3e] rounded-xl p-4">
              <label className="block text-sm font-medium text-white mb-2">
                {p.label} API Key
                {getLocalKey(p.id) && (
                  <span className="ml-2 text-xs text-green-400 font-normal">本机已保存 ✓</span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeys[p.id] || ''}
                  onChange={e => setApiKeys(k => ({ ...k, [p.id]: e.target.value }))}
                  placeholder={KEY_PLACEHOLDERS[p.id] || 'API Key...'}
                  className="flex-1 px-3 py-2 bg-[#0f1117] border border-[#2a2f3e] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
                />
                <button
                  onClick={() => handleSaveKey(p.id)}
                  disabled={!apiKeys[p.id]?.trim()}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors whitespace-nowrap"
                >
                  {savedKey[p.id] ? '✓ 已保存' : '保存'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
