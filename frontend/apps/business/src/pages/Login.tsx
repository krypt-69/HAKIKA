import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';

const BLACK = '#111111';
const GREEN = '#16a34a';
const RED = '#dc2626';
const RED_LIGHT = '#fee2e2';
const GREY = '#6b7280';

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-block">
          <div className="brand-mark">H</div>
          <h1 className="brand-title">Hakika Business</h1>
          <p className="brand-sub">Sign in to manage your store</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label className="field-label">Email</label>
            <div className="input-wrap">
              <Mail size={17} color={GREY} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@business.com"
                required
                className="field-input"
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <div className="input-wrap">
              <Lock size={17} color={GREY} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="field-input"
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowPassword(s => !s)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? (
              <span className="btn-inline">Logging in...</span>
            ) : (
              <span className="btn-inline"><LogIn size={17} /> Login</span>
            )}
          </button>
        </form>

        <p className="register-line">
          Don't have an account? <Link to="/register" className="register-link">Register</Link>
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          padding: 20px;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 36px 32px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.04);
        }

        .brand-block {
          text-align: center;
          margin-bottom: 28px;
        }
        .brand-mark {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: ${BLACK};
          color: ${GREEN};
          font-weight: 800;
          font-size: 1.4rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px auto;
        }
        .brand-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: ${BLACK};
          margin: 0;
        }
        .brand-sub {
          font-size: 0.85rem;
          color: ${GREY};
          margin-top: 4px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .field-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          color: ${BLACK};
          margin-bottom: 6px;
        }

        .input-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 11px 14px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-wrap:focus-within {
          border-color: ${GREEN};
          box-shadow: 0 0 0 3px ${GREEN}1a;
        }

        .field-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.9rem;
          color: ${BLACK};
          background: transparent;
        }
        .field-input::placeholder { color: #9ca3af; }

        .toggle-visibility {
          background: transparent;
          border: none;
          color: ${GREY};
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: ${RED_LIGHT};
          color: ${RED};
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.83rem;
          font-weight: 500;
        }

        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 13px;
          background: ${GREEN};
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          margin-top: 4px;
          transition: background 0.15s, transform 0.1s;
        }
        .submit-btn:hover:not(:disabled) { background: #15803d; }
        .submit-btn:active:not(:disabled) { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-inline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .register-line {
          text-align: center;
          margin-top: 22px;
          font-size: 0.85rem;
          color: ${GREY};
        }
        .register-link {
          color: ${GREEN};
          font-weight: 700;
          text-decoration: none;
        }
        .register-link:hover { text-decoration: underline; }

        @media (max-width: 420px) {
          .login-card {
            padding: 28px 22px;
            border-radius: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;