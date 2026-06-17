import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { completeTraining, getTrainingMaterial } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TrainingMaterial = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await getTrainingMaterial(jobId);
        setMaterials(res.data);
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCompleted(Boolean(res.data[0].training_completed_by?.includes(user?.id)));
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load training materials.');
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [jobId, user?.id]);

  const handleComplete = async () => {
    setCompleting(true);
    setError('');
    try {
      await completeTraining(jobId);
      setCompleted(true);
      setSuccess('Training marked as complete. You can now submit requirements.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark training as complete.');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <div className="empty-state">Loading materials...</div>;

  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Participant Workflow</p>
          <h2>Training Materials</h2>
          <p>Review all uploaded material before marking the training step complete.</p>
        </div>
      </div>

      {error && <p className="form-alert danger">{error}</p>}
      {success && <p className="form-alert success">{success}</p>}

      <section className="data-panel">
        {materials.length === 0 ? (
          <div className="empty-state">No training materials uploaded yet.</div>
        ) : (
          <div className="item-list">
            {materials.map((mat) => (
              <article className="list-item" key={mat.id}>
                <div>
                  <h3>{mat.title}</h3>
                  <p>Uploaded {mat.uploaded_at ? new Date(mat.uploaded_at).toLocaleDateString() : 'recently'}</p>
                </div>
                <a className="btn btn-secondary" href={`http://127.0.0.1:8000${mat.file}`} target="_blank" rel="noopener noreferrer">
                  Download
                </a>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="data-panel workflow-panel">
        {completed ? (
          <>
            <span className="pill success">Complete</span>
            <h2>Training complete</h2>
            <p>You can continue to requirement forms for this job.</p>
            <button className="btn btn-primary" type="button" onClick={() => navigate(`/participant/jobs/${jobId}/forms`)}>
              Continue to Forms
            </button>
          </>
        ) : (
          <>
            <span className="pill warning">Pending</span>
            <h2>Mark training as complete</h2>
            <p>Confirm that you have reviewed all available material above.</p>
            <button className="btn btn-primary" type="button" onClick={handleComplete} disabled={completing || materials.length === 0}>
              {completing ? 'Saving...' : 'Mark Complete'}
            </button>
          </>
        )}
      </section>
    </>
  );
};

export default TrainingMaterial;
