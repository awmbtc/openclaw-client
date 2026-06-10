import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/auth'
import ActivatePage from './pages/ActivatePage'
import MainLayout from './components/layout/MainLayout'
import ChatPage from './pages/ChatPage'
import CanvasPage from './pages/CanvasPage'
import SettingsPage from './pages/SettingsPage'

function RequireAuth({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/activate" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/activate" element={<ActivatePage />} />
      <Route path="/" element={
        <RequireAuth>
          <MainLayout />
        </RequireAuth>
      }>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="canvas" element={<CanvasPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
