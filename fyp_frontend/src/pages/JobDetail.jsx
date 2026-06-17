import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getNLPResult,
  getReport,
  listForms,
  publishForm,
  runNLP,
  getFormSubmissions,
} from '../services/api';
import API from '../services/api';
import Icon from '../components/Icons';

// ---------------------------------------------------------------------------
// NLP Insights Helper
// ---------------------------------------------------------------------------

const countFromCategories = (categories) => {
  let high = 0;
  let medium = 0;
  let low = 0;

  Object.values(categories || {}).forEach((priorities) => {
    high += (priorities?.high || []).length;
    medium += (priorities?.medium || []).length;
    low += (priorities?.low || []).length;
  });

  return {
    high,
    medium,
    low,
    total: high + medium + low,
    categoryCount: Object.keys(categories || {}).length,
  };
};

const formatNLPInsights = (nlpResult) => {
  if (!nlpResult) return null;

  const stats = nlpResult.statistics || {};
  const categories = nlpResult.polished_requirements?.categories || {};
  const priorities = nlpResult.priorities || {};
  const categoryCounts = countFromCategories(categories);

  const priorityHigh = (priorities.high || []).length;
  const priorityMedium = (priorities.medium || []).length;
  const priorityLow = (priorities.low || []).length;
  const priorityTotal = priorityHigh + priorityMedium + priorityLow;

  const totalRequirements =
    stats.total_requirements ??
    (categoryCounts.total || priorityTotal || 0);
  const highPriority =
    stats.high_priority_count ??
    (categoryCounts.high || priorityHigh || 0);
  const mediumPriority =
    stats.medium_priority_count ??
    (categoryCounts.medium || priorityMedium || 0);
  const lowPriority =
    stats.low_priority_count ??
    (categoryCounts.low || priorityLow || 0);
  const totalCategories =
    stats.total_categories ??
    (categoryCounts.categoryCount || (totalRequirements > 0 ? 1 : 0));
  const duplicatesFound =
    stats.duplicates_found ??
    (Array.isArray(nlpResult.duplicates) ? nlpResult.duplicates.length : 0);
  const lowQualityCount = stats.low_quality_count ?? 0;
  const mcqQuestionsCount = stats.mcq_questions_count ?? 0;

  const rawKeywords = Array.isArray(nlpResult.keywords) ? nlpResult.keywords : [];
  const topKeywords = rawKeywords.slice(0, 10).filter(Boolean);

  const hasData =
    nlpResult.is_complete ||
    totalRequirements > 0 ||
    highPriority > 0 ||
    mediumPriority > 0 ||
    lowPriority > 0 ||
    topKeywords.length > 0;

  if (!hasData) return null;

  return {
    totalRequirements,
    highPriority,
    mediumPriority,
    lowPriority,
    totalCategories,
    duplicatesFound,
    lowQualityCount,
    mcqQuestionsCount,
    topKeywords,
    fallbackUsed: Boolean(
      stats.fallback_used ?? nlpResult.fallback_used ?? nlpResult.polished_requirements?.fallback_used
    ),
  };
};

// ---------------------------------------------------------------------------
// Tiny presentational sub-components
// ---------------------------------------------------------------------------

