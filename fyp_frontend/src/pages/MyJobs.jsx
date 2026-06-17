import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyJobs } from '../services/api';
import API from '../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isDeadlinePassed = (deadline) => {
  if (!deadline) return false;
  return new Date(deadline) < new Date(new Date().toDateString());
};

const statusConfig = (status, deadline) => {
  if (status === 'open' && isDeadlinePassed(deadline)) {
    return { cls: 'danger', label: 'Closed', dot: 'var(--muted)', color: 'var(--muted)' };
  }
  if (status === 'open')     return { cls: 'success', label: 'Open',     dot: 'var(--success)', color: 'var(--success)' };
  if (status === 'rejected') return { cls: 'danger',  label: 'Rejected', dot: 'var(--danger)',  color: 'var(--danger)'  };
  return                            { cls: 'warning', label: status,     dot: 'var(--accent)',  color: 'var(--accent)'  };
};

const modeLabel = (mode) => {
  if (!mode) return '—';
  return mode.charAt(0).toUpperCase() + mode.slice(1).replace(/_/g, ' ');
};

const modeChipStyle = (mode) => {
  if (!mode) return {};
  const m = mode.toLowerCase().replace(/_/g, '');
  if (m === 'external') return {
    background: 'color-mix(in srgb, var(--accent-sky) 13%, var(--surface))',
    border: '1px solid color-mix(in srgb, var(--accent-sky) 28%, var(--border))',
    color: '#0369a1',
  };
  if (m === 'internal') return {
    background: 'color-mix(in srgb, var(--accent-indigo) 12%, var(--surface))',
    border: '1px solid color-mix(in srgb, var(--accent-indigo) 26%, var(--border))',
    color: '#4338ca',
  };
  return {
    background: 'color-mix(in srgb, var(--navy) 8%, var(--surface))',
    border: '1px solid color-mix(in srgb, var(--navy) 12%, var(--border))',
    color: 'var(--navy-soft)',
  };
};

const GRID = '44px 2fr 1.1fr 0.9fr 1fr 1.5fr 1.2fr';
const COLS = ['#', 'Job', 'Deadline', 'Mode', 'Status', 'Rejection Reason', 'Actions'];

// ---------------------------------------------------------------------------
// Injected styles
// ---------------------------------------------------------------------------

const styleTag = `
@keyframes skPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.38; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes dialogIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.mj-row {
  animation: fadeUp .22s ease both;
}
.mj-manage-btn {
  display: inline-flex; align-items: center; gap: 5px;
  min-height: 34px; padding: 0 13px;
  border-radius: 9px;
  border: 1.5px solid var(--primary);
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 650; font-size: 12.5px; font-family: inherit;
  cursor: pointer; white-space: nowrap; transition: all .15s;
}
.mj-manage-btn:hover:not(:disabled) {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-primary-glow);
}
.mj-delete-btn {
  display: inline-flex; align-items: center; gap: 5px;
  min-height: 34px; padding: 0 12px;
  border-radius: 9px;
  border: 1.5px solid var(--danger);
  background: var(--danger);
  color: var(--on-primary);
  font-weight: 650; font-size: 12.5px; font-family: inherit;
  cursor: pointer; white-space: nowrap; transition: all .15s;
}
.mj-delete-btn:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
  transform: translateY(-1px);
}
.mj-manage-btn:disabled,
.mj-delete-btn:disabled { opacity: .55; cursor: not-allowed; }
.mj-row-wrap:hover { background: color-mix(in srgb, var(--primary) 3%, var(--surface)) !important; }

/* ── Delete dialog ── */
.mj-dialog-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: var(--overlay);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.mj-dialog {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow-lg);
  width: min(100%, 440px);
  padding: 28px 28px 24px;
  animation: dialogIn .18s ease both;
  font-family: var(--font);
}
.mj-dialog-icon {
  width: 48px; height: 48px; border-radius: 14px;
  background: color-mix(in srgb, var(--danger) 11%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--danger) 22%, var(--border));
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
}
.mj-dialog h3 {
  margin: 0 0 8px; font-size: 17px; font-weight: 700;
  color: var(--text-primary); line-height: 1.25;
}
.mj-dialog p {
  margin: 0 0 4px; font-size: 13.5px; color: var(--text-secondary);
  line-height: 1.6;
}
.mj-dialog-job-name {
  display: inline-block;
  margin: 8px 0 4px;
  padding: 5px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--primary) 8%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--primary) 18%, var(--border));
  color: var(--primary);
  font-weight: 650; font-size: 13px;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mj-dialog-warning {
  margin: 14px 0 0 !important;
  padding: 10px 12px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--danger) 18%, var(--border));
  color: var(--danger) !important;
  font-size: 12.5px !important;
  line-height: 1.5 !important;
}
.mj-dialog-actions {
  display: flex; gap: 10px; justify-content: flex-end;
  margin-top: 22px;
}
.mj-dialog-cancel {
  min-height: 38px; padding: 0 18px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-weight: 600; font-size: 13px; font-family: inherit;
  cursor: pointer; transition: all .15s;
}
.mj-dialog-cancel:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
  color: var(--primary);
}
.mj-dialog-confirm {
  min-height: 38px; padding: 0 18px;
  border-radius: 9px;
  border: 1.5px solid var(--danger);
  background: var(--danger);
  color: #fff;
  font-weight: 650; font-size: 13px; font-family: inherit;
  cursor: pointer; transition: all .15s;
  display: inline-flex; align-items: center; gap: 6px;
}
.mj-dialog-confirm:hover:not(:disabled) {
  background: #b91c1c; border-color: #b91c1c;
}
.mj-dialog-confirm:disabled,
.mj-dialog-cancel:disabled { opacity: .55; cursor: not-allowed; }
`;

