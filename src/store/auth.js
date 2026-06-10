// 全局状态：Token 与 Agent 切换
import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token: sessionStorage.getItem('oc_token') || '',
  activeAgent: sessionStorage.getItem('oc_agent') || 'openclaw',

  setToken: (token) => {
    sessionStorage.setItem('oc_token', token)
    set({ token })
  },

  setActiveAgent: (agent) => {
    sessionStorage.setItem('oc_agent', agent)
    set({ activeAgent: agent })
  },

  logout: () => {
    sessionStorage.clear()
    set({ token: '', activeAgent: 'openclaw' })
  },
}))

export default useAuthStore
