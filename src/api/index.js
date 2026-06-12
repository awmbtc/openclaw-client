const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const PROVIDER_LABELS = { openai: 'OpenAI', anthropic: 'Anthropic' }
const DB_NAME = 'openclaw_local_v1'
const DB_VERSION = 1
const STORES = {
  conversations: 'conversations',
  agentConfigs: 'agentConfigs',
  memories: 'memories',
}

const providerCache = {}

// ── 本地 API Key 管理 ──
// Key 仅保存在浏览器 localStorage，随每次请求携带，服务端透传不存储
export const getLocalKey = (provider) =>
  localStorage.getItem(`oc_key_${provider}`) || ''

export const setLocalKey = (provider, key) =>
  localStorage.setItem(`oc_key_${provider}`, key)

export const removeLocalKey = (provider) =>
  localStorage.removeItem(`oc_key_${provider}`)

function getToken() {
  return sessionStorage.getItem('oc_token') || ''
}

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-OpenClaw-Token': getToken(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const payload = await readJson(res)
  if (!res.ok) {
    const err = new Error(payload?.error || `请求失败：${res.status}`)
    err.response = { data: { error: payload?.error || `请求失败：${res.status}` } }
    throw err
  }

  return payload
}

async function readJson(res) {
  const text = await res.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function axiosLike(data) {
  return { data }
}

async function legacyCall(fn) {
  try {
    return await fn()
  } catch (err) {
    if (err?.response?.data?.error) throw err
    const legacyError = new Error(err?.message || '请求失败')
    legacyError.response = { data: { error: err?.message || '请求失败，请检查网络或 Token' } }
    throw legacyError
  }
}

async function getAgentProvider(agentName) {
  if (!providerCache[agentName]) {
    const res = await getAgentConfig(agentName)
    providerCache[agentName] = res.data.llm_provider || 'openai'
  }
  return providerCache[agentName]
}

async function requireApiKey(agentName) {
  const provider = await getAgentProvider(agentName)
  const apiKey = getLocalKey(provider)
  if (!apiKey) {
    const label = PROVIDER_LABELS[provider] || provider
    const err = new Error('NO_LOCAL_KEY')
    err.response = {
      data: { error: `尚未配置 ${label} API Key，请到设置页填写（仅保存在本机）` },
    }
    throw err
  }
  return apiKey
}

// 获取所有 Agent
export const getAgents = () =>
  legacyCall(async () => axiosLike(await request('GET', '/v1/agents')))

// 发送消息（自动携带本地 Key）
export const sendChat = (agentName, message, conversationId = null) =>
  legacyCall(async () => {
    const apiKey = await requireApiKey(agentName)
    return axiosLike(await request('POST', `/v1/agents/${agentName}/chat`, {
      message,
      conversationId,
      apiKey,
    }))
  })

// 获取该用户对此 Agent 的 LLM 配置
export const getAgentConfig = (agentName) =>
  legacyCall(async () => axiosLike(await request('GET', `/v1/agents/${agentName}/config`)))

// 保存该用户对此 Agent 的 LLM 配置
export const setAgentConfig = (agentName, llm_provider, llm_model) =>
  legacyCall(async () => {
    providerCache[agentName] = llm_provider
    await request('PUT', `/v1/agents/${agentName}/config`, { llm_provider, llm_model })
    await saveLocalAgentConfig({
      agentName,
      llmProvider: llm_provider,
      llmModel: llm_model,
    })
    return axiosLike({})
  })

// 获取会话列表
export const getConversations = (agentName) =>
  legacyCall(async () => axiosLike(await request('GET', `/v1/agents/${agentName}/conversations`)))

// 执行工作流（自动携带本地 Key）
export const runWorkflow = (agentName, workflowGraph, inputVariables = {}) =>
  legacyCall(async () => {
    const apiKey = await requireApiKey(agentName)
    return axiosLike(await request('POST', `/v1/agents/${agentName}/run`, {
      workflowGraph,
      inputVariables,
      apiKey,
    }))
  })

// 获取记忆
export const getMemory = (agentName) =>
  legacyCall(async () => axiosLike(await request('GET', `/v1/agents/${agentName}/memory`)))

// 写入记忆
export const setMemory = (agentName, key, value) =>
  legacyCall(async () => axiosLike(await request('POST', `/v1/agents/${agentName}/memory`, { key, value })))

// ── 本地优先数据层（IndexedDB，不存 API Key） ──
export async function listLocalConversations(agentName) {
  const conversations = await readAll(STORES.conversations)
  return conversations
    .filter(conversation => !agentName || conversation.agentName === agentName)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

export async function saveLocalConversation(conversation) {
  await putValue(STORES.conversations, conversation)
}

export function listLocalAgentConfigs() {
  return readAll(STORES.agentConfigs)
}

export function saveLocalAgentConfig(config) {
  return putValue(STORES.agentConfigs, config)
}

export async function listLocalMemories(agentName) {
  const memories = await readAll(STORES.memories)
  return memories
    .filter(memory => !agentName || memory.agentName === agentName)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

export function saveLocalMemory(memory) {
  return putValue(STORES.memories, memory)
}

export async function createLocalBackupSnapshot() {
  return {
    schemaVersion: 1,
    snapshotId: `snap_${Date.now()}`,
    createdAt: new Date().toISOString(),
    sourcePlatform: 'web',
    userId: 'local-user',
    payload: {
      conversations: await listLocalConversations(),
      memories: await listLocalMemories(),
      agentConfigs: await listLocalAgentConfigs(),
    },
  }
}

export async function importLocalBackupSnapshot(snapshot) {
  assertSnapshot(snapshot)

  const now = new Date().toISOString()
  const importedConversationIds = []

  for (const conversation of snapshot.payload.conversations) {
    const importedId = `imported_${snapshot.snapshotId}_${conversation.id}_${Date.now()}`
    importedConversationIds.push(importedId)
    await saveLocalConversation({
      ...conversation,
      id: importedId,
      title: conversation.title ? `导入 - ${conversation.title}` : '导入会话',
      createdAt: now,
      updatedAt: now,
    })
  }

  return { importedConversationIds }
}

export const downloadLocalBackupSnapshot = async () => {
  const snapshot = await createLocalBackupSnapshot()
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `openclaw-snapshot-${snapshot.createdAt.slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return snapshot
}

function assertSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Invalid snapshot')
  }
  if (snapshot.schemaVersion !== 1) {
    throw new Error('Unsupported snapshot schema')
  }
  if (!snapshot.snapshotId || !Array.isArray(snapshot.payload?.conversations)) {
    throw new Error('Invalid OpenClaw snapshot')
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORES.conversations)) {
        const store = db.createObjectStore(STORES.conversations, { keyPath: 'id' })
        store.createIndex('agentName', 'agentName', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.agentConfigs)) {
        db.createObjectStore(STORES.agentConfigs, { keyPath: 'agentName' })
      }
      if (!db.objectStoreNames.contains(STORES.memories)) {
        const store = db.createObjectStore(STORES.memories, { keyPath: ['agentName', 'key'] })
        store.createIndex('agentName', 'agentName', { unique: false })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function readAll(storeName) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

async function putValue(storeName, value) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
