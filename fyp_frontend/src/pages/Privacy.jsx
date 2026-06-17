import { Link } from 'react-router-dom';

const Privacy = () => {
  return (
    <div style={{ minHeight: '100vh', padding: '48px 24px 64px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ marginBottom: 24 }}>
          <Link to="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Requify
          </Link>
        </p>

        <article className="data-panel">
          <h1 style={{ margin: '0 0 8px', fontSize: 28, color: 'var(--text)' }}>Privacy Policy</h1>
          <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 14 }}>
            Last updated: June 14, 2026
          </p>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text)' }}>Introduction</h2>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
              Requify (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) provides a software-as-a-service platform
              for requirement discovery, participant collaboration, and structured feedback collection.
              This Privacy Policy explains how we collect, use, and protect information when you use our
              services.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text)' }}>Information We Collect</h2>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
              We may collect account information (such as name, email, and role), profile details you
              choose to provide, job and submission content you create on the platform, usage data related
              to your interactions with Requify, and technical information such as browser type and device
              identifiers needed to operate and secure the service.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text)' }}>How We Use Information</h2>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
              We use collected information to provide and maintain Requify, authenticate users, facilitate
              collaboration between clients and participants, improve platform performance, communicate
              service-related updates, and comply with applicable legal obligations.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text)' }}>Data Sharing</h2>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
              We do not sell your personal information. We may share data with trusted service providers
              who help us operate the platform, when required by law, or when you explicitly authorize
              sharing within your workspace (for example, between clients and participants on a job).
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text)' }}>Data Security</h2>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
              We implement reasonable administrative, technical, and organizational measures designed to
              protect your information. No method of transmission or storage is completely secure, and we
              cannot guarantee absolute security.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text)' }}>Your Rights</h2>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
              Depending on your location, you may have rights to access, correct, delete, or restrict the
              processing of your personal information. To make a request, contact us using the details
              below.
            </p>
          </section>

          <section>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text)' }}>Contact Us</h2>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
              If you have questions about this Privacy Policy, email us at{' '}
              <a href="mailto:support@requify.com" style={{ color: 'var(--primary)' }}>
                support@requify.com
              </a>
              .
            </p>
          </section>
        </article>
      </div>
    </div>
  );
};

export default Privacy;
