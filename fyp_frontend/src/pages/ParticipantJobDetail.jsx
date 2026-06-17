import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const ParticipantJobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [trainingDone, setTrainingDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const appsRes = await API.get('/jobs/my-applications/');
        const app = appsRes.data.find((a) => a.job?.id === parseInt(jobId));
        if (app?.contract) setContract(app.contract);

        try {
          const trainingRes = await API.get(`/jobs/${jobId}/training/`);
          const materials = trainingRes.data;
          setTrainingDone(materials.length === 0 || materials[0].training_completed_by?.includes(user?.id));
        } catch {
          setTrainingDone(true);
        }
      } catch {
        setError('Failed to load job details.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [jobId, user?.id]);

  if (loading) return <div className="empty-state">Loading workflow...</div>;

  const contractSigned = contract?.signed;
  const step = !contract ? 'no-contract' : !contractSigned ? 'sign-contract' : !trainingDone ? 'training' : 'form';
  const steps = [
    ['Sign Contract', contractSigned, step === 'sign-contract'],
    ['Complete Training', trainingDone, step === 'training'],
    ['Submit Requirements', false, step === 'form'],
  ];

  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Participant Workflow</p>
          <h2>Job Progress</h2>
          <p>Complete each step in order to submit requirements for this job.</p>
        </div>
      </div>

      {error && <p className="form-alert danger">{error}</p>}

      <div className="workflow-steps">
        {steps.map(([label, done, active], index) => (
          <div className={`workflow-step ${done ? 'done' : active ? 'active' : ''}`} key={label}>
            <span>{index + 1}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>

      <section className="data-panel workflow-panel">
        {step === 'no-contract' && (
          <>
            <h2>Waiting for Contract</h2>
            <p>The client has not created a contract for you yet. Check back later.</p>
          </>
        )}

        {step === 'sign-contract' && (
          <>
            <h2>Sign Contract</h2>
            <p>Review and sign the contract before accessing training materials.</p>
            <button className="btn btn-primary" type="button" onClick={() => navigate(`/participant/contracts/${contract.id}`)}>
              Review Contract
            </button>
          </>
        )}

        {step === 'training' && (
          <>
            <h2>Complete Training</h2>
            <p>Review the materials and mark training complete before filling requirement forms.</p>
            <button className="btn btn-primary" type="button" onClick={() => navigate(`/participant/jobs/${jobId}/training`)}>
              Open Training
            </button>
          </>
        )}

        {step === 'form' && (
          <>
            <h2>Requirement Forms</h2>
            <p>Select a published form and submit your requirements.</p>
            <button className="btn btn-primary" type="button" onClick={() => navigate(`/participant/jobs/${jobId}/forms`)}>
              View Forms
            </button>
          </>
        )}
      </section>
    </>
  );
};

export default ParticipantJobDetail;
