import React from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Businesses from './pages/Businesses'
import BusinessDetail from './pages/BusinessDetail'
import OrderInvestigation from './pages/OrderInvestigation'
import Commercial from './pages/Commercial'
import Disputes from './pages/Disputes'
import SettlementsPage from './pages/Settlements'
import Categories from './pages/Categories'
import AdminLayout from './components/AdminLayout'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="businesses" element={<Businesses />} />
          <Route path="businesses/:id" element={<BusinessDetail />} />
          <Route path="orders/:id" element={<OrderInvestigation />} />
          <Route path="commercial" element={<Commercial />} />
          <Route path="disputes" element={<Disputes />} />
          <Route path="settlements" element={<SettlementsPage />} />
          <Route path="categories" element={<Categories />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
)

export default App
