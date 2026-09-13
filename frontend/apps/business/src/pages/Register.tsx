import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { api } from '../api';
import { Mail, Lock, Eye, EyeOff, AlertCircle, UserPlus, Check } from 'lucide-react';

const BLACK = '#111111';
const GREEN = '#16a34a';
const RED = '#dc2626';
const RED_LIGHT = '#fee2e2';
const GREY = '#6b7280';
const GREY_LIGHT = '#e5e7eb';

const Register: React.FC = () => {
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
      await api.auth.register(email, password, 'owner');
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'][passwordStrength];
  const strengthColor = ['', RED, '#f59e0b', GREEN][passwordStrength];

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="brand-block">
          <img src="/business/logo.png" alt="Hakika" className="brand-mark" />
          <h1 className="brand-title">Create Business Account</h1>
          <p className="brand-sub">Start managing orders, riders, and payments</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
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
                placeholder="Create a password"
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

            {password.length > 0 && (
              <div className="strength-block">
                <div className="strength-bars">
                  {[1, 2, 3].map(i => (
                    <span
                      key={i}
                      className="strength-bar"
                      style={{ background: i <= passwordStrength ? strengthColor : GREY_LIGHT }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? (
              <span className="btn-inline">Creating account...</span>
            ) : (
              <span className="btn-inline"><UserPlus size={17} /> Register</span>
            )}
          </button>
        </form>

        <p className="login-line">
          Already have an account? <Link to="/login" className="login-link">Login</Link>
        </p>
      </div>

      <style>{`
        .register-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          padding: 20px;
        }

        .register-card {
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
          width: 156px;
          height: 156px;
          display: block;
          object-fit: contain;
          margin: 0 auto 14px auto;
        }
        .brand-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: ${BLACK};
          margin: 0;
        }
        .brand-sub {
          font-size: 0.83rem;
          color: ${GREY};
          margin-top: 4px;
        }

        .register-form {
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

        .strength-block {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
        .strength-bars {
          display: flex;
          gap: 4px;
          flex: 1;
        }
        .strength-bar {
          height: 4px;
          flex: 1;
          border-radius: 2px;
          transition: background 0.15s;
        }
        .strength-label {
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
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

        .login-line {
          text-align: center;
          margin-top: 22px;
          font-size: 0.85rem;
          color: ${GREY};
        }
        .login-link {
          color: ${GREEN};
          font-weight: 700;
          text-decoration: none;
        }
        .login-link:hover { text-decoration: underline; }

        @media (max-width: 420px) {
          .register-card {
            padding: 28px 22px;
            border-radius: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default Register;