import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/>
      </svg>
    ),
    title: 'Structured intake',
    text: 'Turn product briefs into organized jobs with approvals, deadlines, and full participant access controls.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Participant workflow',
    text: 'Coordinate applications, invitations, agreements, training, and submissions all in one place.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'Analysis-ready outputs',
    text: 'Collect consistent responses that are easier to review, compare, and report on across every job.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Create',
    text: 'Publish a requirement job with context, scope, deadline, and participant mode.',
    accent: 'var(--blue)',
  },
  {
    num: '02',
    title: 'Collect',
    text: 'Invite contributors, share onboarding material, and capture structured answers.',
    accent: 'var(--blue-dark)',
  },
  {
    num: '03',
    title: 'Review',
    text: 'Move from responses to cleaner requirement reports and decision-ready summaries.',
    accent: 'var(--blue-light)',
  },
];

// Simulated live activity feed
const ACTIVITY = [
  { avatar: 'SR', name: 'Sara R.', action: 'submitted a response', time: 'just now', color: 'var(--accent-indigo)' },
  { avatar: 'TK', name: 'Tom K.', action: 'joined the job', time: '2m ago', color: 'var(--accent-sky)' },
  { avatar: 'AM', name: 'Aisha M.', action: 'approved the brief', time: '5m ago', color: 'var(--accent-emerald)' },
  { avatar: 'JL', name: 'James L.', action: 'submitted a response', time: '9m ago', color: 'var(--accent-amber)' },
];

