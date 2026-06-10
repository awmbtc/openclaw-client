import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/auth'
import { getAgents } from '../api'

export default function ActivatePage() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setToken: saveToken } = useAuthStore()
  const navigate = useNavigate()

  async function handleActivate(e) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')
    try {
      // 用 Token 请求健康检查，验证是否有效
      sessionStorage.setItem('oc_token', token.trim())
      await getAgents()
      saveToken(token.trim())
      navigate('/chat')
    } catch {
      sessionStorage.removeItem('oc_token')
      setError('Token 无效或已过期，请检查后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
      <div className="w-full max-w-md px-8 py-10 bg-[#161b27] rounded-2xl border border-[#2a2f3e]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🦾 OpenClaw</h1>
          <p className="text-gray-400 text-sm">输入你的访问令牌以继续</p>
        </div>

        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">访问令牌</label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="粘贴你的 Token..."
              className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2f3e] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
          >
            {loading ? '验证中...' : '激活'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          还没有 Token？购买订阅后将自动发送到你的邮箱
        </p>
      </div>
    </div>
  )
}