// ---------------------------------------------------------------------------
// Delete Confirmation Dialog
// ---------------------------------------------------------------------------

const DeleteDialog = ({ job, isDeleting, onConfirm, onCancel }) => (
  <div className="mj-dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) onCancel(); }}>
    <div className="mj-dialog" role="dialog" aria-modal="true" aria-labelledby="del-dialog-title">
      <div className="mj-dialog-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </div>

      <h3 id="del-dialog-title">Delete Job</h3>
      <p>You are about to permanently delete:</p>
      <span className="mj-dialog-job-name">"{job.title}"</span>
      <p className="mj-dialog-warning">
        ⚠ This will also remove all linked applications, contracts, training materials, forms, and reports. This action cannot be undone.
      </p>

      <div className="mj-dialog-actions">
        <button className="mj-dialog-cancel" disabled={isDeleting} onClick={onCancel}>
          Cancel
        </button>
        <button className="mj-dialog-confirm" disabled={isDeleting} onClick={onConfirm}>
          {isDeleting
            ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> Deleting…</>
            : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Yes, delete</>
          }
        </button>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const StatusBadge = ({ status, deadline }) => {
  const { label, dot, color } = statusConfig(status, deadline);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 999,
      fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize',
      color,
      background: `color-mix(in srgb, ${dot} 12%, var(--surface))`,
      border: `1px solid color-mix(in srgb, ${dot} 24%, var(--border))`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {label}
    </span>
  );
};

const ModeChip = ({ mode }) => {
  const chipStyle = modeChipStyle(mode);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 600,
      fontFamily: 'var(--font)',
      ...chipStyle,
    }}>
      {modeLabel(mode)}
    </span>
  );
};

const DeadlineCell = ({ deadline, jobStatus }) => {
  if (!deadline) return <span style={{ color: 'var(--soft)', fontSize: 13, fontFamily: 'var(--font)' }}>No deadline</span>;
  const passed = isDeadlinePassed(deadline);
  const color = passed && jobStatus === 'open'
    ? 'var(--danger)'
    : passed
      ? 'var(--muted)'
      : 'var(--primary)';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color, fontFamily: 'var(--font)' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      {new Date(deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      {passed && jobStatus === 'open' && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
          background: 'color-mix(in srgb, var(--danger) 12%, var(--surface))',
          color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 22%, var(--border))',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          fontFamily: 'var(--font)',
        }}>Expired</span>
      )}
    </span>
  );
};