const LandingPage = () => {
  const location = useLocation();
  const [showNav, setShowNav] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  useEffect(() => {
    const onScroll = () => setShowNav(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % 3), 3000);
    return () => clearInterval(t);
  }, []);

  // Progressively reveal activity items
  useEffect(() => {
    if (visibleCount >= ACTIVITY.length) return;
    const t = setTimeout(() => setVisibleCount(c => c + 1), 1800);
    return () => clearTimeout(t);
  }, [visibleCount]);

  useEffect(() => {
    if (!location.hash) return;
    const target = document.querySelector(location.hash);
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }, [location.hash]);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactError('');
    setContactSuccess('');
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.subject.trim() || !contactForm.message.trim()) {
      setContactError('All fields are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      setContactError('Enter a valid email address.');
      return;
    }
    if (contactForm.message.trim().length < 10) {
      setContactError('Message must be at least 10 characters.');
      return;
    }
    setContactSuccess('Message sent successfully. The project team will review it soon.');
    setContactForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Sora:wght@600;700;800&family=Bricolage+Grotesque:wght@600;700;800&display=swap');
        
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        html { scroll-behavior: smooth; overflow-x: hidden; font-size: 16px; }
        body {
          font-family: 'Inter', sans-serif;
          background: var(--bg);
          color: var(--navy);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ── LAYOUT CONTAINERS ── */
        .w {
          width: 100%; max-width: 1200px;
          margin: 0 auto; padding: 0 40px;
        }
        @media (max-width: 768px) { .w { padding: 0 24px; } }

        .page {
          background:
            radial-gradient(circle at top left, var(--radial-1), transparent 28%),
            radial-gradient(circle at bottom right, var(--radial-2), transparent 30%),
            linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%);
          position: relative;
        }

        /* ── SOLID WHITE NAV BAR ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          height: 76px; display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px; background: var(--surface); transition: all 0.3s ease;
          border-bottom: 1px solid var(--border-nav);
          box-shadow: var(--shadow-sm);
        }
        .nav.stuck {
          background: var(--nav-stuck);
          backdrop-filter: blur(16px);
          box-shadow: var(--shadow-md);
        }
        @media (max-width: 640px) { .nav { padding: 0 20px; } }

        .brand { display: flex; align-items: center; text-decoration: none; }
        .brand-word {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 30px; font-weight: 800; color: var(--navy); letter-spacing: -1px;
        }

        .nav-links { display: flex; gap: 36px; }
        .nav-links a {
          font-size: 14px; font-weight: 600; color: var(--navy); transition: color .2s;
          text-decoration: none;
        }
        .nav-links a:hover { color: var(--blue); }
        @media (max-width: 860px) { .nav-links { display: none; } }

        .nav-r { display: flex; align-items: center; gap: 12px; }

        /* ──  BUTTON  ── */
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          border: none; cursor: pointer; font-family: 'Inter', sans-serif; font-weight: 600;
          white-space: nowrap; transition: all .25s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none;
        }
        .btn-sm  { height: 40px; padding: 0 18px; border-radius: 10px; font-size: 14px;} /* nav btn */
        .btn-lg  { height: 52px; padding: 0 32px; border-radius: 12px; font-size: 15px; } /* hero btn*/

        .btn-primary {
          background: linear-gradient(135deg, var(--blue-dark), var(--blue));
          color: var(--on-primary); box-shadow: var(--shadow-blue);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-btn-hover);
        }
        .btn-ghost {
          background: var(--btn-ghost-bg);
          color: var(--navy-mid); border: 1px solid var(--border);
          backdrop-filter: blur(8px);
        }
        .btn-ghost:hover { background: var(--surface); color: var(--blue); box-shadow: var(--shadow-sm); }

        .btn-outline {
          background: var(--btn-outline-bg);
          color: var(--navy-mid); border: 1px solid var(--border);
          backdrop-filter: blur(8px);
        }
        .btn-outline:hover { background: var(--surface); border-color: var(--blue); transform: translateY(-1px); }

        /* ── CHIC MICRO-COMPONENTS ── */
        .ey {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px; border-radius: 999px;
          background: var(--surface); border: 1px solid var(--border);
          color: var(--blue); font-size: 12px; font-weight: 700;
          letter-spacing: 0.03em; margin-bottom: 24px; box-shadow: var(--shadow-sm);
        }
        .ey-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--blue);
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        /* ── HERO ── */
        .hero { padding: 160px 0 100px; position: relative; }
        .hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 64px; align-items: center; }
        
        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr; gap: 56px; text-align: center; }
          .hero-btns { justify-content: center; }
          .hcard-w { max-width: 480px; margin: 0 auto; }
        }

        .hero-h1 {
          font-size: clamp(38px, 4.8vw, 62px); line-height: 1.1;
          letter-spacing: -2px; font-weight: 800; color: var(--navy); margin-bottom: 24px;
        }
        .hero-h1 span {
          background: linear-gradient(135deg, var(--blue-dark), var(--blue-light));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .hero-p {
          font-size: clamp(16px, 1.2vw, 18px); line-height: 1.75; font-weight: 400;
          color: var(--navy-soft); margin-bottom: 40px; max-width: 540px;
        }
        @media (max-width: 1024px) { .hero-p { margin: 0 auto 40px; } }
        .hero-btns { display: flex; gap: 16px; flex-wrap: wrap; }

        /* ── HERO RIGHT PANEL ── */
        .hcard-w {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Top stat strip */
        .hstat-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .hstat {
          background: var(--surface);
          border: 1px solid var(--border-soft);
          border-radius: 16px;
          padding: 18px 16px;
          box-shadow: var(--shadow-sm);
          text-align: center;
        }
        .hstat-num {
          font-family: 'Sora', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: var(--navy);
          letter-spacing: -1px;
        }
        .hstat-lbl {
          font-size: 11px;
          font-weight: 600;
          color: var(--navy-soft);
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        /* Progress card */
        .hprog-card {
          background: var(--surface);
          border: 1px solid var(--border-soft);
          border-radius: 20px;
          padding: 24px 24px 20px;
          box-shadow: var(--shadow-sm);
          position: relative;
          overflow: hidden;
        }
        .hprog-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--blue-dark), var(--blue-light));
        }
        .hprog-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .hprog-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--navy);
        }
        .hprog-badge {
          font-size: 11px;
          font-weight: 700;
          color: var(--success);
          background: var(--success-bg);
          padding: 3px 9px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .hprog-badge::before {
          content: '';
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--success);
        }
        .hprog-jobs {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .hprog-job {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .hprog-job-name {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--navy-soft);
          width: 100px;
          flex-shrink: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hprog-track {
          flex: 1;
          height: 6px;
          border-radius: 999px;
          background: var(--track-bg);
          overflow: hidden;
        }
        .hprog-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--blue-dark), var(--blue-light));
          transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hprog-pct {
          font-size: 12px;
          font-weight: 700;
          color: var(--navy);
          width: 32px;
          text-align: right;
          flex-shrink: 0;
        }

        /* Activity feed card */
        .hact-card {
          background: var(--surface);
          border: 1px solid var(--border-soft);
          border-radius: 20px;
          padding: 20px 24px;
          box-shadow: var(--shadow-sm);
        }
        .hact-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .hact-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--navy-soft);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .hact-live {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          color: var(--success);
        }
        .hact-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--success);
          animation: blink 1.5s ease-in-out infinite;
        }
        .hact-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .hact-item {
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          transform: translateY(6px);
          animation: slideIn 0.4s ease forwards;
        }
        @keyframes slideIn {
          to { opacity: 1; transform: translateY(0); }
        }
        .hact-avatar {
          width: 30px; height: 30px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; color: var(--on-primary);
          flex-shrink: 0;
        }
        .hact-text {
          flex: 1;
          font-size: 12.5px;
          color: var(--navy-soft);
          line-height: 1.4;
        }
        .hact-text strong {
          color: var(--navy);
          font-weight: 700;
        }
        .hact-time {
          font-size: 11px;
          color: var(--soft);
          font-weight: 500;
          flex-shrink: 0;
        }

        /* ── SECTIONS CONTROLS ── */
        .sec { padding: 120px 0; position: relative; }
        .sec-sm { padding: 80px 0; }
        .sec-hd { margin-bottom: 64px; }
        .sec-hd.c { text-align: center; }
        .sec-h2 {
          font-size: clamp(32px, 3.5vw, 44px); line-height: 1.15;
          letter-spacing: -1.2px; font-weight: 800; color: var(--navy); margin-bottom: 16px;
        }
        .sec-sub { font-size: 17px; line-height: 1.6; color: var(--navy-soft); max-width: 560px; margin: 0 auto; }

        .div-line {
          height: 1px; background: linear-gradient(90deg, transparent, var(--divider-line), transparent);
        }

        /* ── ABOUT FEATURE CARD ── */
        .about-card {
          background: var(--surface); border: 1px solid var(--border-soft);
          border-radius: 28px; padding: 60px;
          display: grid; grid-template-columns: 1fr 1.2fr; gap: 64px;
          align-items: center; box-shadow: var(--shadow-md);
        }
        @media (max-width: 860px) { .about-card { grid-template-columns: 1fr; gap: 32px; padding: 40px 24px; } }
        .about-body { font-size: 16px; line-height: 1.8; color: var(--navy-soft); }

        /* ── FEATURES GRID ── */
        .feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        @media (max-width: 960px) { .feat-grid { grid-template-columns: 1fr; } }

        .fc {
          background: var(--surface); border: 1px solid var(--border-soft);
          border-radius: 20px; padding: 40px 32px; box-shadow: var(--shadow-sm);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); position: relative;
        }
        .fc:hover {
          transform: translateY(-4px); border-color: var(--border-hover); box-shadow: var(--shadow-lg);
        }
        .fc-ico {
          width: 48px; height: 48px; border-radius: 12px; background: var(--primary-subtle);
          display: flex; align-items: center; justify-content: center;
          color: var(--blue); margin-bottom: 24px;
        }
        .fc-title { font-size: 18px; font-weight: 700; color: var(--navy); margin-bottom: 12px; }
        .fc-text { font-size: 14.5px; line-height: 1.65; color: var(--navy-soft); }

        /* ── WORKFLOW INTERACTIVE STEPS ── */
        .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        @media (max-width: 860px) { .steps-grid { grid-template-columns: 1fr; } }

        .sc {
          background: var(--surface); border: 1px solid var(--border-soft);
          border-radius: 20px; padding: 40px 32px; position: relative;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer;
          box-shadow: var(--shadow-sm);
        }
        .sc:hover, .sc.on {
          border-color: var(--border-hover-strong); box-shadow: var(--shadow-md); transform: translateY(-4px);
        }
        .sc-num {
          font-family: 'Sora', sans-serif; font-size: 44px; font-weight: 800;
          color: var(--step-num); margin-bottom: 16px; transition: color 0.3s;
        }
        .sc.on .sc-num { color: var(--step-num-active); }
        .sc-title { font-size: 19px; font-weight: 700; color: var(--navy); margin-bottom: 12px; }
        .sc-text { font-size: 14.5px; line-height: 1.65; color: var(--navy-soft); }
        .sc-bar {
          position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, var(--blue-dark), var(--blue-light));
          transform: scaleX(0); transform-origin: left; transition: transform .3s ease;
        }
        .sc.on .sc-bar { transform: scaleX(1); }

        /* ── WHY US CARD SYSTEM ── */
        .why-sec { padding: 100px 0; }
        .why-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 768px) { .why-grid { grid-template-columns: 1fr; } }

        .why-card {
          background: var(--surface); border: 1px solid var(--border-soft);
          border-radius: 20px; padding: 36px; box-shadow: var(--shadow-sm);
          transition: all 0.3s ease;
        }
        .why-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: var(--border-hover-soft); }
        .why-ico { font-size: 28px; margin-bottom: 16px; }
        .why-title { font-size: 18px; font-weight: 700; color: var(--navy); margin-bottom: 10px; }
        .why-text { font-size: 14.5px; line-height: 1.65; color: var(--navy-soft); }

        /* ── CALL TO ACTION PANEL ── */
        .cta-card {
          background: linear-gradient(135deg, var(--blue-dark) 0%, var(--blue) 100%);
          border-radius: 24px; padding: 64px 80px;
          display: flex; align-items: center; justify-content: space-between; gap: 48px;
          box-shadow: var(--shadow-blue); position: relative; overflow: hidden;
        }
        @media (max-width: 960px) {
          .cta-card { flex-direction: column; align-items: flex-start; padding: 48px 32px; gap: 32px; }
        }
        .cta-ey {
          display: inline-flex; padding: 6px 14px; border-radius: 999px;
          background: var(--on-primary-subtle); color: var(--on-primary);
          font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px;
        }
        .cta-h2 { font-size: clamp(28px, 3vw, 40px); font-weight: 800; color: var(--on-primary); margin-bottom: 12px; letter-spacing: -1px; }
        .cta-p { font-size: 16px; line-height: 1.6; color: var(--on-primary-muted); max-width: 480px; }
        .cta-btns { display: flex; gap: 16px; flex-wrap: wrap; }

        .btn-white { background: var(--surface); color: var(--blue-dark); text-decoration: none; }
        .btn-white:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .btn-white-ghost { background: var(--on-primary-hover); color: var(--on-primary); border: 1px solid var(--on-primary-border); text-decoration: none; }
        .btn-white-ghost:hover { background: var(--on-primary-hover-strong); }

        /* ── FOOTER SYSTEM ── */
        .footer { background: var(--footer-bg); padding: 80px 0 40px; color: var(--footer-text); }
        .footer-grid {
          display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 64px;
          padding-bottom: 48px; border-bottom: 1px solid var(--footer-divider); margin-bottom: 32px;
        }
        @media (max-width: 768px) { .footer-grid { grid-template-columns: 1fr; gap: 40px; } }
        
        .footer-brand-name {
          font-family: 'Bricolage Grotesque', sans-serif; font-size: 30px;
          font-weight: 800; color: var(--footer-heading); display: block; margin-bottom: 16px; letter-spacing: -1px;
        }
        .footer-desc { font-size: 14.5px; line-height: 1.7; max-width: 320px; }
        .footer-col h5 { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--footer-heading); margin-bottom: 20px; letter-spacing: 0.05em; }
        .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 12px; }
        .footer-col a { font-size: 14px; color: var(--footer-text); transition: color 0.2s; text-decoration: none; }
        .footer-col a:hover { color: var(--footer-heading); }
        
        .footer-btm { display: flex; justify-content: space-between; align-items: center; font-size: 13.5px; flex-wrap: wrap; gap: 16px; }

        .contact-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
          gap: 28px;
          align-items: start;
        }
        @media (max-width: 860px) { .contact-grid { grid-template-columns: 1fr; } }
        .contact-details,
        .contact-form-card {
          background: var(--surface);
          border: 1px solid var(--border-soft);
          border-radius: 24px;
          padding: 32px;
          box-shadow: var(--shadow-sm);
        }
        .contact-details h3,
        .contact-form-card h3 {
          color: var(--navy);
          font-size: 20px;
          margin-bottom: 12px;
        }
        .contact-details p {
          color: var(--navy-soft);
          line-height: 1.7;
          margin-bottom: 18px;
        }
        .contact-detail-list {
          display: grid;
          gap: 12px;
          color: var(--navy-soft);
          font-size: 14px;
        }
        .contact-detail-list strong {
          display: block;
          color: var(--navy);
          margin-bottom: 3px;
        }
        .contact-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        @media (max-width: 640px) { .contact-form-grid { grid-template-columns: 1fr; } }
        .contact-field {
          display: grid;
          gap: 7px;
        }
        .contact-field-wide { grid-column: 1 / -1; }
        .contact-field label {
          color: var(--navy);
          font-size: 13px;
          font-weight: 700;
        }
        .contact-field input,
        .contact-field textarea {
          width: 100%;
          border: 1px solid var(--border-hover-soft);
          border-radius: 12px;
          color: var(--navy);
          background: var(--input-bg);
          padding: 0 14px;
          min-height: 48px;
          outline: none;
          font-family: 'Inter', sans-serif;
        }
        .contact-field textarea {
          min-height: 130px;
          padding: 12px 14px;
          resize: vertical;
        }
        .contact-alert {
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 14px;
        }
        .contact-alert.error { color: var(--danger); background: var(--danger-bg); }
        .contact-alert.success { color: var(--success); background: var(--success-bg); }

        /* ── RESPONSIVE HERO PANEL ── */
        @media (max-width: 640px) {
          .hstat-num { font-size: 18px; }
          .hstat-lbl { font-size: 10px; }
          .hstat { padding: 14px 10px; }
        }
      `}</style>

      <div className="page">
        {/* ── WHITE NAV BAR ── */}
        <nav className={`nav ${showNav ? 'stuck' : ''}`}>
          <a className="brand" href="#home">
            <span className="brand-word">Requify</span>
          </a>
          <div className="nav-links">
            {[['#about', 'About'], ['#features', 'Features'], ['#workflow', 'Workflow'], ['#contact', 'Contact']].map(([h, l]) => (
              <a key={h} href={h}>{l}</a>
            ))}
          </div>
          <div className="nav-r">
            <ThemeToggle />
            <Link className="btn btn-primary btn-sm" to="/login">Login</Link>
            <Link className="btn btn-primary btn-sm" to="/register">Sign Up</Link>
          </div>
        </nav>

        {/* ── HERO SECTION ── */}
        <section id="home" className="hero">
          <div className="w">
            <div className="hero-grid">
              <div>
                <div className="ey"><span className="ey-dot" />Crowdsourcing Platform</div>
                <h1 className="hero-h1">
                  Turn <span>scattered feedback</span> into structured requirements
                </h1>
                <p className="hero-p">
                  Create requirement jobs, collect stakeholder input, coordinate participants,
                  and generate decision-ready reports from one collaborative workspace.
                </p>
                <div className="hero-btns">
                  <Link className="btn btn-primary btn-lg" to="/register">Start collecting requirements</Link>
                  <Link className="btn btn-outline btn-lg" to="/login">Login to dashboard</Link>
                </div>
              </div>

              {/* ── HERO RIGHT: LIVE DASHBOARD PANEL ── */}
              <div className="hcard-w">

                {/* Stat strip */}
                <div className="hstat-row">
                  {[
                    { num: '48', lbl: 'Active Jobs' },
                    { num: '312', lbl: 'Participants' },
                    { num: '94%', lbl: 'On-time Rate' },
                  ].map(({ num, lbl }) => (
                    <div className="hstat" key={lbl}>
                      <div className="hstat-num">{num}</div>
                      <div className="hstat-lbl">{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Progress card */}
                <div className="hprog-card">
                  <div className="hprog-top">
                    <span className="hprog-title">Response collection</span>
                    <span className="hprog-badge">Live</span>
                  </div>
                  <div className="hprog-jobs">
                    {[
                      { name: 'Mobile App v3', pct: 84 },
                      { name: 'Dashboard UX', pct: 61 },
                      { name: 'API Integration', pct: 45 },
                    ].map(({ name, pct }) => (
                      <div className="hprog-job" key={name}>
                        <span className="hprog-job-name">{name}</span>
                        <div className="hprog-track">
                          <div className="hprog-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="hprog-pct">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity feed */}
                <div className="hact-card">
                  <div className="hact-header">
                    <span className="hact-title">Team activity</span>
                    <span className="hact-live"><span className="hact-dot" />Live</span>
                  </div>
                  <div className="hact-list">
                    {ACTIVITY.slice(0, visibleCount).map(({ avatar, name, action, time, color }) => (
                      <div className="hact-item" key={name}>
                        <div className="hact-avatar" style={{ background: color }}>{avatar}</div>
                        <span className="hact-text"><strong>{name}</strong> {action}</span>
                        <span className="hact-time">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        <div className="div-line" />

        {/* ── ABOUT SECTION ── */}
        <section id="about" className="sec sec-sm">
          <div className="w">
            <div className="about-card">
              <div>
                <div className="ey">About Requify </div>
                <h2 className="sec-h2" style={{ margin: 0 }}>Built for teams that need dependable requirement discovery.</h2>
              </div>
              <p className="about-body">
                Requify helps teams publish requirement jobs, invite contributors, collect structured
                responses, and review outputs without losing track of approvals, onboarding, or
                submissions. One platform, zero confusion — built for the way modern product teams
                actually work.
              </p>
            </div>
          </div>
        </section>

        <div className="div-line" />

        {/* ── FEATURES SECTION ── */}
        <section id="features" className="sec">
          <div className="w">
            <div className="sec-hd c">
              <div className="ey">Features</div>
              <h2 className="sec-h2">Everything needed to move from brief to insight</h2>
              <p className="sec-sub">Purpose-built tools for how modern product teams actually work.</p>
            </div>
            <div className="feat-grid">
              {features.map(({ icon, title, text }) => (
                <article className="fc" key={title}>
                  <div className="fc-ico">{icon}</div>
                  <h3 className="fc-title">{title}</h3>
                  <p className="fc-text">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="div-line" />

        {/* ── WORKFLOW SECTION ── */}
        <section id="workflow" className="sec">
          <div className="w">
            <div className="sec-hd c">
              <div className="ey">Workflow</div>
              <h2 className="sec-h2">A clean process for clients and admins</h2>
              <p className="sec-sub">Three stages. Clear ownership at every step.</p>
            </div>
            <div className="steps-grid">
              {steps.map(({ num, title, text }, i) => (
                <article
                  key={title}
                  className={`sc ${activeStep === i ? 'on' : ''}`}
                  onMouseEnter={() => setActiveStep(i)}
                >
                  <div className="sc-num">{num}</div>
                  <h3 className="sc-title">{title}</h3>
                  <p className="sc-text">{text}</p>
                  <div className="sc-bar" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="div-line" />

        {/* ── WHY CHOOSE US ── */}
        <section className="why-sec">
          <div className="w">
            <div className="sec-hd c">
              <div className="ey">Why Choose Us</div>
              <h2 className="sec-h2">Professional structure without unnecessary complexity</h2>
            </div>
            <div className="why-grid">
              {[
                { ico: '🎯', title: 'Role-based dashboards', text: "Admins, clients, and participants each get a tailored view — only what they need, nothing they don't." },
                { ico: '⚡', title: 'Decisions made faster', text: 'Less noise. More signal. Structured inputs mean faster reviews, cleaner reports, and smarter outcomes.' },
                { ico: '🔐', title: 'Secure by default', text: 'Access controls and approval flows baked in from day one. Your data stays organized and protected.' },
                { ico: '🔄', title: 'Repeatable workflows', text: 'Standardize your discovery process. Every job follows the same proven structure, every single time.' },
              ].map(({ ico, title, text }) => (
                <div className="why-card" key={title}>
                  <div className="why-ico">{ico}</div>
                  <h3 className="why-title">{title}</h3>
                  <p className="why-text">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA SECTION ── */}
        <section className="sec">
          <div className="w">
            <div className="cta-card">
              <div>
                <div className="cta-ey">Get started today</div>
                <h2 className="cta-h2">Ready to refine your requirements?</h2>
                <p className="cta-p">
                  Use Requify to coordinate clients, participants, and administrators
                  from one streamlined platform. No spreadsheets. No chaos.
                </p>
              </div>
              <div className="cta-btns">
                <Link className="btn btn-white btn-lg" to="/register">Create account</Link>
                <Link className="btn btn-white-ghost btn-lg" to="/login">View dashboard</Link>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="sec sec-sm">
          <div className="w">
            <div className="sec-hd c">
              <div className="ey">Contact Us</div>
              <h2 className="sec-h2">Reach the project team</h2>
              <p className="sec-sub">Send questions about support, workflows, access, or requirement collection.</p>
            </div>
            <div className="contact-grid">
              <div className="contact-details">
                <h3>Project contact details</h3>
                <p>Use the form for project questions, technical support, account help, and collaboration requests.</p>
                <div className="contact-detail-list">
                  <div><strong>Email</strong>support@requify.local</div>
                  <div><strong>Phone</strong>+92 300 0000000</div>
                  <div><strong>Office</strong>Software Engineering Department, FYP Project Office</div>
                  <div><strong>Hours</strong>Monday to Friday, 9:00 AM - 5:00 PM</div>
                </div>
              </div>
              <form className="contact-form-card" onSubmit={handleContactSubmit}>
                <h3>Send a message</h3>
                {contactError && <div className="contact-alert error">{contactError}</div>}
                {contactSuccess && <div className="contact-alert success">{contactSuccess}</div>}
                <div className="contact-form-grid">
                  <div className="contact-field">
                    <label>Name</label>
                    <input value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
                  </div>
                  <div className="contact-field">
                    <label>Email</label>
                    <input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                  </div>
                  <div className="contact-field contact-field-wide">
                    <label>Subject</label>
                    <input value={contactForm.subject} onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })} />
                  </div>
                  <div className="contact-field contact-field-wide">
                    <label>Message</label>
                    <textarea value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} />
                  </div>
                  <div className="contact-field contact-field-wide">
                    <button className="btn btn-primary btn-lg" type="submit">Submit Message</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ── FOOTER SECTION ── */}
        <footer className="footer">
          <div className="w">
            <div className="footer-grid">
              <div>
                <span className="footer-brand-name">Requify</span>
                <p className="footer-desc">
                  Modern requirement discovery platform for teams that need organized
                  collaboration, structured feedback collection, and cleaner product insights.
                </p>
              </div>
              <div className="footer-col">
                <h5>Platform</h5>
                <ul>
                  <li><a href="#about">About</a></li>
                  <li><a href="#features">Features</a></li>
                  <li><a href="#workflow">Workflow</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h5>Contact</h5>
                <ul>
                  <li><a href="mailto:support@requify.com">Support</a></li>
                  <li><Link to="/privacy">Privacy Policy</Link></li>
                </ul>
              </div>
            </div>
            <div className="footer-btm">
              <span>&copy; {new Date().getFullYear()} Requify .  All rights reserved.</span>
              <span>Built for high-performance product management.</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
