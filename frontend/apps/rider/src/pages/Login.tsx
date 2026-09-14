import React, { useState } from 'react';
import { useAuth } from '@hakika/auth';
import { Navigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hk-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

        .hk-page {
          --ink: #10142a;
          --ink-soft: #1a2044;
          --amber: #f4a536;
          --amber-deep: #d98c1f;
          --panel: #ffffff;
          --text-dark: #171b2e;
          --text-muted: #767c96;
          --line: #e6e7f0;
          --error: #d94b4b;
          --success: #2fa876;

          min-height: 100vh;
          display: flex;
          font-family: 'Inter', sans-serif;
          background: var(--panel);
        }

        /* ---------- Brand panel ---------- */
        .hk-brand {
          position: relative;
          flex: 0 0 44%;
          background: var(--ink);
          color: #eef0fb;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 44px;
          overflow: hidden;
        }

        .hk-wordmark {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.01em;
          position: relative;
          z-index: 2;
        }

        .hk-brand-copy {
          position: relative;
          z-index: 2;
          max-width: 360px;
        }

        .hk-brand-copy h1 {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: clamp(28px, 3vw, 38px);
          line-height: 1.15;
          letter-spacing: -0.015em;
          margin: 0 0 14px;
        }

        .hk-brand-copy p {
          font-size: 15px;
          line-height: 1.6;
          color: #a9afd1;
          margin: 0;
        }

        .hk-route-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0.9;
        }

        .hk-route-path {
          fill: none;
          stroke: #2a3060;
          stroke-width: 2;
          stroke-dasharray: 6 8;
        }

        .hk-route-dot {
          fill: var(--amber);
          filter: drop-shadow(0 0 6px rgba(244, 165, 54, 0.7));
          offset-path: path('M -20 420 C 120 380, 160 220, 300 200 S 460 60, 620 40');
          animation: hk-travel 8s ease-in-out infinite;
        }

        @keyframes hk-travel {
          0% { offset-distance: 0%; opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }

        .hk-pin {
          position: absolute;
          z-index: 2;
        }

        /* ---------- Form panel ---------- */
        .hk-form-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
        }

        .hk-form-card {
          width: 100%;
          max-width: 380px;
        }

        .hk-form-card h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24px;
          font-weight: 600;
          color: var(--text-dark);
          margin: 0 0 6px;
        }

        .hk-form-sub {
          font-size: 14px;
          color: var(--text-muted);
          margin: 0 0 32px;
        }

        .hk-field {
          margin-bottom: 18px;
        }

        .hk-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-dark);
          margin-bottom: 7px;
        }

        .hk-field input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          font-size: 16px;
          font-family: inherit;
          color: var(--text-dark);
          background: #fbfbfd;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .hk-field input::placeholder {
          color: #b3b7cc;
        }

        .hk-field input:hover {
          border-color: #c9cce0;
        }

        .hk-field input:focus {
          outline: none;
          border-color: var(--amber);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(244, 165, 54, 0.18);
        }

        .hk-error {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: var(--error);
          background: #fdecec;
          border: 1px solid #f6cfcf;
          border-radius: 8px;
          padding: 10px 12px;
          margin: 0 0 18px;
        }

        .hk-submit {
          width: 100%;
          padding: 13px;
          font-family: 'Inter', sans-serif;
          font-size: 15.5px;
          font-weight: 600;
          color: #201203;
          background: var(--amber);
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.05s ease;
        }

        .hk-submit:hover:not(:disabled) {
          background: var(--amber-deep);
        }

        .hk-submit:active:not(:disabled) {
          transform: translateY(1px);
        }

        .hk-submit:focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
        }

        .hk-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .hk-links {
          margin-top: 22px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
        }

        .hk-links a {
          color: var(--text-dark);
          font-weight: 500;
          text-decoration: none;
          border-bottom: 1.5px solid var(--amber);
        }

        .hk-links a:hover {
          color: var(--amber-deep);
        }

        .hk-links .hk-secondary a {
          color: var(--text-muted);
          border-bottom-color: var(--line);
        }

        .hk-links .hk-secondary a:hover {
          color: var(--text-dark);
        }

        .hk-divider {
          color: var(--line);
        }

        /* ---------- Responsive ---------- */
        @media (max-width: 900px) {
          .hk-page {
            flex-direction: column;
          }

          .hk-brand {
            flex: 0 0 auto;
            padding: 26px 24px 30px;
            min-height: 180px;
          }

          .hk-brand-copy h1 {
            font-size: 22px;
          }

          .hk-brand-copy p {
            display: none;
          }

          .hk-route-svg {
            opacity: 0.6;
          }

          .hk-form-panel {
            padding: 28px 20px 40px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hk-route-dot {
            animation: none;
            offset-distance: 40%;
            opacity: 1;
          }
        }
      `}</style>

      <div className="hk-brand">
        <svg className="hk-route-svg" viewBox="0 0 640 460" preserveAspectRatio="xMidYMid slice">
          <path className="hk-route-path" d="M -20 420 C 120 380, 160 220, 300 200 S 460 60, 620 40" />
          <path className="hk-route-dot" d="M-10 0 L0 -8 L10 0 L-10 0 Z" fill="none" stroke="#f4a536" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="hk-wordmark">Hakika Rider</div>

        <div className="hk-brand-copy">
          <h1>Know where to take the order for your business.</h1>
          <p>
            Know where to take the order for your business and stay connected with the Hakika delivery network.
          </p>
        </div>
      </div>

      <div className="hk-form-panel">
        <div className="hk-form-card">
          <img
            src="/rider/logo.png"
            alt="Hakika Rider"
            style={{
              display: 'block',
              width: 350,
              maxWidth: '100%',
              height: 'auto',
              margin: '0 auto 20px',
            }}
          />
          <h2>Welcome back</h2>
          <p className="hk-form-sub">Log in to book and track your rides.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="hk-field">
              <label htmlFor="hk-email">Email</label>
              <input
                id="hk-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="hk-field">
              <label htmlFor="hk-password">Password</label>
              <input
                id="hk-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="hk-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="hk-submit" disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <div className="hk-links">
            <span>New rider?</span>
            <Link to="/register">Create account</Link>
            <span className="hk-divider">·</span>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;