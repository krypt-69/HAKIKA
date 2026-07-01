import React from 'react'
import { AuthProvider } from '@hakika/auth'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Businesses from './pages/Businesses'
import Disputes from './pages/Disputes'
import Settlements from './pages/Settlements'
import Payments from './pages/Payments'
import Trust from './pages/Trust'
import Health from './pages/Health'
import AdminLayout from './components/AdminLayout'
import { ProtectedRoute } from '@hakika/auth'

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="businesses" element={<Businesses />} />
          <Route path="disputes" element={<Disputes />} />
          <Route path="settlements" element={<Settlements />} />
          <Route path="payments" element={<Payments />} />
          <Route path="trust" element={<Trust />} />
          <Route path="health" element={<Health />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
)

export default App
