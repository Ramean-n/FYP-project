import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import Icon from '../components/Icons';

const mediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `http://127.0.0.1:8000${path}`;
};

const STATS_CONFIG = [
  {
    key: 'pendingUsers',
    label: 'Pending Users',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    key: 'pendingJobs',
    label: 'Pending Jobs',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
  {
    key: 'suspendedUsers',
    label: 'Suspended Users',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
      </svg>
    ),
  },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [pendingJobs, setPendingJobs] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [cnicFile, setCnicFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const activeTab = searchParams.get('section') || 'overview';

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [jobsRes, usersRes, allUsersRes] = await Promise.all([
        API.get('/jobs/admin/pending/'),
        API.get('/users/pending/'),
        API.get('/users/admin/users/'),
      ]);
      setPendingJobs(jobsRes.data);
      setPendingUsers(usersRes.data);
      setAllUsers(allUsersRes.data);
    } catch (err) {
      console.error('Failed to load admin dashboard', err);
      setError('Failed to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleJobAction = async (jobId, action) => {
    try {
      let reason = '';
      if (action === 'reject') {
        reason = window.prompt('Enter rejection reason');
        if (!reason || !reason.trim()) {
          setError('Rejection reason is required.');
          return;
        }
      }
      await API.post(`/jobs/admin/${jobId}/decide/`, { action, reason });
      setMessage(`Job ${action}d successfully.`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed.');
    }
  };

  const handleUserApproval = async (userId, action) => {
    try {
      await API.post(`/users/admin/${userId}/approve/`, { action });
      setMessage(`User ${action}d successfully.`);
      fetchData();
    } catch {
      setError('Action failed.');
    }
  };

  const handleUserStatus = async (userId, action) => {
    try {
      await API.post(`/users/admin/${userId}/${action}/`);
      setMessage(action === 'suspend' ? 'User suspended successfully.' : 'User reactivated successfully.');
      fetchData();
    } catch {
      setError('Action failed.');
    }
  };

  const handleImportCnic = async (e) => {
    e.preventDefault();
    if (!cnicFile) {
      setError('Upload a CSV or Excel file first.');
      return;
    }
    setImporting(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', cnicFile);
      const res = await API.post('/users/admin/cnic-records/import/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage(res.data?.message || 'CNIC records imported.');
      setCnicFile(null);
      const input = document.getElementById('cnic-registry-file');
      if (input) input.value = '';
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import CNIC records.');
    } finally {
      setImporting(false);
    }
  };

  const stats = {
    pendingUsers: pendingUsers.length,
    pendingJobs: pendingJobs.length,
    suspendedUsers: allUsers.filter((u) => u.is_suspended).length,
  };

  // ── Shared row renderer ───────────────────────────────────────────────────
  const renderRow = (index, total, left, right) => (
    <div
      key={index}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '14px 18px',
        background: index % 2 === 0 ? 'var(--surface)' : 'var(--surface-muted)',
        borderBottom: index < total - 1 ? '1px solid var(--border-card)' : 'none',
      }}
    >
      <div
        style={{
          width: '26px',
          height: '26px',
          flexShrink: 0,
          borderRadius: '50%',
          background: 'var(--primary-subtle)',
          border: '1px solid var(--border-accent)',
          display: 'grid',
          placeItems: 'center',
          fontSize: '12px',
          fontWeight: 650,
          color: 'var(--primary)',
          marginTop: '2px',
        }}
      >
        {index + 1}
      </div>
      {left}
      {right}
    </div>
  );

  const rowTitle = (title, sub) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: '13px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
          {sub}
        </div>
      )}
    </div>
  );

  const rowActions = (...children) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexShrink: 0, marginTop: '2px' }}>
      {children}
    </div>
  );

  const listContainer = (children) => (
    <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
      {children}
    </div>
  );

  const emptyState = (msg) => <div className="empty-state">{msg}</div>;

  // ── Overview ──────────────────────────────────────────────────────────────
  const renderOverview = () => (
    listContainer(
      <>
        {renderRow(
          0, 2,
          rowTitle('Admin review queue', `${pendingJobs.length} job(s) need review. User identity approval is automatic after OTP and CNIC matching.`),
          rowActions(<span className="pill warning">Action needed</span>)
        )}
        {renderRow(
          1, 2,
          rowTitle('Active accounts', `${allUsers.filter((u) => !u.is_suspended).length} approved users can access system APIs.`),
          rowActions(<span className="pill success">Healthy</span>)
        )}
      </>
    )
  );

  // ── Users ─────────────────────────────────────────────────────────────────
  const renderUsers = () => (
    <>
      {/* CNIC Import card */}
      <section className="surface-card admin-import-card" style={{ marginBottom: '16px' }}>
        <div>
          <h3>Import CNIC registry</h3>
          <p>Upload a CSV or Excel file with full name and CNIC columns. Each upload replaces the current verification database.</p>
        </div>
        <form className="admin-import-form" onSubmit={handleImportCnic}>
          <div className="file-upload">
            <input id="cnic-registry-file" type="file" accept=".csv,.xlsx" onChange={(e) => setCnicFile(e.target.files?.[0] || null)} />
            <label className="upload-dropzone" htmlFor="cnic-registry-file">
              <span className="upload-icon"><Icon name="upload" size={20} /></span>
              <span className="upload-copy">
                <strong>{cnicFile ? cnicFile.name : 'Upload registry file'}</strong>
                <span>Columns: Full Name, CNIC</span>
              </span>
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={importing}>{importing ? 'Importing...' : 'Import records'}</button>
        </form>
      </section>

      {/* Pending users list */}
      {pendingUsers.length === 0
        ? emptyState('No pending users.')
        : listContainer(
            pendingUsers.map((u, index) => {
              const left = (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  {u.profile_picture ? (
                    <img
                      src={mediaUrl(u.profile_picture)}
                      alt={`${u.username} profile`}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                        background: 'var(--primary-subtle)', border: '1px solid var(--border-accent)',
                        display: 'grid', placeItems: 'center',
                        fontSize: '14px', fontWeight: 600, color: 'var(--primary)',
                      }}
                    >
                      {u.username?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{u.username}</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.4 }}>{u.email} · {u.role}</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.4 }}>Phone: {u.phone_number} · CNIC: {u.cnic}</div>
                  </div>
                </div>
              );
              return renderRow(
                index, pendingUsers.length, left,
                rowActions(
                  <span className="pill success">{u.verification_status}</span>,
                  <button className="btn btn-primary" type="button" style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }} onClick={() => handleUserApproval(u.id, 'approve')}>Approve User</button>,
                  <button className="btn btn-danger" type="button" style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }} onClick={() => handleUserApproval(u.id, 'reject')}>Reject</button>
                )
              );
            })
          )
      }
    </>
  );

  // ── Jobs ──────────────────────────────────────────────────────────────────
  const renderJobs = () => {
    if (pendingJobs.length === 0) return emptyState('No pending jobs.');
    return listContainer(
      pendingJobs.map((job, index) =>
        renderRow(
          index, pendingJobs.length,
          rowTitle(job.title, (job.description?.slice(0, 120) || '') + (job.description?.length > 120 ? '...' : '')),
          rowActions(
            <button className="btn btn-primary" type="button" style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }} onClick={() => handleJobAction(job.id, 'approve')}>Approve Job</button>,
            <button className="btn btn-danger" type="button" style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }} onClick={() => handleJobAction(job.id, 'reject')}>Reject Job</button>
          )
        )
      )
    );
  };

  // ── All users ─────────────────────────────────────────────────────────────
  const renderAllUsers = () => {
    if (allUsers.length === 0) return emptyState('No approved users.');
    return listContainer(
      allUsers.map((u, index) =>
        renderRow(
          index, allUsers.length,
          rowTitle(u.username, `${u.email} · ${u.role}`),
          rowActions(
            <span className={`pill ${u.is_suspended ? 'danger' : 'success'}`}>{u.is_suspended ? 'Suspended' : 'Active'}</span>,
            u.is_suspended ? (
              <button className="btn btn-primary" type="button" style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }} onClick={() => handleUserStatus(u.id, 'reactivate')}>Reactivate User</button>
            ) : (
              <button className="btn btn-danger" type="button" style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }} onClick={() => handleUserStatus(u.id, 'suspend')}>Suspend User</button>
            )
          )
        )
      )
    );
  };

  const renderContent = () => {
    if (loading) return emptyState('Loading admin data...');
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'users':    return renderUsers();
      case 'jobs':     return renderJobs();
      default:         return renderAllUsers();
    }
  };

  const sectionTitle = {
    overview: { h: 'Overview', p: 'Summary of pending actions and system health.' },
    users:    { h: 'Pending users', p: 'Review and approve or reject user registrations.' },
    jobs:     { h: 'Pending jobs', p: 'Approve or reject submitted job listings.' },
  };
  const current = sectionTitle[activeTab] || { h: 'All users', p: 'Manage account status across all registered users.' };

  return (
    <>
      {/* ── Page heading ── */}
      <div className="page-title">
        <div>
          <h2>Welcome back, {user?.username || 'Admin'}</h2>
          <p>Review pending users, job approvals, and account status.</p>
        </div>
      </div>

      {message && <p className="form-alert success">{message}</p>}
      {error   && <p className="form-alert danger">{error}</p>}

      {/* ── Stat cards ── */}
      <section className="stat-grid" style={{ marginBottom: '20px' }}>
        {STATS_CONFIG.map(({ key, label, icon }) => (
          <article
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '16px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px', height: '34px', flexShrink: 0,
                  borderRadius: 'var(--radius)',
                  background: 'var(--primary-subtle)',
                  border: '1px solid var(--border-accent)',
                  display: 'grid', placeItems: 'center',
                  color: 'var(--primary)',
                }}
              >
                {icon}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{label}</span>
            </div>
            <strong style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1, color: 'var(--navy)' }}>
              {stats[key]}
            </strong>
          </article>
        ))}
      </section>

      {/* ── Main content panel ── */}
      <section className="data-panel">
        <div className="page-title">
          <div>
            <h2>{current.h}</h2>
            <p>{current.p}</p>
          </div>
        </div>
        {renderContent()}
      </section>
    </>
  );
};

export default AdminDashboard;