import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyJobs } from '../services/api';

const isOverdue = (job) =>
  job.status === 'open' && job.deadline && new Date(job.deadline) < new Date();

const resolvedStatus = (job) => (isOverdue(job) ? 'closed' : job.status);

const statusClass = (s) => {
  if (s === 'open')     return 'success';
  if (s === 'closed')   return 'danger';
  if (s === 'rejected') return 'danger';
  return 'warning';
};

const STATS_CONFIG = [
  {
    key: 'total',
    label: 'Total Jobs',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
  {
    key: 'open',
    label: 'Open Jobs',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>
      </svg>
    ),
  },
  {
    key: 'pending',
    label: 'Pending Approval',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
      </svg>
    ),
  },
];

const ClientDashboard = () => {
  const { user }              = useAuth();
  const navigate              = useNavigate();
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await getMyJobs();
        setJobs(res.data);
      } catch (err) {
        console.error('Failed to load client dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const stats = useMemo(() => {
    const open    = jobs.filter((j) => j.status === 'open' && !isOverdue(j)).length;
    const pending = jobs.filter((j) => j.status === 'pending').length;
    return { total: jobs.length, open, pending };
  }, [jobs]);

  return (
    <>
      {/* ── Page heading ── */}
      <div className="page-title">
        <div>
          <h2>Welcome back, {user?.username || 'Client'}</h2>
          <p>Track your requirement jobs, approval state, forms, and reports.</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <section className="stat-grid" style={{ marginBottom: '20px' }}>
        {STATS_CONFIG.map(({ key, label, icon }) => (
          <article
            key={key}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              gap:            '12px',
              padding:        '16px 20px',
              background:     'var(--surface)',
              border:         '1px solid var(--border-card)',
              borderRadius:   'var(--radius-lg)',
              boxShadow:      'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width:        '34px',
                  height:       '34px',
                  flexShrink:   0,
                  borderRadius: 'var(--radius)',
                  background:   'var(--primary-subtle)',
                  border:       '1px solid var(--border-accent)',
                  display:      'grid',
                  placeItems:   'center',
                  color:        'var(--primary)',
                }}
              >
                {icon}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>
                {label}
              </span>
            </div>
            <strong style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1, color: 'var(--navy)' }}>
              {stats[key]}
            </strong>
          </article>
        ))}
      </section>

      {/* ── Recent jobs ── */}
      <section className="data-panel">
        <div className="page-title">
          <div>
            <h2>Recent Jobs</h2>
            <p>Your latest requirement elicitation projects.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading dashboard...</div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <div>
              <h3>No jobs yet</h3>
              <p>Create your first job to start gathering requirements.</p>
            </div>
          </div>
        ) : (
          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              overflow:     'hidden',
              border:       '1px solid var(--border-card)',
            }}
          >
            {jobs.slice(0, 5).map((job, index) => {
              const status = resolvedStatus(job);
              return (
                <div
                  key={job.id}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '14px',
                    padding:      '14px 18px',
                    background:   index % 2 === 0 ? 'var(--surface)' : 'var(--surface-muted)',
                    borderBottom: index < Math.min(jobs.length, 5) - 1 ? '1px solid var(--border-card)' : 'none',
                  }}
                >
                  {/* row number */}
                  <div
                    style={{
                      width:        '26px',
                      height:       '26px',
                      flexShrink:   0,
                      borderRadius: '50%',
                      background:   'var(--primary-subtle)',
                      border:       '1px solid var(--border-accent)',
                      display:      'grid',
                      placeItems:   'center',
                      fontSize:     '12px',
                      fontWeight:   650,
                      color:        'var(--primary)',
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* title + description */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize:     '15px',
                        fontWeight:   600,
                        color:        'var(--text-primary)',
                        whiteSpace:   'nowrap',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '2px',
                      }}
                    >
                      {job.title}
                    </div>
                    <div
                      style={{
                        fontSize:     '13px',
                        color:        'var(--muted)',
                        whiteSpace:   'nowrap',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight:   1.4,
                      }}
                    >
                      {job.description?.slice(0, 120)}
                      {job.description?.length > 120 ? '...' : ''}
                    </div>
                  </div>

                  {/* status pill */}
                  <span className={`pill ${statusClass(status)}`}>
                    {status}
                  </span>

                  {/* view button */}
                  <button
                    className="btn btn-primary"
                    type="button"
                    style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
                    onClick={() => navigate(`/client/jobs/${job.id}`)}
                  >
                    View Job
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
};

export default ClientDashboard;