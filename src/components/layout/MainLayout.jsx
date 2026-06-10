import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/auth'

const AGENTS = [
  { id: 'openclaw', label: 'OpenClaw', emoji: '🦾' },
  { id: 'aimas',    label: '爱马仕',   emoji: '👜' },
]

export default function MainLayout() {
  const { activeAgent, setActiveAgent, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/activate')
  }

  return (
    <div className="flex h-screen bg-[#0f1117]">
      {/* 左侧边栏 */}
      <aside className="w-56 flex flex-col bg-[#161b27] border-r border-[#2a2f3e]">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-[#2a2f3e]">
          <span className="text-lg font-bold text-white">OpenClaw</span>
        </div>

        {/* Agent 切换 */}
        <div className="px-3 py-3 border-b border-[#2a2f3e]">
          <p className="text-xs text-gray-500 mb-2 px-2">切换 Agent</p>
          {AGENTS.map(a => (
            <button
              key={a.id}
              onClick={() => setActiveAgent(a.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-1
                ${activeAgent === a.id
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:bg-[#1e2535] hover:text-white'}`}
            >
              <span>{a.emoji}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-3 py-3 space-y-1">
          {[
            { to: '/chat',     label: '对话',     icon: '💬' },
            { to: '/canvas',   label: '工作流画布', icon: '🔧' },
            { to: '/settings', label: '设置',     icon: '⚙️' },
          ].map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                ${isActive
                  ? 'bg-[#1e2535] text-white'
                  : 'text-gray-400 hover:bg-[#1e2535] hover:text-white'}`
              }
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 底部退出 */}
        <div className="px-3 py-3 border-t border-[#2a2f3e]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-[#1e2535] transition-colors"
          >
            <span>🚪</span>
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部 Agent 标识 */}
        <div className="h-12 flex items-center px-6 border-b border-[#2a2f3e] bg-[#161b27]">
          <span className="text-sm text-gray-400">
            当前 Agent：
            <span className="text-white ml-1">
              {AGENTS.find(a => a.id === activeAgent)?.emoji} {AGENTS.find(a => a.id === activeAgent)?.label}
            </span>
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
