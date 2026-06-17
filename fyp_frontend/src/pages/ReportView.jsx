import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateReport, getReport, updateReport, exportReport } from '../services/api';

const ReportView = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedReport, setEditedReport] = useState(null);
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(null); // 'pdf' | 'docx' | 'csv' | null
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await getReport(jobId);
        setReport(res.data.report);
        setEditedReport(res.data.report);
      } catch {
        // Report may not exist yet.
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [jobId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const res = await generateReport(jobId);
      setReport(res.data.report);
      setEditedReport(res.data.report);
      setMessage('Report generated successfully.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to generate report. Run NLP first.');
    } finally {
      setGenerating(false);
    }
  };

  const EXPORT_MIME_TYPES = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    csv: 'text/csv',
  };

  const parseExportError = async (error, format) => {
    let message = 'Export to ' + format.toUpperCase() + ' failed.';
    const data = error?.response?.data;

    if (data instanceof Blob) {
      try {
        const text = await data.text();
        const payload = JSON.parse(text);
        if (payload?.error) message = payload.error;
      } catch {
        // Keep default message when the error body is not JSON.
      }
    } else if (data?.error) {
      message = data.error;
    } else if (error?.message) {
      message = error.message;
    }

    return message;
  };

  // ── PDF / DOCX / CSV export via backend ─────────────────────────────
  const handleServerExport = async (format) => {
    if (!report) {
      setMessage('Generate a report before exporting.');
      return;
    }

    setExporting(format);
    setMessage('');
    try {
      const response = await exportReport(jobId, format);
      const contentType = response.headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        const text = await response.data.text();
        const payload = JSON.parse(text);
        throw new Error(payload?.error || 'Export failed.');
      }

      const mimeType = EXPORT_MIME_TYPES[format] || 'application/octet-stream';
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: mimeType });

      if (blob.size === 0) {
        throw new Error('Received an empty file from the server.');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        (report?.job_title || 'report').replace(/\s+/g, '_') + '_requirements.' + format;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(await parseExportError(err, format));
    } finally {
      setExporting(null);
    }
  };

  const handleStartEdit = () => {
    setEditedReport(JSON.parse(JSON.stringify(report)));
    setEditing(true);
    setMessage('');
  };

  const handleCancelEdit = () => {
    setEditedReport(report);
    setEditing(false);
    setMessage('');
  };

  const handleSave = async () => {
    if (!editedReport) return;

    setSaving(true);
    setMessage('');
    try {
      const res = await updateReport(jobId, editedReport);
      setReport(res.data.report);
      setEditedReport(res.data.report);
      setEditing(false);
      setMessage('Report saved successfully.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to save report.');
    } finally {
      setSaving(false);
    }
  };

  // ── Inline edit helpers ──────────────────────────────────────────────

  const updateReportText = (value) => {
    const updated = JSON.parse(JSON.stringify(editedReport));
    if (!updated.polished_requirements) {
      updated.polished_requirements = {};
    }
    updated.polished_requirements.report_text = value;
    setEditedReport(updated);
  };

  // For old categorized_requirements fallback
  const updateCategoryReq = (catIdx, reqIdx, value) => {
    const updated = JSON.parse(JSON.stringify(editedReport));
    updated.categorized_requirements[catIdx].requirements[reqIdx] = value;
    setEditedReport(updated);
  };

  const updateCategoryName = (catIdx, value) => {
    const updated = JSON.parse(JSON.stringify(editedReport));
    updated.categorized_requirements[catIdx].category = value;
    setEditedReport(updated);
  };

  // For polished_requirements
  const updatePolishedReq = (catName, level, reqIdx, value) => {
    const updated = JSON.parse(JSON.stringify(editedReport));
    updated.polished_requirements.categories[catName][level][reqIdx] = value;
    setEditedReport(updated);
  };

  const updatePriorityReq = (level, reqIdx, value) => {
    const updated = JSON.parse(JSON.stringify(editedReport));
    updated.priorities[level][reqIdx] = value;
    setEditedReport(updated);
  };

  if (loading) return <div className="empty-state">Loading report...</div>;

  const data = editedReport || report;
  const reportText = data?.polished_requirements?.report_text || '';
  const fallbackUsed = Boolean(
    data?.polished_requirements?.fallback_used || data?.summary?.fallback_used
  );
  const hasPolished =
    Boolean(reportText) ||
    Object.keys(data?.polished_requirements?.categories || {}).length > 0;

  return (
    <>
      {/* ── Header ── */}
      <div className="page-title">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>Requirements Report</h2>
          <p>{report?.job_title || 'No report generated yet'}</p>
        </div>
        <div className="action-row">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>

          {report && (
            <>
              {editing ? (
                <>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={handleStartEdit}
                >
                  Edit Report
                </button>
              )}
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => handleServerExport('pdf')}
                disabled={exporting === 'pdf'}
              >
                {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => handleServerExport('docx')}
                disabled={exporting === 'docx'}
              >
                {exporting === 'docx' ? 'Exporting…' : 'Word'}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => handleServerExport('csv')}
                disabled={exporting === 'csv'}
              >
                {exporting === 'csv' ? 'Exporting…' : 'CSV'}
              </button>
            </>
          )}
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
      </div>

      {message && (
        <p className={'form-alert ' + (message.includes('successfully') ? 'success' : 'danger')}>
          {message}
        </p>
      )}

      {!report ? (
        <section className="data-panel workflow-panel">
          <span className="pill warning">Missing report</span>
          <h2>No report yet</h2>
          <p>Run NLP analysis first, then generate your report.</p>
          <button className="btn btn-primary" type="button" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Report'}
          </button>
        </section>
      ) : (
        <>
          {fallbackUsed && (
            <p className="form-alert warning">
              AI enhancement unavailable — report generated with basic formatting
            </p>
          )}

          {/* ── Summary stats ── */}
          <section className="stat-grid">
            <article className="stat-card">
              <span>Total Requirements</span>
              <strong>{data.summary?.total_requirements}</strong>
            </article>
            <article className="stat-card">
              <span>Categories</span>
              <strong>{data.summary?.total_categories}</strong>
            </article>
            <article className="stat-card">
              <span>High Priority</span>
              <strong>{data.summary?.high_priority_count}</strong>
            </article>
            <article className="stat-card">
              <span>Duplicates Found</span>
              <strong>{data.summary?.duplicates_found ?? 0}</strong>
            </article>
            {(data.summary?.low_quality_count ?? 0) > 0 && (
              <article className="stat-card">
                <span>Low Quality / Vague</span>
                <strong>{data.summary.low_quality_count}</strong>
              </article>
            )}
            {(data.summary?.spelling_corrections_count ?? 0) > 0 && (
              <article className="stat-card">
                <span>Spelling Fixed</span>
                <strong>{data.summary.spelling_corrections_count}</strong>
              </article>
            )}
          </section>

          {/* ── Keywords ── */}
          {(data.keywords?.length > 0) && (
            <section className="data-panel">
              <div className="section-heading-row">
                <div>
                  <h2>Keywords</h2>
                  <p>Most frequent meaningful terms identified by analysis.</p>
                </div>
              </div>
              <div className="chip-list">
                {data.keywords.map((keyword, i) => (
                  <span className="pill" key={i}>{keyword}</span>
                ))}
              </div>
            </section>
          )}

          {/* ── Polished Requirements (Groq AI) — or fallback ── */}
          {hasPolished ? (
            <section className="data-panel">
              <div className="section-heading-row">
                <div>
                  <h2>Polished Requirements</h2>
                  <p>
                    {fallbackUsed
                      ? 'Requirements formatted locally without AI enhancement.'
                      : 'AI-refined, categorized and prioritized by Groq.'}
                  </p>
                </div>
              </div>
              {reportText ? (
                editing ? (
                  <textarea
                    className="report-text-editor"
                    value={reportText}
                    onChange={(e) => updateReportText(e.target.value)}
                    rows={24}
                    style={{ width: '100%', fontFamily: 'inherit', lineHeight: 1.6 }}
                  />
                ) : (
                  <div
                    className="report-list"
                    style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6 }}
                  >
                    {reportText}
                  </div>
                )
              ) : (
                <div className="item-list">
                  {Object.entries(data.polished_requirements.categories).map(([catName, priorities], catIdx) => (
                    <article className="list-item list-item-stack" key={catIdx}>
                      <h3>{catName}</h3>
                      {['high', 'medium', 'low'].map((level) =>
                        (priorities[level]?.length ?? 0) > 0 ? (
                          <div key={level} style={{ marginTop: '0.5rem' }}>
                            <span className={
                              'pill ' + (level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success')
                            }>
                              {level} priority
                            </span>
                            <div className="report-list">
                              {priorities[level].map((req, reqIdx) =>
                                editing ? (
                                  <textarea
                                    key={reqIdx}
                                    value={req}
                                    onChange={(e) => updatePolishedReq(catName, level, reqIdx, e.target.value)}
                                  />
                                ) : (
                                  <p key={reqIdx}>{req}</p>
                                )
                              )}
                            </div>
                          </div>
                        ) : null
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            // Fallback: old categorized_requirements
            <section className="data-panel">
              <div className="section-heading-row">
                <div>
                  <h2>Categorized Requirements</h2>
                  <p>Automatically grouped and labelled from form submissions.</p>
                </div>
              </div>
              <div className="item-list">
                {data.categorized_requirements?.map((cat, catIdx) => (
                  <article className="list-item list-item-stack" key={catIdx}>
                    {editing ? (
                      <div className="form-field">
                        <input
                          value={cat.category}
                          onChange={(e) => updateCategoryName(catIdx, e.target.value)}
                        />
                      </div>
                    ) : (
                      <h3>{cat.category}</h3>
                    )}
                    <div className="report-list">
                      {cat.requirements?.map((req, reqIdx) =>
                        editing ? (
                          <textarea
                            key={reqIdx}
                            value={req}
                            onChange={(e) => updateCategoryReq(catIdx, reqIdx, e.target.value)}
                          />
                        ) : (
                          <p key={reqIdx}>{req}</p>
                        )
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ── Priority breakdown — only show if no polished data ── */}
          {!hasPolished && (
            <section className="data-panel">
              <div className="section-heading-row">
                <div>
                  <h2>Priority Breakdown</h2>
                  <p>Requirements grouped by urgency signals in the text.</p>
                </div>
              </div>
              <div className="module-grid">
                {['high', 'medium', 'low'].map((level) =>
                  (data.priorities?.[level]?.length ?? 0) > 0 ? (
                    <article className="surface-card module-card" key={level}>
                      <span className={'pill ' + (level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success')}>
                        {level} priority
                      </span>
                      <div className="report-list">
                        {data.priorities[level].map((req, reqIdx) =>
                          editing ? (
                            <textarea
                              key={reqIdx}
                              value={req}
                              onChange={(e) => updatePriorityReq(level, reqIdx, e.target.value)}
                            />
                          ) : (
                            <p key={reqIdx}>{req}</p>
                          )
                        )}
                      </div>
                    </article>
                  ) : null
                )}
              </div>
            </section>
          )}

          {/* ── MCQ statistics ── */}
          {Object.keys(data.mcq_statistics || {}).length > 0 && (
            <section className="data-panel">
              <div className="section-heading-row">
                <div>
                  <h2>MCQ / Choice Question Results</h2>
                  <p>
                    These are vote tallies from multiple-choice questions — not functional
                    requirements, but useful for understanding preferences.
                  </p>
                </div>
              </div>
              <div className="item-list">
                {Object.entries(data.mcq_statistics).map(([question, stats], idx) => (
                  <article className="list-item list-item-stack" key={idx}>
                    <h3>{question}</h3>
                    <p className="text-muted">
                      {stats.total_responses} response{stats.total_responses !== 1 ? 's' : ''}
                      {stats.top_choice ? ' · Top choice: "' + stats.top_choice + '"' : ''}
                    </p>
                    <div className="mcq-bars">
                      {Object.entries(stats.options || {})
                        .sort(([, a], [, b]) => b - a)
                        .map(([option, count]) => {
                          const pct = stats.total_responses
                            ? Math.round((count / stats.total_responses) * 100)
                            : 0;
                          return (
                            <div className="mcq-bar-row" key={option}>
                              <span className="mcq-label">{option}</span>
                              <div className="mcq-bar-track">
                                <div className="mcq-bar-fill" style={{ width: pct + '%' }} />
                              </div>
                              <span className="mcq-count">{count} ({pct}%)</span>
                            </div>
                          );
                        })}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ── Low quality requirements ── */}
          {(data.low_quality_requirements?.length ?? 0) > 0 && (
            <section className="data-panel">
              <div className="section-heading-row">
                <div>
                  <h2>Low Quality / Ambiguous Responses</h2>
                  <p>
                    These responses were too vague to categorise as actionable requirements.
                    Consider following up with respondents for clarification.
                  </p>
                </div>
              </div>
              <div className="item-list">
                {data.low_quality_requirements.map((req, idx) => (
                  <article className="list-item" key={idx}>
                    <span className="pill warning">Vague</span>
                    <p>{req}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ── Spelling corrections ── */}
          {Object.keys(data.spelling_corrections || {}).length > 0 && (
            <section className="data-panel">
              <div className="section-heading-row">
                <div>
                  <h2>Spelling Corrections Applied</h2>
                  <p>These typos were automatically corrected before NLP processing.</p>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Original</th>
                    <th>Corrected</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.spelling_corrections).map(([original, corrected]) => (
                    <tr key={original}>
                      <td><span className="pill danger">{original}</span></td>
                      <td><span className="pill success">{corrected}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ── Duplicates ── */}
          {(data.duplicates_removed?.length ?? 0) > 0 && (
            <section className="data-panel">
              <div className="section-heading-row">
                <div>
                  <h2>Duplicate Requirements Detected</h2>
                  <p>These pairs were found to be semantically very similar.</p>
                </div>
              </div>
              <div className="item-list">
                {data.duplicates_removed.map((dup, idx) => (
                  <article className="list-item list-item-stack" key={idx}>
                    <p>{dup.req1}</p>
                    <p className="text-muted">
                      {Math.round(dup.similarity * 100)}% similar to: {dup.req2}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
};

export default ReportView;