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

// 健康检查（用于验证 Token）
export const checkHealth = () =>
  getClient().get('/health')

// 获取所有 Agent
export const getAgents = () =>
  getClient().get('/v1/agents')

// 发送消息
export const sendChat = (agentName, message, conversationId = null) =>
  getClient().post(`/v1/agents/${agentName}/chat`, { message, conversationId })

// 获取会话列表
export const getConversations = (agentName) =>
  getClient().get(`/v1/agents/${agentName}/conversations`)

// 执行工作流
export const runWorkflow = (agentName, workflowGraph, inputVariables = {}) =>
  getClient().post(`/v1/agents/${agentName}/run`, { workflowGraph, inputVariables })

// 保存 API Key
export const saveApiKey = (agentName, provider, apiKey) =>
  getClient().post(`/v1/agents/${agentName}/keys`, { provider, apiKey })

// 获取记忆
export const getMemory = (agentName) =>
  getClient().get(`/v1/agents/${agentName}/memory`)

// 写入记忆
export const setMemory = (agentName, key, value) =>
  getClient().post(`/v1/agents/${agentName}/memory`, { key, value })
