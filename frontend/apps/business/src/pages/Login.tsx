import React, { useState } from 'react';
import { useAuth } from '@hakika/auth';
import { Navigate } from 'react-router-dom';

const Login: React.FC = () => {
    const { login, isAuthenticated } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    if (isAuthenticated) return <Navigate to="/" />;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Login failed');
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
            <h1>Hakika Business Login</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                        style={{ width: '100%', padding: 8, margin: '8px 0' }} />
                </div>
                <div>
                    <label>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                        style={{ width: '100%', padding: 8, margin: '8px 0' }} />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit" style={{ padding: '10px 20px', width: '100%' }}>Login</button>
            </form>
        </div>
    );
};

export default Login;
