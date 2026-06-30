import React from 'react'
import { AuthProvider } from '@hakika/auth'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import DashboardLayout from './components/DashboardLayout'
import { ProtectedRoute } from '@hakika/auth'
import BusinessesList from './pages/BusinessesList'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="businesses" element={<BusinessesList />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="riders" element={<div>Riders coming soon</div>} />
          <Route path="settlements" element={<div>Settlements coming soon</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
)

export default App
