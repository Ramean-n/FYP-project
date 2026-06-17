import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { checkRequirementSubmission, submitRequirements, viewForm } from '../services/api';

const ParticipantFormFill = () => {
  const { jobId, formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await viewForm(jobId, formId);
        setForm(res.data);
        const initial = {};
        res.data.fields_config?.fields?.forEach((field) => {
          initial[field.name] = field.type === 'rating' ? 0 : '';
        });
        setAnswers(initial);
        const statusRes = await checkRequirementSubmission(jobId, formId);
        setSubmitted(Boolean(statusRes.data?.submitted));
      } catch {
        setError('Form not available or not published yet.');
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [jobId, formId]);

  const handleChange = (name, value) => setAnswers((prev) => ({ ...prev, [name]: value }));

  const validateAnswers = () => {
    const fields = form?.fields_config?.fields || [];
    const hasAnyAnswer = fields.some((field) => {
      const value = answers[field.name];
      if (field.type === 'rating') return Number(value) > 0;
      return typeof value === 'string' ? value.trim() : value;
    });
    if (!hasAnyAnswer) return 'Please fill the form before submitting.';
    for (const field of fields) {
      if (!field.required) continue;
      const value = answers[field.name];
      if (field.type === 'rating' && Number(value) <= 0) return `Please answer: ${field.label}`;
      if (field.type !== 'rating' && (value === undefined || value === null || String(value).trim() === '')) return `Please answer: ${field.label}`;
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validationError = validateAnswers();
    if (validationError) return setError(validationError);
    setSubmitting(true);
    try {
      await submitRequirements(jobId, formId, { data: answers });
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Submission failed. Please try again.';
      if (msg === 'You have already submitted this form') setSubmitted(true);
      else setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const BackButton = () => (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => navigate(`/participant/jobs/${jobId}`)}
      style={{ fontSize: '14px', flexShrink: 0 }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      Back
    </button>
  );

  if (loading) return <div className="empty-state">Loading form...</div>;

  if (submitted) return (
    <section className="data-panel workflow-panel">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <BackButton />
      </div>
      <span className="pill success">Submitted</span>
      <h2>Requirements submitted</h2>
      <p>Your response has been saved successfully.</p>
      <button className="btn btn-primary" type="button" onClick={() => navigate(`/participant/jobs/${jobId}`)}>
        Back to Job
      </button>
    </section>
  );

  return (
    <>
      <div className="page-title" style={{ justifyContent: 'space-between', maxWidth: 'none' }}>
        <div>
          <p className="eyebrow">Requirement Submission</p>
          <h2>Fill Requirements Form</h2>
          <p>{form?.instructions}</p>
        </div>
        <BackButton />
      </div>

      {error && <p className="form-alert danger">{error}</p>}

      {form && (
        <section className="data-panel form-panel">
          <form onSubmit={handleSubmit}>
            {form.fields_config?.fields?.map((field, idx) => (
              <div key={field.name} className="question-block">
                <label>
                  Q{idx + 1}. {field.label}
                  {field.required && <span> *</span>}
                </label>

                {field.type === 'text' && (
                  <textarea
                    className="textarea-modern"
                    value={answers[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder="Type your answer here..."
                  />
                )}

                {(field.type === 'radio' || field.type === 'voting') && (
                  <div className="option-list">
                    {field.options?.map((option) => (
                      <label key={option} className="option-card">
                        <input type="radio" name={field.name} checked={answers[field.name] === option} onChange={() => handleChange(field.name, option)} />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'rating' && (
                  <div className="rating-row">
                    {[...Array(field.max || 5)].map((_, i) => (
                      <button key={i} type="button" className={i < (answers[field.name] || 0) ? 'active' : ''} onClick={() => handleChange(field.name, i + 1)}>
                        *
                      </button>
                    ))}
                    <span>{answers[field.name] ? `${answers[field.name]}/${field.max || 5}` : 'Click to rate'}</span>
                  </div>
                )}
              </div>
            ))}

            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Requirements'}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
};

export default ParticipantFormFill;