import React from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { BrowserRouter, Routes, Route, Navigate, Link, Outlet, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import CreateBusiness from './pages/CreateBusiness'
import Riders from './pages/Riders'
import Settlements from './pages/Settlements'
import BusinessProfilePage from './pages/BusinessesList'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};

const RequireBusiness: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { businessId, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!businessId) return <Navigate to="/onboarding" />;
  return <>{children}</>;
};

const DashboardLayout: React.FC = () => {
  const { user, logout, businessName } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240, background: '#f5f5f5', padding: 20 }}>
        <h2>Hakika</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 30 }}>
          <Link to="/products">Products</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/riders">Riders</Link>
          <Link to="/settlements">Settlements</Link>
          <Link to="/businesses">Profile</Link>
        </nav>
        <div style={{ position: 'absolute', bottom: 20, width: 200 }}>
          <p>{user?.email}</p>
          <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<ProtectedRoute><CreateBusiness /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><RequireBusiness><DashboardLayout /></RequireBusiness></ProtectedRoute>}>
          <Route index element={<Navigate to="/products" />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="riders" element={<Riders />} />
          <Route path="settlements" element={<Settlements />} />
          <Route path="businesses" element={<BusinessProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
)

export default App
