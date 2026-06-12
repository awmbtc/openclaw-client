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
  const currentAgent = AGENTS.find(a => a.id === activeAgent) || AGENTS[0]

  function handleLogout() {
    logout()
    navigate('/activate')
  }

  return (
    <div className="flex h-[100dvh] min-h-[100svh] flex-col overflow-hidden bg-[#0f1117] md:flex-row">
      {/* 左侧边栏 */}
      <aside className="hidden w-56 flex-col bg-[#161b27] border-r border-[#2a2f3e] md:flex">
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
              onClick={() => { setActiveAgent(a.id); navigate('/chat') }}
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
      <main className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* 移动端顶部 */}
        <div className="border-b border-[#2a2f3e] bg-[#161b27] px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] md:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="text-lg font-bold text-white">OpenClaw</span>
            <button
              onClick={handleLogout}
              className="rounded-lg px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-[#1e2535] hover:text-red-400"
            >
              退出
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {AGENTS.map(a => (
              <button
                key={a.id}
                onClick={() => { setActiveAgent(a.id); navigate('/chat') }}
                className={`min-w-0 rounded-lg px-3 py-2 text-sm transition-colors
                  ${activeAgent === a.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-[#0f1117] text-gray-400 hover:bg-[#1e2535] hover:text-white'}`}
              >
                <span className="mr-1">{a.emoji}</span>
                <span className="align-middle">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 顶部 Agent 标识 */}
        <div className="hidden h-12 items-center px-6 border-b border-[#2a2f3e] bg-[#161b27] md:flex">
          <span className="text-sm text-gray-400">
            当前 Agent：
            <span className="text-white ml-1">
              {currentAgent.emoji} {currentAgent.label}
            </span>
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>

      {/* 移动端底部导航 */}
      <nav className="grid grid-cols-3 gap-1 border-t border-[#2a2f3e] bg-[#161b27] px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 md:hidden">
        {[
          { to: '/chat',     label: '对话', icon: '💬' },
          { to: '/canvas',   label: '画布', icon: '🔧' },
          { to: '/settings', label: '设置', icon: '⚙️' },
        ].map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs transition-colors
              ${isActive
                ? 'bg-[#1e2535] text-white'
                : 'text-gray-500 hover:bg-[#1e2535] hover:text-white'}`
            }
          >
            <span className="text-base leading-none">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
