import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await login({ email, password });

      loginUser(res.data.user, res.data.access, res.data.refresh);

      const role = res.data.user.role;
      if (role === 'client') navigate('/client/dashboard');
      else if (role === 'participant') navigate('/participant/dashboard');
      else if (role === 'admin') navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Bricolage+Grotesque:wght@600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        html, body {
          font-family: 'Inter', sans-serif;
          min-height: 100%;
          background:
            radial-gradient(circle at top left, var(--radial-1), transparent 28%),
            radial-gradient(circle at bottom right, var(--radial-2), transparent 30%),
            linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%);
          background-attachment: fixed;
        }

        /* NAV */
        .login-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          backdrop-filter: blur(16px);
          z-index: 200;
        }

        .brand-word {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 30px;
          font-weight: 800;
          color: var(--navy);
          letter-spacing: -1px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
        }

        /* PAGE */
        .auth-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          padding: 100px 20px 40px;
          overflow: hidden;
        }

        /* DECORATIVE SHAPES */
        .left-top-shape {
          position: absolute;
          left: -90px; top: 120px;
          width: 220px; height: 220px;
          background: var(--shape-1);
          border-radius: 34px;
          transform: rotate(12deg);
          opacity: 0.65;
          filter: blur(2px);
        }

        .left-bottom-circle {
          position: absolute;
          left: -120px; bottom: -120px;
          width: 280px; height: 280px;
          background: var(--shape-2);
          border-radius: 50%;
          opacity: 0.8;
        }

        .right-top-circle {
          position: absolute;
          right: -110px; top: 80px;
          width: 240px; height: 240px;
          background: var(--shape-1);
          border-radius: 50%;
          opacity: 0.7;
        }

        .right-bottom-shape {
          position: absolute;
          right: -70px; bottom: 40px;
          width: 190px; height: 190px;
          background: var(--shape-2);
          border-radius: 30px;
          transform: rotate(-16deg);
          opacity: 0.7;
        }

        .bg-glow {
          position: absolute;
          width: 420px; height: 420px;
          border-radius: 50%;
          background: var(--glow);
          filter: blur(120px);
          top: -140px; right: -120px;
          z-index: 0;
        }

        /* WRAPPER */
        .auth-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        /* CARD */
        .auth-card {
          width: 100%;
          max-width: 460px;
          padding: 42px;
          border-radius: 28px;
          background: var(--surface-glass);
          backdrop-filter: blur(18px);
          border: 1px solid var(--surface-glass-border);
          box-shadow: var(--shadow-auth);
          animation: fadeUp 0.6s ease;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .auth-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, var(--glass-top), var(--glass-bottom));
          pointer-events: none;
        }

        .auth-card-content { position: relative; z-index: 2; }

        .auth-card h2 {
          font-size: 34px;
          font-weight: 800;
          color: var(--text-heading);
          letter-spacing: -1px;
          margin-bottom: 10px;
        }

        .auth-card-subtitle {
          font-size: 15px;
          line-height: 1.7;
          color: var(--text-subtle);
          margin-bottom: 32px;
        }

        /* FORM */
        .form-field { margin-bottom: 22px; }

        .form-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .form-field label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-label);
          letter-spacing: 0.2px;
        }

        .input-wrapper { position: relative; }

        .form-field input {
          width: 100%;
          height: 56px;
          border-radius: 16px;
          border: 1px solid var(--border-input);
          background: var(--input-bg);
          padding: 0 70px 0 16px;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-heading);
          outline: none;
          transition: all 0.25s ease;
        }

        .form-field input::placeholder { color: var(--placeholder); }

        .form-field input:focus {
          border-color: var(--primary);
          background: var(--surface);
          box-shadow: var(--shadow-focus);
        }

        .password-toggle {
          position: absolute;
          right: 16px; top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-subtle);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .password-toggle:hover { color: var(--primary); }

        .login-error-text {
          margin-top: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--danger);
        }

        /* SUBMIT BUTTON */
        .auth-submit {
          width: 100%;
          height: 58px;
          border: none;
          border-radius: 16px;
          margin-top: 10px;
          background: linear-gradient(135deg, var(--blue-dark) 0%, var(--blue) 100%);
          color: var(--on-primary);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.2px;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: var(--shadow-btn);
        }

        .auth-submit:hover {
          transform: translateY(-2px);
          background: linear-gradient(135deg, var(--primary-dark) 0%, var(--blue-dark) 100%);
          box-shadow: var(--shadow-btn-hover);
        }

        .auth-submit:active { transform: scale(0.985); }
        .auth-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        /* FOOTER */
        .auth-switch {
          margin-top: 26px;
          text-align: center;
          font-size: 14px;
          color: var(--text-muted);
        }

        .auth-switch button {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 700;
          cursor: pointer;
        }

        .auth-switch button:hover { color: var(--blue-dark); }

        /* RESPONSIVE */
        @media (max-width: 640px) {
          .auth-page {
            padding: 90px 16px 20px;
          }

          .auth-card {
            padding: 24px 18px;
            border-radius: 20px;
            max-width: 95%;
          }

          .auth-card h2 { font-size: 26px; }

          .form-field input {
            height: 52px;
            font-size: 14px;
          }

          .auth-submit { height: 52px; }

          .left-top-shape,
          .left-bottom-circle,
          .right-top-circle,
          .right-bottom-shape { opacity: 0.4; }
        }
      `}</style>

      <div className="auth-page">
        <nav className="login-nav">
          <button className="brand-word" onClick={() => navigate('/')}>
            Requify
          </button>
          <ThemeToggle />
        </nav>

        <div className="bg-glow"></div>
        <div className="left-top-shape"></div>
        <div className="left-bottom-circle"></div>
        <div className="right-top-circle"></div>
        <div className="right-bottom-shape"></div>

        <div className="auth-wrapper">
          <section className="auth-card">
            <div className="auth-card-content">
              <h2>Welcome back</h2>
              <p className="auth-card-subtitle">Sign in to continue to your workspace.</p>

              <form onSubmit={handleSubmit}>
                {/* EMAIL */}
                <div className="form-field">
                  <div className="form-row">
                    <label>Email Address</label>
                  </div>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div className="form-field">
                  <div className="form-row">
                    <label>Password</label>
                  </div>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                  {error && <p className="login-error-text">{error}</p>}
                </div>

                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? 'Signing In...' : 'Continue'}
                </button>
              </form>

              <p className="auth-switch">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => navigate('/register')}>
                  Create account
                </button>
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default Login;