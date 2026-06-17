import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/api';
import API from '../services/api';
import Icon from '../components/Icons';
import ThemeToggle from '../components/ThemeToggle';

const Register = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    role: 'client',
    phone_number: '',
    cnic: '',
    profile_picture: null,
  });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const pendingEmail = window.localStorage.getItem('pending_registration_email');
    if (pendingEmail) {
      setForm((prev) => ({ ...prev, email: pendingEmail }));
      setStep(2);
      setSuccess(`Enter the 6-digit verification code sent to ${pendingEmail}`);
    }
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setForm({ ...form, profile_picture: e.target.files?.[0] || null });
  };

  const validateForm = () => {
    if (!/^[A-Za-z ]+$/.test(form.username.trim())) return 'Name can contain letters and spaces only.';
    if (!/^03\d{9}$/.test(form.phone_number)) return 'Phone number must use format 03XXXXXXXXX.';
    if (!/^\d{5}-\d{7}-\d$/.test(form.cnic)) return 'CNIC must use format 00000-0000000-0.';
    if (!form.profile_picture) return 'Profile picture is required.';
    if (!form.profile_picture.type?.startsWith('image/')) return 'Profile picture must be an image file.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== '') formData.append(key, value);
      });

      await register(formData);
      window.localStorage.setItem('pending_registration_email', form.email);
      setStep(2);
      setSuccess(`A 6-digit verification code was sent to ${form.email}`);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const messages = Object.entries(data)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
          .join(' | ');
        setError(messages);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      await API.post('/users/verify-email/', { email: form.email, token: otp });
      window.localStorage.removeItem('pending_registration_email');
      setSuccess('Email and CNIC verified. Your account is approved and ready to log in.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    setSuccess('');
    try {
      await API.post('/users/resend-verification/', { email: form.email });
      setSuccess('A new verification code has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code.');
    } finally {
      setResendLoading(false);
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
          overflow-x: hidden;
        }

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

        .auth-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .auth-card {
          width: 100%;
          max-width: 980px;
          padding: 34px 36px;
          border-radius: 28px;
          background: var(--surface-glass);
          backdrop-filter: blur(18px);
          border: 1px solid var(--surface-glass-border);
          box-shadow: var(--shadow-auth);
          animation: fadeUp 0.6s ease;
          position: relative;
          overflow: hidden;
        }

        .auth-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, var(--glass-top), var(--glass-bottom));
          pointer-events: none;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .auth-card-content {
          position: relative;
          z-index: 2;
        }

        .auth-card h2 {
          font-size: 32px;
          font-weight: 800;
          color: var(--text-heading);
          letter-spacing: -1px;
          margin-bottom: 8px;
        }

        .auth-card-subtitle {
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-subtle);
          margin-bottom: 22px;
        }

        .stepper {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          font-size: 13px;
          font-weight: 700;
          color: var(--placeholder);
        }

        .stepper span.active {
          color: var(--primary);
        }

        .stepper i {
          width: 32px;
          height: 2px;
          background: var(--border-input);
          display: inline-block;
          border-radius: 999px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 16px;
        }

        .form-field {
          margin-bottom: 0;
        }

        .form-field label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-label);
          letter-spacing: 0.2px;
          margin-bottom: 7px;
        }

        .form-field input,
        .form-field select {
          width: 100%;
          height: 52px;
          border-radius: 16px;
          border: 1px solid var(--border-input);
          background: var(--input-bg);
          padding: 0 16px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-heading);
          outline: none;
          transition: all 0.25s ease;
        }

        .form-field input::placeholder {
          color: var(--placeholder);
        }

        .form-field input:focus,
        .form-field select:focus {
          border-color: var(--primary);
          background: var(--surface);
          box-shadow: var(--shadow-focus);
        }

        .file-upload {
          width: 100%;
        }

        .file-upload input[type="file"] {
          display: none;
        }

        .upload-dropzone {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 52px;
          border-radius: 16px;
          border: 1px dashed var(--border-accent);
          background: var(--input-bg);
          padding: 10px 16px;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .upload-dropzone:hover {
          border-color: var(--primary);
          background: var(--surface);
        }

        .upload-icon {
          flex: 0 0 auto;
          color: var(--primary);
        }

        .upload-copy {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .upload-copy strong {
          color: var(--text-heading);
          font-size: 13px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .upload-copy span {
          color: var(--text-subtle);
          font-size: 11px;
        }

        .otp-input {
          letter-spacing: 6px;
          text-align: center;
          font-size: 18px;
          font-weight: 700;
        }

        .form-alert {
          margin-bottom: 14px;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.5;
        }

        .form-alert.danger {
          color: var(--danger);
        }

        .form-alert.success {
          color: var(--success-text);
        }

        .auth-submit {
          width: 100%;
          height: 54px;
          border: none;
          border-radius: 16px;
          margin-top: 16px;
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

        .auth-submit:active {
          transform: scale(0.985);
        }

        .auth-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .auth-switch {
          margin-top: 16px;
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

        .auth-switch button:hover {
          color: var(--blue-dark);
        }

        @media (max-width: 900px) {
          .auth-card {
            max-width: 95%;
          }
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .auth-card {
            padding: 26px 20px;
          }

          .auth-card h2 {
            font-size: 28px;
          }
        }

        @media (max-width: 640px) {
          .auth-page {
            padding: 90px 16px 20px;
          }

          .login-nav {
            padding: 0 18px;
          }

          .auth-card {
            padding: 22px 16px;
            border-radius: 20px;
          }

          .auth-card h2 {
            font-size: 25px;
          }

          .form-field input,
          .form-field select {
            height: 50px;
            font-size: 14px;
          }

          .auth-submit {
            height: 50px;
          }

          .left-top-shape,
          .left-bottom-circle,
          .right-top-circle,
          .right-bottom-shape {
            opacity: 0.35;
          }
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
              <div className="stepper">
                <span className={step === 1 ? 'active' : ''}>Register</span>
                <i />
                <span className={step === 2 ? 'active' : ''}>Verify Email</span>
              </div>

              {step === 1 && (
                <>
                  <h2>Create an account</h2>
                  <p className="auth-card-subtitle">Join the community of requirement experts.</p>
                  {error && <p className="form-alert danger">{error}</p>}

                  <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                      <div className="form-field">
                        <label>Email Address</label>
                        <input
                          type="email"
                          name="email"
                          placeholder="name@gmail.com"
                          value={form.email}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label>Full Name</label>
                        <input
                          type="text"
                          name="username"
                          placeholder="John Doe"
                          value={form.username}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label>User Role</label>
                        <select name="role" value={form.role} onChange={handleChange}>
                          <option value="client">Client</option>
                          <option value="participant">Participant</option>
                        </select>
                      </div>

                      <div className="form-field">
                        <label>Phone Number</label>
                        <input
                          type="tel"
                          placeholder="03001234567"
                          value={form.phone_number}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                            setForm({ ...form, phone_number: digits });
                          }}
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label>CNIC</label>
                        <input
                          type="text"
                          placeholder="00000-0000000-0"
                          value={form.cnic}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
                            const formatted =
                              digits.length <= 5
                                ? digits
                                : digits.length <= 12
                                  ? `${digits.slice(0, 5)}-${digits.slice(5)}`
                                  : `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
                            setForm({ ...form, cnic: formatted });
                          }}
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label>Profile Picture</label>
                        <div className="file-upload">
                          <input
                            id="profile-picture"
                            type="file"
                            name="profile_picture"
                            accept="image/*"
                            onChange={handleFileChange}
                            required
                          />
                          <label className="upload-dropzone" htmlFor="profile-picture">
                            <span className="upload-icon">
                              <Icon name="upload" size={20} />
                            </span>
                            <span className="upload-copy">
                              <strong>{form.profile_picture ? form.profile_picture.name : 'Upload profile image'}</strong>
                              <span>PNG, JPG, or WebP image.</span>
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="form-field">
                        <label>Password</label>
                        <input
                          type="password"
                          name="password"
                          placeholder="Password"
                          value={form.password}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <button className="auth-submit" type="submit" disabled={loading}>
                      {loading ? 'Registering...' : 'Register'}
                    </button>
                  </form>

                  <p className="auth-switch">
                    Already have an account?{' '}
                    <button type="button" onClick={() => navigate('/login')}>
                      Login now
                    </button>
                  </p>
                </>
              )}

              {step === 2 && (
                <>
                  <h2>Verify your email</h2>
                  <p className="auth-card-subtitle">
                    We sent a 6-digit code to <strong>{form.email}</strong>
                  </p>
                  {error && <p className="form-alert danger">{error}</p>}
                  {success && <p className="form-alert success">{success}</p>}

                  <form onSubmit={handleVerify}>
                    <div className="form-field">
                      <label>Verification Code</label>
                      <input
                        className="otp-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                      />
                    </div>

                    <button className="auth-submit" type="submit" disabled={loading}>
                      {loading ? 'Verifying...' : 'Verify Email'}
                    </button>
                  </form>

                  <p className="auth-switch">
                    Didn&apos;t receive it?{' '}
                    <button type="button" disabled={resendLoading} onClick={handleResend}>
                      {resendLoading ? 'Sending...' : 'Resend code'}
                    </button>
                  </p>

                  <p className="auth-switch">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setError('');
                        setSuccess('');
                      }}
                    >
                      Back to registration
                    </button>
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default Register;
