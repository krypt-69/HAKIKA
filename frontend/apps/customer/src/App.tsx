import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import BusinessProfile from './pages/BusinessProfile'
import OrderPage from './pages/OrderPage'
import OrderTracking from './pages/OrderTracking'
import MyOrders from './pages/MyOrders'

const App: React.FC = () => (
    <BrowserRouter>
        <div style={{ padding: '0 20px' }}>
            <nav style={{ display: 'flex', gap: 20, padding: '10px 0', borderBottom: '1px solid #ddd', marginBottom: 20 }}>
                <Link to="/" style={{ fontWeight: 'bold', textDecoration: 'none', color: '#2563eb' }}>Hakika</Link>
                <Link to="/my-orders" style={{ textDecoration: 'none', color: '#333' }}>My Orders</Link>
            </nav>
        </div>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/b/:slug" element={<BusinessProfile />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/order/:id" element={<OrderTracking />} />
            <Route path="/my-orders" element={<MyOrders />} />
        </Routes>
    </BrowserRouter>
)

export default App
