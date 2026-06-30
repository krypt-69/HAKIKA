import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CustomerAuthProvider, useCustomerAuth } from './auth/CustomerAuthContext'
import PhoneLogin from './pages/PhoneLogin'
import Home from './pages/Home'
import BusinessProfile from './pages/BusinessProfile'
import OrderPage from './pages/OrderPage'

const ProtectedCustomerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useCustomerAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};

const App: React.FC = () => (
  <CustomerAuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PhoneLogin />} />
        <Route path="/" element={<ProtectedCustomerRoute><Home /></ProtectedCustomerRoute>} />
        <Route path="/business/:id" element={<ProtectedCustomerRoute><BusinessProfile /></ProtectedCustomerRoute>} />
        <Route path="/order" element={<ProtectedCustomerRoute><OrderPage /></ProtectedCustomerRoute>} />
      </Routes>
    </BrowserRouter>
  </CustomerAuthProvider>
)

export default App
