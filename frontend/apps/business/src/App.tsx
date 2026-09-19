import React from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { PendingOrdersProvider } from './PendingOrdersContext'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import OrderDetails from './pages/OrderDetails'
import CreateBusiness from './pages/CreateBusiness'
import Riders from './pages/Riders'
import Settlements from './pages/Settlements'
import Profile from './pages/Profile'
import DashboardLayout from './components/DashboardLayout'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== 'owner') return <Navigate to="/login" />;
  return <>{children}</>;
};

const RequireBusiness: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { businessId, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!businessId) return <Navigate to="/onboarding" />;
  return <>{children}</>;
};

const App: React.FC = () => (
  <AuthProvider>
    <PendingOrdersProvider>
    <BrowserRouter basename="/business">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<ProtectedRoute><CreateBusiness /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><RequireBusiness><DashboardLayout /></RequireBusiness></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="riders" element={<Riders />} />
          <Route path="settlements" element={<Settlements />} />
          <Route path="profile" element={<Profile />} />
          <Route path="businesses" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </PendingOrdersProvider>
  </AuthProvider>
)

export default App