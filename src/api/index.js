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

// 获取所有 Agent
export const getAgents = () =>
  getClient().get('/v1/agents')

// 发送消息
export const sendChat = (agentName, message, conversationId = null) =>
  getClient().post(`/v1/agents/${agentName}/chat`, { message, conversationId })

// 获取该用户对此 Agent 的 LLM 配置
export const getAgentConfig = (agentName) =>
  getClient().get(`/v1/agents/${agentName}/config`)

// 保存该用户对此 Agent 的 LLM 配置
export const setAgentConfig = (agentName, llm_provider, llm_model) =>
  getClient().put(`/v1/agents/${agentName}/config`, { llm_provider, llm_model })

// 保存 API Key（provider 级别）
export const saveApiKey = (agentName, provider, apiKey) =>
  getClient().post(`/v1/agents/${agentName}/keys`, { provider, apiKey })

// 获取会话列表
export const getConversations = (agentName) =>
  getClient().get(`/v1/agents/${agentName}/conversations`)

// 执行工作流
export const runWorkflow = (agentName, workflowGraph, inputVariables = {}) =>
  getClient().post(`/v1/agents/${agentName}/run`, { workflowGraph, inputVariables })

// 获取记忆
export const getMemory = (agentName) =>
  getClient().get(`/v1/agents/${agentName}/memory`)

// 写入记忆
export const setMemory = (agentName, key, value) =>
  getClient().post(`/v1/agents/${agentName}/memory`, { key, value })
