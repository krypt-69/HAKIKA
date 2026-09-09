import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getTokenKey, getRefreshTokenKey } from '@hakika/auth';
import { Config } from '@hakika/config';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !email.trim() || !password) {
      setError('Username, email, and password are required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${Config.API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role: 'rider',
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(err.detail || 'Registration failed');
      }

      // Automatically log in after registration
      const loginResp = await fetch(`${Config.API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!loginResp.ok) {
        throw new Error('Registration succeeded but login failed. Please log in manually.');
      }
      const data = await loginResp.json();
      localStorage.setItem(getTokenKey('hakika_rider'), data.access_token);
      localStorage.setItem(getRefreshTokenKey('hakika_rider'), data.refresh_token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
          --amber: #f4a536;
          --amber-deep: #d98c1f;
          --panel: #ffffff;
          --text-dark: #171b2e;
          --text-muted: #767c96;
          --line: #e6e7f0;
          --error: #d94b4b;

          min-height: 100vh;
          display: flex;
          font-family: 'Inter', sans-serif;
          background: var(--panel);
        }

        /* ---------- Brand panel ---------- */
        .hk-brand {
          position: relative;
          flex: 0 0 40%;
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
          max-width: 340px;
        }

        .hk-brand-copy h1 {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: clamp(26px, 3vw, 34px);
          line-height: 1.18;
          letter-spacing: -0.015em;
          margin: 0 0 14px;
        }

        .hk-brand-copy p {
          font-size: 14.5px;
          line-height: 1.6;
          color: #a9afd1;
          margin: 0 0 22px;
        }

        .hk-checklist {
          list-style: none;
          padding: 0;
          margin: 0;
          position: relative;
          z-index: 2;
        }

        .hk-checklist li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13.5px;
          color: #c7cbe6;
          margin-bottom: 12px;
        }

        .hk-checklist svg {
          flex: none;
          margin-top: 2px;
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

        /* ---------- Form panel ---------- */
        .hk-form-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          overflow-y: auto;
        }

        .hk-form-card {
          width: 100%;
          max-width: 420px;
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
          margin: 0 0 28px;
        }

        .hk-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .hk-field {
          margin-bottom: 16px;
        }

        .hk-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-dark);
          margin-bottom: 7px;
        }

        .hk-field .hk-optional {
          font-weight: 400;
          color: var(--text-muted);
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

        .hk-field input:hover {
          border-color: #c9cce0;
        }

        .hk-field input:focus {
          outline: none;
          border-color: var(--amber);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(244, 165, 54, 0.18);
        }

        .hk-hint {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 6px;
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
          margin-top: 6px;
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
            min-height: 160px;
          }

          .hk-brand-copy h1 {
            font-size: 21px;
          }

          .hk-brand-copy p,
          .hk-checklist {
            display: none;
          }

          .hk-form-panel {
            padding: 28px 20px 44px;
          }
        }

        @media (max-width: 480px) {
          .hk-row {
            grid-template-columns: 1fr;
            gap: 0;
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

        <div>
          <div className="hk-brand-copy">
            <h1>Welcome to the riders community</h1>
            <p>Join the Hakika delivery network and take orders where they're needed.</p>
          </div>
          <ul className="hk-checklist">
            <li>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7.5" stroke="#f4a536" />
                <path d="M4.5 8.2L6.8 10.5L11.5 5.5" stroke="#f4a536" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Orders from nearby businesses
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7.5" stroke="#f4a536" />
                <path d="M4.5 8.2L6.8 10.5L11.5 5.5" stroke="#f4a536" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Clear pickup and drop-off details
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7.5" stroke="#f4a536" />
                <path d="M4.5 8.2L6.8 10.5L11.5 5.5" stroke="#f4a536" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Timely and reliable dispatch
            </li>
          </ul>
        </div>
      </div>

      <div className="hk-form-panel">
        <div className="hk-form-card">
          <h2>Create your account</h2>
          <p className="hk-form-sub">A few details and you're ready to ride.</p>

          {error && (
            <div className="hk-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="hk-row">
              <div className="hk-field">
                <label htmlFor="hk-username">Username</label>
                <input
                  id="hk-username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="hk-field">
                <label htmlFor="hk-name">
                  Name <span className="hk-optional">(optional)</span>
                </label>
                <input
                  id="hk-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>

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
              <label htmlFor="hk-phone">
                Phone <span className="hk-optional">(optional)</span>
              </label>
              <input
                id="hk-phone"
                type="tel"
                placeholder="0712345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <div className="hk-row">
              <div className="hk-field">
                <label htmlFor="hk-password">Password</label>
                <input
                  id="hk-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="hk-field">
                <label htmlFor="hk-confirm">Confirm password</label>
                <input
                  id="hk-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <p className="hk-hint" style={{ marginTop: -8, marginBottom: 18 }}>
              At least 6 characters.
            </p>

            <button type="submit" className="hk-submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="hk-links">
            <span>Already have an account?</span>
            <Link to="/login">Log in</Link>
            <span className="hk-divider">·</span>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;