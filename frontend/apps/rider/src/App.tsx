import React from 'react'
import { AuthProvider } from '@hakika/auth'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Activate from "./pages/Activate";
import Register from "./pages/Register";
import Home from './pages/Home'
import NavigationScreen from './pages/NavigationScreen'
import TripPreview from './pages/TripPreview'
import Profile from './pages/Profile'
import { ProtectedRoute } from '@hakika/auth'
import { QueryProvider } from './providers/QueryProvider'
import { useRegisterSW } from 'virtual:pwa-register/react'
import UpdatePrompt from './components/UpdatePrompt'

const App: React.FC = () => {
  const { needRefresh, updateServiceWorker } = useRegisterSW();

  return (
    <QueryProvider>
      <AuthProvider namespace="hakika_rider">
        <BrowserRouter basename="/rider">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/activate" element={<Activate />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/navigate/:orderId" element={<ProtectedRoute><NavigationScreen /></ProtectedRoute>} />
            <Route path="/navigate-trip" element={<ProtectedRoute><NavigationScreen /></ProtectedRoute>} />
            <Route path="/trip-preview" element={<ProtectedRoute><TripPreview /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Routes>
          <UpdatePrompt needRefresh={needRefresh[0]} updateServiceWorker={updateServiceWorker} />
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  );
};

export default App;
