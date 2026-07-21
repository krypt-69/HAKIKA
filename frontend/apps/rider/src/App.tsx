import React from 'react'
import { AuthProvider } from '@hakika/auth'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Activate from "./pages/Activate";
import Home from './pages/Home'
import { ProtectedRoute } from '@hakika/auth'

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter basename="/rider">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/activate" element={<Activate />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
)

export default App
