import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API, { getMyInvitations, getMySubmittedForms, respondInvitation } from '../services/api';
import Icon from '../components/Icons';

const statusClass = (status) => {
  if (status === 'approved' || status === 'accepted' || status === 'signed') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
};

const STATS_CONFIG = [
  {
    key: 'openJobs',
    label: 'Open Jobs',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
  {
    key: 'applications',
    label: 'Applications',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    key: 'submittedForms',
    label: 'Submitted Forms',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>
      </svg>
    ),
  },
];

const ParticipantDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [trainingMaterials, setTrainingMaterials] = useState([]);
  const [submittedForms, setSubmittedForms] = useState([]);
  const [formSchemas, setFormSchemas] = useState({});
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [savedJobs, setSavedJobs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedJobsMap') || '{}'); }
    catch { return {}; }
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const activeTab = searchParams.get('section') || 'available';

  useEffect(() => {
    localStorage.setItem('savedJobsMap', JSON.stringify(savedJobs));
  }, [savedJobs]);

  const fetchFormSchemas = async (submissions) => {
    const uniqueFormIds = [...new Set(submissions.map((s) => s.form).filter(Boolean))];
    if (uniqueFormIds.length === 0) return;
    const results = await Promise.allSettled(
      uniqueFormIds.map((formId) => API.get('/jobs/forms/' + formId + '/'))
    );
    const schemas = {};
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        schemas[uniqueFormIds[idx]] = result.value.data;
      }
    });
    setFormSchemas(schemas);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        API.get('/jobs/available/'),
        API.get('/jobs/my-applications/'),
      ]);
      setJobs(jobsRes.data);
      setMyApplications(appsRes.data);
      const [contractsRes, trainingRes, submittedFormsRes] = await Promise.allSettled([
        API.get('/jobs/contracts/my/'),
        API.get('/jobs/training/my/'),
        getMySubmittedForms(),
      ]);
      if (contractsRes.status === 'fulfilled') setContracts(contractsRes.value.data);
      if (trainingRes.status === 'fulfilled') setTrainingMaterials(trainingRes.value.data);
      if (submittedFormsRes.status === 'fulfilled') {
        const forms = submittedFormsRes.value.data;
        setSubmittedForms(forms);
        fetchFormSchemas(forms);
      }
    } catch (err) {
      console.error('Failed to load participant dashboard', err);
    } finally {
      setLoading(false);
    }
    try {
      const invRes = await getMyInvitations();
      setInvitations(invRes.data);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const handleApply = async (jobId) => {
    try {
      await API.post('/jobs/' + jobId + '/apply/');
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to apply');
    }
  };

  const toggleSave = (job) => {
    setSavedJobs((prev) => {
      const next = { ...prev };
      if (next[job.id]) delete next[job.id];
      else next[job.id] = job;
      return next;
    });
  };

  const isApplied = (jobId) => myApplications.some((a) => a.job === jobId || a.job?.id === jobId);
  const getApplication = (jobId) => myApplications.find((a) => a.job === jobId || a.job?.id === jobId);
  const savedJobsList = Object.values(savedJobs);
  const approvedApplications = myApplications.filter((a) => a.status === 'approved');

  const stats = useMemo(() => ({
    openJobs: jobs.length,
    applications: myApplications.length,
    submittedForms: submittedForms.length,
  }), [jobs, myApplications, submittedForms]);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return jobs.filter((job) =>
      job.title?.toLowerCase().includes(q) || job.description?.toLowerCase().includes(q)
    );
  }, [jobs, searchQuery]);

  const resolveFormResponses = (submission) => {
    const data = submission.data || {};
    let fieldList = null;

    if (submission.form_fields) {
      const ff = submission.form_fields;
      if (Array.isArray(ff)) fieldList = ff;
      else if (Array.isArray(ff.fields)) fieldList = ff.fields;
    }

    if (!fieldList || fieldList.length === 0) {
      const schema = formSchemas[submission.form];
      if (schema) {
        if (Array.isArray(schema.fields_config?.fields)) fieldList = schema.fields_config.fields;
        else if (Array.isArray(schema.fields_config)) fieldList = schema.fields_config;
        else if (Array.isArray(schema.fields)) fieldList = schema.fields;
      }
    }

    if (Array.isArray(fieldList) && fieldList.length > 0) {
      return fieldList
        .map((field) => {
          const key = field.name || field.key || field.id || field.field_name;
          const label = field.label || field.question || field.title || field.text || key;
          if (!key || !label) return null;
          const raw = data[key];
          const answer = raw == null ? '' : Array.isArray(raw) ? raw.join(', ') : String(raw);
          return { label, answer };
        })
        .filter(Boolean);
    }

    return Object.entries(data)
      .map(([key, raw]) => {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return null;
        const answer = raw == null ? '' : Array.isArray(raw) ? raw.join(', ') : String(raw);
        return { label: key, answer };
      })
      .filter(Boolean);
  };

  const submittedFormsByJob = useMemo(() => {
    const map = {};
    submittedForms.forEach((submission) => {
      const jobId = submission.job_id != null ? submission.job_id : submission.job;
      if (!map[jobId]) {
        map[jobId] = {
          jobId,
          jobTitle: submission.job_title || ('Job #' + jobId),
          submissions: [],
        };
      }
      map[jobId].submissions.push(submission);
    });
    return Object.values(map);
  }, [submittedForms]);

  // ── Shared row renderer ───────────────────────────────────────────────────
  const renderRow = (index, total, left, right) => (
    <div
      key={index}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        padding: '16px 20px',
        background: index % 2 === 0 ? 'var(--surface)' : 'var(--surface-muted)',
        borderBottom: index < total - 1 ? '1px solid var(--border-card)' : 'none',
      }}
    >
      {/* row number */}
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
          marginTop: '3px',
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
      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
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

  // ── Deadline badge (dark-mode safe) ───────────────────────────────────────
  const DeadlineBadge = ({ deadline, accentColor = 'danger' }) => {
    const date = deadline ? new Date(deadline).toLocaleDateString() : null;
    const isDanger = accentColor === 'danger';
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        marginTop: '8px',
        padding: '4px 10px',
        borderRadius: '6px',
        background: date
          ? (isDanger ? 'var(--danger-bg)' : 'var(--primary-subtle)')
          : 'var(--surface-muted)',
        border: `1px solid ${date
          ? (isDanger ? 'var(--border-danger)' : 'var(--border-accent)')
          : 'var(--border-card)'}`,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke={date ? (isDanger ? 'var(--danger)' : 'var(--primary)') : 'var(--muted)'}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span style={{ fontSize: '12px', color: date ? (isDanger ? 'var(--danger)' : 'var(--primary)') : 'var(--muted)' }}>
          Deadline:
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: date ? (isDanger ? 'var(--danger)' : 'var(--primary)') : 'var(--muted)' }}>
          {date || 'No deadline'}
        </span>
      </div>
    );
  };

  // ── Job left column (shared between Available and Saved) ──────────────────
  const JobLeftCol = ({ job, accentColor = 'danger' }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginBottom: '4px',
      }}>
        {job.title}
      </div>
      <div style={{
        fontSize: '13px',
        color: 'var(--muted)',
        lineHeight: 1.5,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {job.description || ''}
      </div>
      <DeadlineBadge deadline={job.deadline} accentColor={accentColor} />
    </div>
  );

  // ── Available Jobs ────────────────────────────────────────────────────────
  const renderAvailableJobs = () => {
    const list = filteredJobs;
    if (list.length === 0) return emptyState('No available jobs found.');
    return listContainer(
      list.map((job, index) => {
        const applied = isApplied(job.id);
        const app = getApplication(job.id);
        return renderRow(
          index,
          list.length,
          <JobLeftCol job={job} accentColor="danger" />,
          rowActions(
            <button
              className={'bookmark-button' + (savedJobs[job.id] ? ' active' : '')}
              type="button"
              title={savedJobs[job.id] ? 'Remove saved job' : 'Save job'}
              onClick={() => toggleSave(job)}
              style={{ flexShrink: 0 }}
            >
              <Icon name="bookmark" size={16} fill={savedJobs[job.id] ? 'currentColor' : 'none'} />
            </button>,
            applied ? (
              <>
                <span className={'pill ' + statusClass(app?.status)}>{app?.status || 'pending'}</span>
                {app?.status === 'approved' && (
                  <button
                    className="btn btn-primary"
                    type="button"
                    style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
                    onClick={() => navigate('/participant/jobs/' + job.id)}
                  >
                    Open Job
                  </button>
                )}
              </>
            ) : (
              <button
                className="btn btn-primary"
                type="button"
                style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
                onClick={() => handleApply(job.id)}
              >
                Apply Now
              </button>
            )
          )
        );
      })
    );
  };

  // ── My Jobs (approved) ────────────────────────────────────────────────────
  const renderMyJobs = () => {
    if (approvedApplications.length === 0) return emptyState('No approved jobs yet.');
    return listContainer(
      approvedApplications.map((app, index) =>
        renderRow(
          index,
          approvedApplications.length,
          rowTitle(app.job?.title, 'Approved and ready to continue.'),
          rowActions(
            <span className="pill success">approved</span>,
            <button
              className="btn btn-primary"
              type="button"
              style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
              onClick={() => navigate('/participant/jobs/' + app.job?.id)}
            >
              Open Job
            </button>
          )
        )
      )
    );
  };

  // ── Applications ──────────────────────────────────────────────────────────
  const renderApplications = () => {
    if (myApplications.length === 0) return emptyState('You have not applied to any jobs yet.');
    return listContainer(
      myApplications.map((app, index) =>
        renderRow(
          index,
          myApplications.length,
          rowTitle(app.job?.title, 'Application status'),
          rowActions(
            <span className={'pill ' + statusClass(app.status)}>{app.status}</span>,
            app.status === 'approved' && (
              <button
                className="btn btn-primary"
                type="button"
                style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
                onClick={() => navigate('/participant/jobs/' + app.job?.id)}
              >
                Open Job
              </button>
            )
          )
        )
      )
    );
  };

  // ── Invitations ───────────────────────────────────────────────────────────
  const renderInvitations = () => {
    if (invitations.length === 0) return emptyState('No invitations yet.');
    return listContainer(
      invitations.map((inv, index) =>
        renderRow(
          index,
          invitations.length,
          rowTitle(inv.job?.title, inv.message || 'Invitation from client'),
          rowActions(
            <span className={'pill ' + statusClass(inv.status)}>{inv.status}</span>,
            inv.status === 'pending' ? (
              <>
                <button
                  className="btn btn-primary"
                  type="button"
                  style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
                  onClick={async () => { await respondInvitation(inv.id, { action: 'accept' }); fetchData(); }}
                >
                  Accept
                </button>
                <button
                  className="btn btn-danger"
                  type="button"
                  style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
                  onClick={async () => { await respondInvitation(inv.id, { action: 'reject' }); fetchData(); }}
                >
                  Reject
                </button>
              </>
            ) : inv.status === 'accepted' ? (
              <button
                className="btn btn-primary"
                type="button"
                style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
                onClick={() => navigate('/participant/jobs/' + inv.job?.id)}
              >
                Open Job
              </button>
            ) : null
          )
        )
      )
    );
  };

  // ── Contracts ─────────────────────────────────────────────────────────────
  const renderContracts = () => {
    if (contracts.length === 0) return emptyState('No contracts yet.');
    return listContainer(
      contracts.map((contract, index) => {
        const signed = contract.signed;
        const sub = signed
          ? 'Signed ' + (contract.signed_at ? new Date(contract.signed_at).toLocaleString() : '')
          : 'Awaiting signature';
        return renderRow(
          index,
          contracts.length,
          rowTitle(contract.job_title || ('Job #' + contract.job), sub),
          rowActions(
            <span className={'pill ' + (signed ? 'success' : 'warning')}>{signed ? 'Signed' : 'Pending'}</span>,
            <button
              className="btn btn-primary"
              type="button"
              style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
              onClick={() => navigate('/participant/contracts/' + contract.id)}
            >
              View Contract
            </button>
          )
        );
      })
    );
  };

  // ── Training Materials ────────────────────────────────────────────────────
  const renderTraining = () => {
    if (trainingMaterials.length === 0) return emptyState('No accessible training materials yet. Sign your contract first.');
    return listContainer(
      trainingMaterials.map((mat, index) => {
        const sub = (mat.job_title || ('Job #' + mat.job)) + ' · Uploaded ' + (mat.uploaded_at ? new Date(mat.uploaded_at).toLocaleDateString() : 'recently');
        return renderRow(
          index,
          trainingMaterials.length,
          rowTitle(mat.title, sub),
          rowActions(
            <a
              className="btn btn-secondary"
              href={'http://127.0.0.1:8000' + mat.file}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
            >
              Download
            </a>,
            <button
              className="btn btn-primary"
              type="button"
              style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
              onClick={() => navigate('/participant/jobs/' + mat.job + '/training')}
            >
              Open Training
            </button>
          )
        );
      })
    );
  };

  // ── Submitted Forms ───────────────────────────────────────────────────────
  const renderSubmittedForms = () => {
    if (submittedFormsByJob.length === 0) return emptyState('No submitted forms yet.');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {submittedFormsByJob.map((jobGroup) => {
          const { jobId, jobTitle, submissions } = jobGroup;
          const isExpanded = expandedJobId === jobId;
          const latestSubmission = submissions[submissions.length - 1];
          const submittedAt = latestSubmission.submitted_at
            ? new Date(latestSubmission.submitted_at).toLocaleString()
            : 'recently';
          const sub = submissions.length === 1
            ? ('Submitted ' + submittedAt)
            : (submissions.length + ' submissions · Last submitted ' + submittedAt);

          return (
            <div key={jobId} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
              {/* header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'var(--surface)' }}>
                <div style={{ width: '26px', height: '26px', flexShrink: 0, borderRadius: '50%', background: 'var(--primary-subtle)', border: '1px solid var(--border-accent)', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 650, color: 'var(--primary)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                {rowTitle(jobTitle, sub)}
                {rowActions(
                  <span className="pill success">Submitted</span>,
                  <button
                    className="btn btn-primary"
                    type="button"
                    style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
                    onClick={() => setExpandedJobId((prev) => prev === jobId ? null : jobId)}
                  >
                    {isExpanded ? 'Hide Responses' : 'View Responses'}
                  </button>
                )}
              </div>

              {/* expanded responses */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border-card)', background: 'var(--surface-muted)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {submissions.map((submission, idx) => {
                    const responses = resolveFormResponses(submission);
                    const ts = submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : null;
                    return (
                      <div key={submission.id}>
                        {submissions.length > 1 && (
                          <p style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                            {'Submission ' + (idx + 1)}{ts ? ' · ' + ts : ''}
                          </p>
                        )}
                        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                          {responses.length === 0 ? (
                            <p style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic' }}>No responses recorded.</p>
                          ) : (
                            responses.map((item, i) => (
                              <div
                                key={item.label}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1.5fr',
                                  gap: '0.5rem 1rem',
                                  alignItems: 'start',
                                  padding: '11px 16px',
                                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-muted)',
                                  borderBottom: i < responses.length - 1 ? '1px solid var(--border-card)' : 'none',
                                }}
                              >
                                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.4 }}>
                                  {item.label}
                                </span>
                                <span style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                                  {item.answer || <em style={{ color: 'var(--muted)' }}>No answer</em>}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Saved Jobs ────────────────────────────────────────────────────────────
  const renderSavedJobs = () => {
    if (savedJobsList.length === 0) return emptyState('No saved jobs yet.');
    return listContainer(
      savedJobsList.map((job, index) => {
        const applied = isApplied(job.id);
        const app = getApplication(job.id);
        return renderRow(
          index,
          savedJobsList.length,
          <JobLeftCol job={job} accentColor="primary" />,
          rowActions(
            <button
              className="bookmark-button active"
              type="button"
              title="Remove saved job"
              onClick={() => toggleSave(job)}
              style={{ flexShrink: 0 }}
            >
              <Icon name="bookmark" size={16} fill="currentColor" />
            </button>,
            applied ? (
              <>
                <span className={'pill ' + statusClass(app?.status)}>{app?.status || 'pending'}</span>
                {app?.status === 'approved' && (
                  <button
                    className="btn btn-primary"
                    type="button"
                    style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
                    onClick={() => navigate('/participant/jobs/' + job.id)}
                  >
                    Open Job
                  </button>
                )}
              </>
            ) : (
              <button
                className="btn btn-primary"
                type="button"
                style={{ fontSize: '14px', minHeight: '34px', padding: '0 16px', flexShrink: 0 }}
                onClick={() => handleApply(job.id)}
              >
                Apply Now
              </button>
            )
          )
        );
      })
    );
  };

  // ── Tab content dispatcher ────────────────────────────────────────────────
  const renderContent = () => {
    if (loading) return emptyState('Loading...');
    switch (activeTab) {
      case 'available':      return renderAvailableJobs();
      case 'myJobs':         return renderMyJobs();
      case 'applications':   return renderApplications();
      case 'invitations':    return renderInvitations();
      case 'contracts':      return renderContracts();
      case 'training':       return renderTraining();
      case 'submittedForms': return renderSubmittedForms();
      default:               return renderSavedJobs();
    }
  };

  return (
    <>
      {/* ── Page heading ── */}
      <div className="page-title" style={{ justifyContent: 'space-between', maxWidth: 'none' }}>
  <div>
    <h2>Welcome back, {user?.username || 'Participant'}</h2>
    <p>Find open jobs, track applications, respond to invitations, and continue approved work.</p>
  </div>
  <input
    className="search-field"
    placeholder="Search jobs..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    style={{ border: '1.5px solid var(--border-subtle)', flexShrink: 0 }}
  />
</div>

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
                  width: '34px',
                  height: '34px',
                  flexShrink: 0,
                  borderRadius: 'var(--radius)',
                  background: 'var(--primary-subtle)',
                  border: '1px solid var(--border-accent)',
                  display: 'grid',
                  placeItems: 'center',
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
            <h2>
              {activeTab === 'available'      && 'Available Jobs'}
              {activeTab === 'myJobs'         && 'My Jobs'}
              {activeTab === 'applications'   && 'My Applications'}
              {activeTab === 'invitations'    && 'Invitations'}
              {activeTab === 'contracts'      && 'Contracts'}
              {activeTab === 'training'       && 'Training Materials'}
              {activeTab === 'submittedForms' && 'Submitted Forms'}
              {activeTab === 'saved'          && 'Saved Jobs'}
            </h2>
            <p>
              {activeTab === 'available'      && 'Browse and apply to open positions.'}
              {activeTab === 'myJobs'         && 'Your approved and active jobs.'}
              {activeTab === 'applications'   && 'Track the status of your applications.'}
              {activeTab === 'invitations'    && 'Respond to direct invitations from clients.'}
              {activeTab === 'contracts'      && 'View and sign your job contracts.'}
              {activeTab === 'training'       && 'Access materials for your active jobs.'}
              {activeTab === 'submittedForms' && 'Review your submitted requirement forms.'}
              {activeTab === 'saved'          && 'Jobs you have bookmarked for later.'}
            </p>
          </div>
        </div>
        {renderContent()}
      </section>
    </>
  );
};

export default ParticipantDashboard;