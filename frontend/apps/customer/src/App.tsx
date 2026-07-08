import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import BusinessProfile from './pages/BusinessProfile'
import OrderPage from './pages/OrderPage'
import OrderTracking from './pages/OrderTracking'
import MyOrders from './pages/MyOrders'
import Notifications from './pages/Notifications'
import Receipt from './pages/Receipt'

const App: React.FC = () => (
    <BrowserRouter>
        <div>
            <nav style={{ 
                padding: '10px 20px', 
                borderBottom: '1px solid #ddd', 
                display: 'flex', 
                gap: 20,
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <Link to="/" style={{ fontWeight: 'bold', fontSize: '1.2em' }}>Hakika</Link>
                <Link to="/my-orders">My Orders</Link>
                <Link to="/notifications">Notifications</Link>
                <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                    🏢 Business Dashboard
                </a>
                <a href="http://localhost:3003" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                    📱 Rider App
                </a>
            </nav>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/b/:slug" element={<BusinessProfile />} />
                <Route path="/order" element={<OrderPage />} />
                <Route path="/order/:id" element={<OrderTracking />} />
                <Route path="/my-orders" element={<MyOrders />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/receipt/:id" element={<Receipt />} />
            </Routes>
        </div>
    </BrowserRouter>
)

export default App
