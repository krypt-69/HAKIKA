import React from 'react'
import { AuthProvider } from '@hakika/auth'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import DashboardLayout from './components/DashboardLayout'
import { ProtectedRoute } from '@hakika/auth'
import BusinessesList from './pages/BusinessesList'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import CreateBusiness from './pages/CreateBusiness'

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/products" />} />
          <Route path="onboarding" element={<CreateBusiness />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="businesses" element={<BusinessesList />} />
          <Route path="riders" element={<div>Riders coming soon</div>} />
          <Route path="settlements" element={<div>Settlements coming soon</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
)

export default App
