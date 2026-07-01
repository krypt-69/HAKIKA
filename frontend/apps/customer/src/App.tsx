import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import BusinessProfile from './pages/BusinessProfile'
import OrderPage from './pages/OrderPage'
import OrderTracking from './pages/OrderTracking'

const App: React.FC = () => (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/b/:slug" element={<BusinessProfile />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/order/:id" element={<OrderTracking />} />
        </Routes>
    </BrowserRouter>
)

export default App
