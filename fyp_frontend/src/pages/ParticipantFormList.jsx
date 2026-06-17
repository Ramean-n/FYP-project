import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listPublishedForms } from '../services/api';

const ParticipantFormList = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await listPublishedForms(jobId);
        setForms(res.data);
      } catch {
        setError('Failed to load forms.');
      } finally {
        setLoading(false);
      }
    };
    fetchForms();
  }, [jobId]);

  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Requirement Submission</p>
          <h2>Available Forms</h2>
          <p>Select a published form and submit your requirements.</p>
        </div>
      </div>

      {error && <p className="form-alert danger">{error}</p>}

      <section className="data-panel">
        {loading ? (
          <div className="empty-state">Loading forms...</div>
        ) : forms.length === 0 ? (
          <div className="empty-state">
            <div><h3>No forms published yet</h3><p>The client has not published any requirement forms for this job.</p></div>
          </div>
        ) : (
          <div className="module-grid">
            {forms.map((form) => (
              <article className="surface-card module-card" key={form.id}>
                <span className="pill">{form.fields_config?.fields?.length || 0} questions</span>
                <h3>Form #{form.id}</h3>
                <p>{form.instructions}</p>
                <button className="btn btn-primary" type="button" onClick={() => navigate(`/participant/jobs/${jobId}/forms/${form.id}`)}>
                  Fill Form
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default ParticipantFormList;