const InsightCard = ({ icon, title, value, sub, accent, style }) => (
  <div
    style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '0.75rem',
      padding: '1.1rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '3px',
        background: accent || 'var(--primary)',
        borderRadius: '3px 0 0 3px',
      }}
    />
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginLeft: '0.25rem' }}>
      {icon && (
        <span style={{ color: accent || 'var(--primary)', display: 'flex', alignItems: 'center' }}>
          <Icon name={icon} size={14} />
        </span>
      )}
      <span
        style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-muted)',
        }}
      >
        {title}
      </span>
    </div>
    <p
      style={{
        margin: '0.1rem 0 0 0.25rem',
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1.3,
      }}
    >
      {value}
    </p>
    {sub && (
      <p style={{ margin: '0 0 0 0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {sub}
      </p>
    )}
  </div>
);

const KeywordChip = ({ label }) => (
  <span
    style={{
      display: 'inline-block',
      background: 'var(--surface-accent)',
      color: 'var(--primary)',
      border: '1px solid var(--border-accent)',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      padding: '0.25rem 0.65rem',
      lineHeight: 1,
    }}
  >
    {label}
  </span>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const JobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const nlpSectionRef = useRef(null);

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [nlpResult, setNlpResult] = useState(null);
  const [report, setReport] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [publishingFormId, setPublishingFormId] = useState(null);
  const [message, setMessage] = useState('');
  const [contractTemplate, setContractTemplate] = useState('');
  const [contractForms, setContractForms] = useState({});
  const [trainingForm, setTrainingForm] = useState({ title: '', files: [] });
  const [trainingUploading, setTrainingUploading] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState('');

  const [responsesData, setResponsesData] = useState({});
  const [openResponseFormId, setOpenResponseFormId] = useState(null);
  const [responsesView, setResponsesView] = useState(null);

  const fetchData = async () => {
    try {
      const jobRes = await API.get('/jobs/my-jobs/');
      const foundJob = jobRes.data.find((j) => j.id === parseInt(jobId));
      setJob(foundJob);
      setContractTemplate(foundJob?.contract_template || '');

      const appRes = await API.get('/jobs/' + jobId + '/applications/');
      setApplications(appRes.data);

      try {
        const nlpRes = await getNLPResult(jobId);
        setNlpResult(nlpRes.data);
      } catch (err) {
        console.error('getNLPResult failed:', err.response?.status, err.response?.data);
      }

      try {
        const reportRes = await getReport(jobId);
        const reportData = reportRes.data?.report ?? reportRes.data ?? null;
        setReport(reportData && Object.keys(reportData).length > 0 ? reportData : null);
      } catch (err) {
        console.error('getReport failed:', err.response?.status, err.response?.data);
      }

      try {
        const formsRes = await listForms(jobId);
        setForms(formsRes.data);
      } catch (err) {
        console.error('listForms failed:', err.response?.status, err.response?.data);
      }
    } catch (err) {
      console.error('fetchData failed:', err.response?.status, err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [jobId]);

  // ---------------------------------------------------------------------------
  // Form Responses helpers
  // ---------------------------------------------------------------------------

  const fetchFormResponses = async (formId) => {
    setResponsesData((prev) => ({
      ...prev,
      [formId]: { submissions: [], schema: null, loading: true, error: '' },
    }));
    try {
      const submissionsRes = await getFormSubmissions(jobId, formId);
      const submissions = Array.isArray(submissionsRes.data) ? submissionsRes.data : [];

      const firstSub = submissions[0] || null;
      const schema = firstSub?.form_fields
        ? { fields_config: firstSub.form_fields }
        : null;

      setResponsesData((prev) => ({
        ...prev,
        [formId]: { submissions, schema, loading: false, error: '' },
      }));
    } catch (err) {
      console.error('fetchFormResponses failed:', err?.response?.status, err?.response?.data);
      setResponsesData((prev) => ({
        ...prev,
        [formId]: {
          submissions: [],
          schema: null,
          loading: false,
          error: 'Failed to load responses. ' + (err?.response?.status === 403 ? '(Permission denied)' : ''),
        },
      }));
    }
  };

  const handleOpenResponses = (formId) => {
    if (openResponseFormId === formId) {
      setOpenResponseFormId(null);
      setResponsesView(null);
      return;
    }
    setOpenResponseFormId(formId);
    setResponsesView('list');
    fetchFormResponses(formId);
  };

  const buildLabelMap = (schema) => {
    if (!schema) return {};
    const fieldList =
      schema.fields_config?.fields ||
      (Array.isArray(schema.fields_config) ? schema.fields_config : null) ||
      schema.fields ||
      [];
    const map = {};
    if (Array.isArray(fieldList)) {
      fieldList.forEach((field) => {
        const key = field.name || field.key || field.id || field.field_name;
        const label = field.label || field.question || field.title || field.text;
        if (key && label) map[key] = label;
      });
    }
    return map;
  };

  const resolveResponses = (submission, schema) => {
    const fieldList =
      schema?.fields_config?.fields ||
      (Array.isArray(schema?.fields_config) ? schema.fields_config : null) ||
      schema?.fields ||
      [];

    const data = submission.data || {};

    if (Array.isArray(fieldList) && fieldList.length > 0) {
      return fieldList
        .map((field) => {
          const key = field.name || field.key || field.id || field.field_name;
          const label = field.label || field.question || field.title || field.text;
          if (!key || !label) return null;
          const raw = data[key];
          const answer =
            raw == null
              ? ''
              : Array.isArray(raw)
              ? raw.join(', ')
              : String(raw);
          return { question: label, answer, type: field.type };
        })
        .filter(Boolean);
    }

    const labelMap = buildLabelMap(schema);
    return Object.entries(data)
      .map(([key, raw]) => {
        const label = labelMap[key] || key;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(label)) {
          return null;
        }
        const answer =
          raw == null ? '' : Array.isArray(raw) ? raw.join(', ') : String(raw);
        return { question: label, answer };
      })
      .filter(Boolean);
  };

  const getCandidateName = (submission) =>
    submission.participant_name ||
    submission.submitted_by_name ||
    submission.submitted_by ||
    submission.user_name ||
    submission.username ||
    (submission.participant && typeof submission.participant === 'object'
      ? submission.participant.full_name ||
        submission.participant.username ||
        submission.participant.email
      : null) ||
    (submission.participant
      ? 'Participant #' + submission.participant
      : 'Participant #' + submission.id);

  // ---------------------------------------------------------------------------
  // Responses panel renderer
  // ---------------------------------------------------------------------------

  const renderResponsesPanel = (form) => {
    const formId = form.id;
    const data = responsesData[formId];

    if (!data || data.loading) {
      return (
        <div style={{ padding: '1.25rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Loading responses...
        </div>
      );
    }

    if (data.error) {
      return (
        <div style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--danger)' }}>
          {data.error}
        </div>
      );
    }

    const { submissions, schema } = data;

    return (
      <div style={{
        marginTop: '0.75rem',
        border: '1px solid var(--border)',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        background: 'var(--surface)',
      }}>
        {/* Panel header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.7rem 1rem',
          background: 'var(--surface-secondary)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {typeof responsesView === 'object' && (
              <button
                type="button"
                onClick={() => setResponsesView('list')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'var(--primary-subtle)',
                  border: '1px solid var(--border-accent)',
                  cursor: 'pointer',
                  color: 'var(--primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '0.25rem',
                }}
              >
                <Icon name="chevron-left" size={14} />
                Back
              </button>
            )}
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {typeof responsesView === 'object'
                ? getCandidateName(responsesView.submission) + "'s Response"
                : 'Form Responses'}
            </span>
          </div>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: '999px',
            background: 'var(--surface-accent)',
            color: 'var(--primary)',
          }}>
            {submissions.length === 0
              ? 'No submissions'
              : `${submissions.length} ${submissions.length === 1 ? 'submission' : 'submissions'}`}
          </span>
        </div>

        {/* Candidate list */}
        {responsesView === 'list' && (
          submissions.length === 0 ? (
            <div style={{
              padding: '1.25rem 1rem',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}>
              No submissions yet for this form.
            </div>
          ) : (
            <div>
              {submissions.map((submission, idx) => {
                const name = getCandidateName(submission);
                const submittedAt = submission.submitted_at
                  ? new Date(submission.submitted_at).toLocaleDateString()
                  : null;
                return (
                  <div
                    key={submission.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.7rem 1rem',
                      borderBottom: idx === submissions.length - 1
                        ? 'none'
                        : '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: 'var(--on-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{
                          margin: 0,
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: 'var(--text-primary)',
                        }}>
                          {name}
                        </p>
                        {submittedAt && (
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {'Submitted ' + submittedAt}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* CHANGE: See Response → light blue */}
                    <button
                      type="button"
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.3rem 0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: 'var(--primary-subtle)',
                        color: 'var(--primary)',
                        border: '1px solid var(--border-accent)',
                        borderRadius: 'var(--radius)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        minHeight: '32px',
                      }}
                      onClick={() => setResponsesView({ submission })}
                    >
                      See Response
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Individual response detail */}
        {typeof responsesView === 'object' && (() => {
          const responses = resolveResponses(responsesView.submission, schema);
          return responses.length === 0 ? (
            <div style={{
              padding: '1.25rem 1rem',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
            }}>
              No responses recorded.
            </div>
          ) : (
            <div>
              {responses.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: idx === responses.length - 1
                      ? 'none'
                      : '1px solid var(--border)',
                  }}
                >
                  <p style={{
                    margin: '0 0 0.25rem 0',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--text-muted)',
                  }}>
                    {item.question}
                    {item.type === 'rating' && (
                      <span style={{ marginLeft: '0.4rem', fontWeight: 400, textTransform: 'none' }}>
                        (rating)
                      </span>
                    )}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    color: item.answer
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    fontStyle: item.answer ? 'normal' : 'italic',
                  }}>
                    {item.type === 'rating' && item.answer
                      ? `${item.answer} / 5`
                      : item.answer || 'No answer provided'}
                  </p>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Other handlers
  // ---------------------------------------------------------------------------

  const handleApproveReject = async (appId, action) => {
    try {
      await API.post('/jobs/applications/' + appId + '/decide/', { action });
      setMessage('Participant ' + action + 'd successfully.');
      setApplications((await API.get('/jobs/' + jobId + '/applications/')).data);
    } catch {
      setMessage('Action failed.');
    }
  };

  const handleCreateContract = async (participantId, fallbackContent = '') => {
    const content = contractForms[participantId] ?? fallbackContent;
    if (!content?.trim()) return setMessage('Please enter contract content.');
    try {
      await API.post('/jobs/' + jobId + '/contract/create/', { participant_id: participantId, content });
      setMessage('Contract created successfully.');
      setContractForms((prev) => ({ ...prev, [participantId]: '' }));
      setApplications((await API.get('/jobs/' + jobId + '/applications/')).data);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to create contract.');
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const res = await API.patch('/jobs/' + jobId + '/contract-template/', {
        contract_template: contractTemplate,
      });
      setJob(res.data.job);
      setMessage('Contract template saved. New approvals will use this template.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to save contract template.');
    }
  };

  const handleUploadTraining = async (e) => {
    e.preventDefault();
    if (trainingForm.files.length === 0 || !trainingForm.title.trim()) {
      setTrainingMessage('Title and at least one file are required.');
      return;
    }
    setTrainingUploading(true);
    setTrainingMessage('');
    try {
      await Promise.all(
        trainingForm.files.map((file) => {
          const formData = new FormData();
          const title =
            trainingForm.files.length === 1
              ? trainingForm.title
              : `${trainingForm.title} - ${file.name}`;
          formData.append('title', title);
          formData.append('file', file);
          return API.post('/jobs/' + jobId + '/training/upload/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        })
      );
      setTrainingMessage(
        `${trainingForm.files.length} training file${trainingForm.files.length === 1 ? '' : 's'} uploaded successfully.`
      );
      setTrainingForm({ title: '', files: [] });
      const input = document.getElementById('training-files');
      if (input) input.value = '';
    } catch (err) {
      setTrainingMessage(err.response?.data?.error || 'Upload failed.');
    } finally {
      setTrainingUploading(false);
    }
  };

  const handlePublishForm = async (formId) => {
    setPublishingFormId(formId);
    try {
      await publishForm(jobId, formId);
      setForms((prev) =>
        prev.map((f) => (f.id === formId ? { ...f, published: true } : f))
      );
      setMessage('Form published successfully.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to publish form.');
    } finally {
      setPublishingFormId(null);
    }
  };

  const handleRunNLP = async () => {
    setNlpLoading(true);
    setMessage('');
    try {
      const result = (await runNLP(jobId)).data;
      setNlpResult(result);
      if (result._cached) {
        setMessage('NLP is already up-to-date — no new submissions since last run.');
      } else {
        setMessage('AI insights generated successfully.');
      }
      setTimeout(() => {
        nlpSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err) {
      console.error('runNLP failed:', err.response?.status, err.response?.data);
      setMessage(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'NLP analysis failed. Please try again.'
      );
    } finally {
      setNlpLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // NLP insight card renderer
  // ---------------------------------------------------------------------------

  const renderNLPInsights = () => {
    const insights = formatNLPInsights(nlpResult);

    if (!insights) {
      return (
        <div
          className="empty-state"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '2rem 1rem',
          }}
        >
          <span style={{ fontSize: '1.75rem' }}></span>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
            Run NLP to generate insights from submissions
          </p>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Once participants have submitted requirements, AI analysis will surface patterns,
            keywords, and data quality signals.
          </p>
        </div>
      );
    }

    const {
      totalRequirements,
      highPriority,
      mediumPriority,
      lowPriority,
      totalCategories,
      duplicatesFound,
      lowQualityCount,
      mcqQuestionsCount,
      topKeywords,
      fallbackUsed,
    } = insights;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {fallbackUsed && (
          <p className="form-alert warning" style={{ margin: 0 }}>
            AI enhancement unavailable — stats computed from basic formatting.
          </p>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <InsightCard
            icon="file"
            title="Total Requirements"
            value={totalRequirements}
            sub={`Across ${totalCategories} categor${totalCategories === 1 ? 'y' : 'ies'}`}
            accent="var(--accent-indigo)"
          />
          <InsightCard
            icon="bolt"
            title="High Priority"
            value={highPriority}
            sub="Core workflow requirements"
            accent="var(--accent-red)"
          />
          <InsightCard
            icon="chart"
            title="Medium Priority"
            value={mediumPriority}
            sub="Important supporting requirements"
            accent="var(--accent-amber)"
          />
          <InsightCard
            icon="check"
            title="Low Priority"
            value={lowPriority}
            sub="Nice-to-have requirements"
            accent="var(--accent-emerald)"
          />
          <InsightCard
            icon="bookmark"
            title="Duplicates Found"
            value={duplicatesFound}
            sub={
              duplicatesFound === 0
                ? 'No duplicate requirements detected'
                : `${duplicatesFound} duplicate requirement${duplicatesFound === 1 ? '' : 's'} detected`
            }
            accent={duplicatesFound > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)'}
          />
          {lowQualityCount > 0 && (
            <InsightCard
              icon="info"
              title="Inferred / Vague"
              value={lowQualityCount}
              sub="Converted from ambiguous responses"
              accent="var(--accent-amber)"
            />
          )}
          {mcqQuestionsCount > 0 && (
            <InsightCard
              icon="chart"
              title="MCQ Questions"
              value={mcqQuestionsCount}
              sub="Choice questions analysed"
              accent="var(--accent-sky)"
            />
          )}
        </div>

        {topKeywords.length > 0 && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              padding: '1rem 1.25rem',
            }}
          >
            <p
              style={{
                margin: '0 0 0.65rem 0',
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
              }}
            >
              Top Keywords
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {topKeywords.map((kw, i) => (
                <KeywordChip key={i} label={kw} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------

  if (loading) return <div className="empty-state">Loading job details...</div>;

  const approvedApps = applications.filter((a) => a.status === 'approved');

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── 1. Job Header ─────────────────────────────────────────────── */}
      {/* CHANGE: Back button added to the right side of the header row */}
      <div className="page-title">
        <div>
          <p className="eyebrow">Client Workflow</p>
          <h2>{job?.title || 'Job Details'}</h2>
          <p>{job?.description}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span
            className={`pill ${
              job?.status === 'open'
                ? 'success'
                : job?.status === 'rejected'
                ? 'danger'
                : 'warning'
            }`}
          >
            {job?.status || 'unknown'}
          </span>
          <button
            className="btn btn-primary"
            type="button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => navigate(-1)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back
          </button>
        </div>
      </div>

      {message && <p className="form-alert success">{message}</p>}
      {job?.status === 'rejected' && job?.rejection_reason && (
        <p className="form-alert danger">Rejection reason: {job.rejection_reason}</p>
      )}

      {/* ── 2. Stats ──────────────────────────────────────────────────── */}
      <section className="stat-grid">
        <article className="stat-card">
          <span>Deadline</span>
          <strong className="stat-text">
            {job?.deadline ? new Date(job.deadline).toLocaleDateString() : 'None'}
          </strong>
        </article>
        <article className="stat-card">
          <span>Mode</span>
          <strong className="stat-text">{job?.crowdsourcing_mode}</strong>
        </article>
        <article className="stat-card">
          <span>Applications</span>
          <strong>{applications.length}</strong>
        </article>
      </section>

      {/* ── 3. Internal Participants ──────────────────────────────────── */}
      {job?.crowdsourcing_mode === 'internal' && (
        <section className="data-panel compact-panel">
          <div className="page-title">
            <div>
              <h2>Internal Participants</h2>
              <p>Invite selected participants to this job.</p>
            </div>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => navigate('/client/jobs/' + jobId + '/browse-participants')}
            >
              Browse Participants
            </button>
          </div>
        </section>
      )}

      {/* ── 4. Contract Template ──────────────────────────────────────── */}
      <section className="data-panel">
        <div className="section-heading-row">
          <div>
            <h2>Contract Template</h2>
            <p>Approved participants get a contract generated from this template automatically.</p>
          </div>
          <button className="btn btn-primary" type="button" onClick={handleSaveTemplate}>
            Save Template
          </button>
        </div>
        <div className="form-field">
          <label>Template Content</label>
          <textarea
            value={contractTemplate}
            onChange={(e) => setContractTemplate(e.target.value)}
            placeholder="Use placeholders: {{participant_name}}, {{participant_email}}, {{participant_phone}}, {{participant_cnic}}, {{job_title}}, {{deadline}}, {{client_name}}."
          />
        </div>
      </section>

      {/* ── 5. Applications ───────────────────────────────────────────── */}
      
      <section className="data-panel">
        <div className="section-heading-row">
          <div>
            <h2>Applications</h2>
            <p>Approve participants and create contracts for accepted applicants.</p>
          </div>
          <span className="pill">{applications.length}</span>
        </div>
        {applications.length === 0 ? (
          <div className="empty-state">No applications yet.</div>
        ) : (
          <div className="item-list">
            {applications.map((app) => (
              <article className="list-item list-item-stack" key={app.id}>
                <div className="split-row">
                  <div>
                    <h3>{app.participant?.username || app.participant}</h3>
                    <p>Application status</p>
                  </div>
                  <div className="action-row">
                    <span
                      className={`pill ${
                        app.status === 'approved'
                          ? 'success'
                          : app.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                      }`}
                    >
                      {app.status}
                    </span>
                    {app.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={() => handleApproveReject(app.id, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger"
                          type="button"
                          onClick={() => handleApproveReject(app.id, 'reject')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {app.status === 'approved' &&
                  (app.contract ? (
                    <div className="form-field">
                      <p className="form-alert success">
                        Contract generated.{' '}
                        {app.contract.signed
                          ? 'Signed by participant.'
                          : 'Waiting for participant signature.'}
                      </p>
                      {!app.contract.signed && (
                        <>
                          <label>Optional Participant Customization</label>
                          <textarea
                            value={contractForms[app.participant?.id] ?? app.contract.content}
                            onChange={(e) =>
                              setContractForms((prev) => ({
                                ...prev,
                                [app.participant?.id]: e.target.value,
                              }))
                            }
                          />
                          {/* CHANGE: btn-secondary → btn-primary */}
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() =>
                              handleCreateContract(app.participant?.id, app.contract.content)
                            }
                          >
                            Save Custom Contract
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="form-field">
                      <label>Contract Terms</label>
                      <textarea
                        placeholder="Enter contract terms for this participant..."
                        value={contractForms[app.participant?.id] || ''}
                        onChange={(e) =>
                          setContractForms((prev) => ({
                            ...prev,
                            [app.participant?.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => handleCreateContract(app.participant?.id)}
                      >
                        Create Contract
                      </button>
                    </div>
                  ))}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── 6. Training Material ──────────────────────────────────────── */}
      {approvedApps.length > 0 && (
        <section className="data-panel">
          <div className="section-heading-row">
            <div>
              <h2>Training Material</h2>
              <p>Upload onboarding material before participants submit requirements.</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleUploadTraining}>
            <div className="form-field">
              <label>Material Title</label>
              <input
                type="text"
                value={trainingForm.title}
                onChange={(e) => setTrainingForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Files</label>
              <div className="file-upload">
                <input
                  id="training-files"
                  type="file"
                  multiple
                  onChange={(e) =>
                    setTrainingForm((prev) => ({
                      ...prev,
                      files: Array.from(e.target.files || []),
                    }))
                  }
                />
                <label className="upload-dropzone" htmlFor="training-files">
                  <span className="upload-icon">
                    <Icon name="upload" size={20} />
                  </span>
                  <span className="upload-copy">
                    <strong>
                      {trainingForm.files.length
                        ? `${trainingForm.files.length} file${
                            trainingForm.files.length === 1 ? '' : 's'
                          } selected`
                        : 'Upload training files'}
                    </strong>
                    <span>PDF, document, image, or slide files can be selected together.</span>
                  </span>
                </label>
                {trainingForm.files.length > 0 && (
                  <ul className="upload-file-list">
                    {trainingForm.files.map((file) => (
                      <li key={file.name + '-' + file.size}>{file.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="form-actions form-field-wide">
              <button className="btn btn-primary" type="submit" disabled={trainingUploading}>
                {trainingUploading ? 'Uploading...' : 'Upload Material'}
              </button>
            </div>
          </form>
          {trainingMessage && (
            <p
              className={`form-alert ${
                trainingMessage.includes('successfully') ? 'success' : 'danger'
              }`}
            >
              {trainingMessage}
            </p>
          )}
        </section>
      )}

      {/* ── 7. Requirement Forms + Responses ──────────────────────────── */}
      <section className="data-panel">
        <div className="section-heading-row">
          <div>
            <h2>Requirement Forms</h2>
            <p>Create, edit, and publish questionnaires for approved participants.</p>
          </div>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => navigate('/client/jobs/' + jobId + '/create-form')}
          >
            Create Form
          </button>
        </div>
        {forms.length === 0 ? (
          <div className="empty-state">No forms created yet.</div>
        ) : (
          <div className="item-list">
            {forms.map((form) => (
              <article className="list-item list-item-stack" key={form.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <div>
                    <h3>{'Form #' + form.id}</h3>
                    <p>
                      {(form.fields_config?.fields?.length || 0) +
                        ' questions | Created ' +
                        new Date(form.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="action-row">
                    <span className={`pill ${form.published ? 'success' : 'warning'}`}>
                      {form.published ? 'Published' : 'Draft'}
                    </span>
                    {/* CHANGE: View Responses / Hide Responses → light blue */}
                    {form.published && (
                      <button
                        type="button"
                        style={{
                          fontSize: '0.82rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'var(--primary-subtle)',
                          color: 'var(--primary)',
                          border: '1px solid var(--border-accent)',
                          borderRadius: 'var(--radius)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '0 12px',
                          minHeight: '40px',
                        }}
                        onClick={() => handleOpenResponses(form.id)}
                      >
                        {openResponseFormId === form.id ? 'Hide Responses' : 'View Responses'}
                      </button>
                    )}
                    {/* CHANGE: Edit → light blue */}
                    <button
                      type="button"
                      style={{
                        background: 'var(--primary-subtle)',
                        color: 'var(--primary)',
                        border: '1px solid var(--border-accent)',
                        borderRadius: 'var(--radius)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '0 12px',
                        minHeight: '40px',
                        fontSize: '14px',
                      }}
                      onClick={() =>
                        navigate('/client/jobs/' + jobId + '/edit-form/' + form.id)
                      }
                    >
                      Edit
                    </button>
                    {!form.published && (
                      <button
                        className="btn btn-primary"
                        type="button"
                        disabled={publishingFormId === form.id}
                        onClick={() => handlePublishForm(form.id)}
                      >
                        {publishingFormId === form.id ? 'Publishing...' : 'Publish'}
                      </button>
                    )}
                  </div>
                </div>
                {openResponseFormId === form.id && renderResponsesPanel(form)}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── 8. NLP Analysis — AI Insights Dashboard ───────────────────── */}
      <section className="data-panel" ref={nlpSectionRef}>
        <div className="section-heading-row">
          <div>
            <h2>NLP Insights</h2>
            <p>NLP analysis of participant requirement submissions.</p>
          </div>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleRunNLP}
            disabled={nlpLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              minWidth: '100px',
              justifyContent: 'center',
            }}
          >
            {nlpLoading ? (
              <>
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid color-mix(in srgb, var(--on-primary) 35%, transparent)',
                    borderTopColor: 'var(--on-primary)',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                Analysing...
              </>
            ) : (
              <>
                Run NLP Analysis
              </>
            )}
          </button>
        </div>

        {renderNLPInsights()}
      </section>

      {/* ── 9. Report ─────────────────────────────────────────────────── */}
      <section className="data-panel">
        <div className="section-heading-row">
          <div>
            <h2>Report</h2>
            <p>View generated requirement report and exportable analysis.</p>
          </div>
          {/* CHANGE: btn-secondary → btn-primary */}
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => navigate('/client/jobs/' + jobId + '/report')}
          >
            View Report
          </button>
        </div>
        {report ? (
          <p className="form-alert success">
            {'Report is available for ' +
              (report.job_title || report.title || job?.title) +
              '.'}
          </p>
        ) : (
          <div className="empty-state">No report generated yet.</div>
        )}
      </section>
    </>
  );
};

export default JobDetail;