const SkeletonRows = () =>
  Array.from({ length: 4 }).map((_, i) => (
    <div key={i} style={{
      display: 'grid',
      gridTemplateColumns: GRID,
      gap: 0, padding: '16px 22px', alignItems: 'center',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--surface-2)', animation: 'skPulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.07}s` }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingRight: 12 }}>
        <div style={{ height: 13, width: '62%', borderRadius: 5, background: 'var(--surface-2)', animation: `skPulse 1.4s ease-in-out ${i * 0.07}s infinite` }} />
        <div style={{ height: 11, width: '88%', borderRadius: 5, background: 'var(--surface-2)', animation: `skPulse 1.4s ease-in-out ${i * 0.07}s infinite` }} />
      </div>
      <div style={{ height: 13, width: '55%', borderRadius: 5, background: 'var(--surface-2)', animation: `skPulse 1.4s ease-in-out ${i * 0.07}s infinite` }} />
      <div style={{ height: 13, width: '48%', borderRadius: 5, background: 'var(--surface-2)', animation: `skPulse 1.4s ease-in-out ${i * 0.07}s infinite` }} />
      <div style={{ height: 13, width: '44%', borderRadius: 5, background: 'var(--surface-2)', animation: `skPulse 1.4s ease-in-out ${i * 0.07}s infinite` }} />
      <div style={{ height: 13, width: '66%', borderRadius: 5, background: 'var(--surface-2)', animation: `skPulse 1.4s ease-in-out ${i * 0.07}s infinite` }} />
      <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
        <div style={{ height: 34, width: 80, borderRadius: 9, background: 'var(--surface-2)', animation: `skPulse 1.4s ease-in-out ${i * 0.07}s infinite` }} />
        <div style={{ height: 34, width: 65, borderRadius: 9, background: 'var(--surface-2)', animation: `skPulse 1.4s ease-in-out ${i * 0.07}s infinite` }} />
      </div>
    </div>
  ));

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const MyJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmJob, setConfirmJob] = useState(null); // job pending delete confirmation
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await getMyJobs();
        setJobs(res.data);
      } catch {
        console.error('Failed to fetch jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const handleDeleteClick = (job) => {
    setConfirmJob(job);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmJob) return;
    setDeletingId(confirmJob.id);
    try {
      await API.delete(`/jobs/${confirmJob.id}/delete/`);
      setJobs((prev) => prev.filter((item) => item.id !== confirmJob.id));
      setConfirmJob(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete job.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    if (deletingId) return; // don't close while in-flight
    setConfirmJob(null);
  };

  const summary = jobs.reduce((acc, job) => {
    const closed = job.status === 'open' && isDeadlinePassed(job.deadline);
    if (closed)                    acc.closed++;
    else if (job.status === 'open')     acc.open++;
    else if (job.status === 'pending')  acc.pending++;
    else if (job.status === 'rejected') acc.rejected++;
    return acc;
  }, { open: 0, closed: 0, pending: 0, rejected: 0 });

  return (
    <>
      <style>{styleTag}</style>

      {/* ── Delete confirmation dialog ── */}
      {confirmJob && (
        <DeleteDialog
          job={confirmJob}
          isDeleting={deletingId === confirmJob.id}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '0 0 5px', fontSize: 22, fontWeight: 700, color: 'var(--navy)', lineHeight: 1, fontFamily: 'var(--font)' }}>
            My Jobs
          </h2>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13.5, fontFamily: 'var(--font)' }}>
            Manage requirement jobs, review status, and open detailed workflows.
          </p>
        </div>

        {!loading && jobs.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {summary.open > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: 'var(--success)', background: 'color-mix(in srgb, var(--success) 11%, var(--surface))', border: '1px solid color-mix(in srgb, var(--success) 24%, var(--border))', fontFamily: 'var(--font)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
                {summary.open} Open
              </span>
            )}
            {summary.closed > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 9%, var(--surface))', border: '1px solid color-mix(in srgb, var(--danger) 22%, var(--border))', fontFamily: 'var(--font)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)' }} />
                {summary.closed} Closed
              </span>
            )}
            {summary.pending > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 11%, var(--surface))', border: '1px solid color-mix(in srgb, var(--accent) 24%, var(--border))', fontFamily: 'var(--font)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                {summary.pending} Pending
              </span>
            )}
            {summary.rejected > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 11%, var(--surface))', border: '1px solid color-mix(in srgb, var(--danger) 24%, var(--border))', fontFamily: 'var(--font)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)' }} />
                {summary.rejected} Rejected
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Main panel ──────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-soft)',
        overflow: 'hidden',
      }}>
        {!loading && jobs.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: GRID,
            gap: 0,
            padding: '11px 22px',
            background: 'color-mix(in srgb, var(--primary) 7%, var(--surface))',
            borderBottom: '1px solid color-mix(in srgb, var(--primary) 18%, var(--border))',
          }}>
            {COLS.map((h) => (
              <div key={h} style={{
                fontSize: 12, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em',
                color: 'var(--text)', fontFamily: 'var(--font)',
              }}>
                {h}
              </div>
            ))}
          </div>
        )}

        {loading && <SkeletonRows />}

        {!loading && jobs.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 12, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'color-mix(in srgb, var(--primary) 10%, var(--surface))', border: '1px solid color-mix(in srgb, var(--primary) 18%, var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="12"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
              </svg>
            </div>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 15, color: 'var(--text)', fontFamily: 'var(--font)' }}>No jobs yet</p>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13.5, fontFamily: 'var(--font)' }}>Create a job from the sidebar to begin.</p>
          </div>
        )}

        {!loading && jobs.map((job, idx) => {
          const isLast = idx === jobs.length - 1;
          const isDeleting = deletingId === job.id;
          const isHovered = hoveredId === job.id;

          return (
            <div
              key={job.id}
              className="mj-row mj-row-wrap"
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                gap: 0,
                padding: '15px 22px',
                alignItems: 'center',
                borderBottom: isLast ? 'none' : '1px solid var(--border)',
                background: isHovered ? 'color-mix(in srgb, var(--primary) 3%, var(--surface))' : 'var(--surface)',
                opacity: isDeleting ? 0.5 : 1,
                transition: 'background 150ms, opacity 200ms',
                animationDelay: `${idx * 0.04}s`,
              }}
              onMouseEnter={() => setHoveredId(job.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div style={{
                width: 26, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', flexShrink: 0,
                background: 'color-mix(in srgb, var(--primary) 10%, var(--surface-2))',
                border: '1px solid color-mix(in srgb, var(--primary) 20%, var(--border))',
                color: 'var(--primary)',
                fontSize: 11, fontWeight: 700, fontFamily: 'var(--font)',
              }}>
                {idx + 1}
              </div>

              <div style={{ minWidth: 0, paddingRight: 14 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font)', marginBottom: job.description ? 3 : 0 }}>
                  {job.title}
                </span>
                {job.description && (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontFamily: 'var(--font)' }}>
                    {job.description.length > 100 ? job.description.substring(0, 100) + '…' : job.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <DeadlineCell deadline={job.deadline} jobStatus={job.status} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                {job.crowdsourcing_mode
                  ? <ModeChip mode={job.crowdsourcing_mode} />
                  : <span style={{ color: 'var(--soft)', fontSize: 13 }}>—</span>
                }
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <StatusBadge status={job.status} deadline={job.deadline} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', paddingRight: 10 }}>
                {job.status === 'rejected' && job.rejection_reason ? (
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 200, fontFamily: 'var(--font)' }}>
                    {job.rejection_reason}
                  </p>
                ) : (
                  <span style={{ color: 'var(--soft)', fontSize: 13 }}>—</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
                <button
                  className="mj-manage-btn"
                  type="button"
                  disabled={isDeleting}
                  onClick={() => navigate(`/client/jobs/${job.id}`)}
                >
                  Manage Job
                </button>
                <button
                  className="mj-delete-btn"
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteClick(job)}
                >
                  {isDeleting ? 'Deleting…' : 'Delete Job'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default MyJobs;