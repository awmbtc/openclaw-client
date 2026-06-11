// 统一 API 请求层
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

function getClient() {
  const token = sessionStorage.getItem('oc_token') || ''
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'X-OpenClaw-Token': token,
    },
  })
}

// ── 本地 API Key 管理 ──
// Key 仅保存在浏览器 localStorage，随每次请求携带，服务端透传不存储
export const getLocalKey = (provider) =>
  localStorage.getItem(`oc_key_${provider}`) || ''

export const setLocalKey = (provider, key) =>
  localStorage.setItem(`oc_key_${provider}`, key)

export const removeLocalKey = (provider) =>
  localStorage.removeItem(`oc_key_${provider}`)

// Agent → provider 缓存，避免每条消息都请求一次配置
const providerCache = {}

async function getAgentProvider(agentName) {
  if (!providerCache[agentName]) {
    const res = await getClient().get(`/v1/agents/${agentName}/config`)
    providerCache[agentName] = res.data.llm_provider || 'openai'
  }
  return providerCache[agentName]
}

const PROVIDER_LABELS = { openai: 'OpenAI', anthropic: 'Anthropic' }

// 取该 Agent 当前 provider 对应的本地 Key；未配置则抛出友好错误（模拟 axios 错误结构）
async function requireApiKey(agentName) {
  const provider = await getAgentProvider(agentName)
  const apiKey = getLocalKey(provider)
  if (!apiKey) {
    const err = new Error('NO_LOCAL_KEY')
    err.response = { data: { error: `尚未配置 ${PROVIDER_LABELS[provider] || provider} API Key，请到设置页填写（仅保存在本机）` } }
    throw err
  }
  return apiKey
}

// 获取所有 Agent
export const getAgents = () =>
  getClient().get('/v1/agents')

// 发送消息（自动携带本地 Key）
export const sendChat = async (agentName, message, conversationId = null) => {
  const apiKey = await requireApiKey(agentName)
  return getClient().post(`/v1/agents/${agentName}/chat`, { message, conversationId, apiKey })
}

// 获取该用户对此 Agent 的 LLM 配置
export const getAgentConfig = (agentName) =>
  getClient().get(`/v1/agents/${agentName}/config`)

// 保存该用户对此 Agent 的 LLM 配置
export const setAgentConfig = (agentName, llm_provider, llm_model) => {
  providerCache[agentName] = llm_provider
  return getClient().put(`/v1/agents/${agentName}/config`, { llm_provider, llm_model })
}

// 获取会话列表
export const getConversations = (agentName) =>
  getClient().get(`/v1/agents/${agentName}/conversations`)

// 执行工作流（自动携带本地 Key）
export const runWorkflow = async (agentName, workflowGraph, inputVariables = {}) => {
  const apiKey = await requireApiKey(agentName)
  return getClient().post(`/v1/agents/${agentName}/run`, { workflowGraph, inputVariables, apiKey })
}

// 获取记忆
export const getMemory = (agentName) =>
  getClient().get(`/v1/agents/${agentName}/memory`)

// 写入记忆
export const setMemory = (agentName, key, value) =>
  getClient().post(`/v1/agents/${agentName}/memory`, { key, value })
