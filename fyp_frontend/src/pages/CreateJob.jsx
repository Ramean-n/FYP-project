import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob } from '../services/api';

const CreateJob = () => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    crowdsourcing_mode: 'external',
    contract_template: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const payload = { ...form };
    if (!payload.deadline) delete payload.deadline;

    try {
      await createJob(payload);
      setSuccess('Job created successfully and sent for admin approval.');
      setTimeout(() => navigate('/client/jobs'), 1200);
    } catch (err) {
      const errData = err.response?.data;
      setError(errData ? Object.values(errData).flat().join(' ') : 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-title">
        <div>
          <h2>Create Job</h2>
          <p>Set up a requirement elicitation job for admin approval.</p>
        </div>
      </div>

      <section className="data-panel form-panel">
        {error && <p className="form-alert danger">{error}</p>}
        {success && <p className="form-alert success">{success}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field form-field-wide">
              <label>Job Title</label>
              <input
                type="text"
                name="title"
                placeholder="Enter project title"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label>Deadline <span>(optional)</span></label>
              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label>Crowdsourcing Mode</label>
              <select name="crowdsourcing_mode" value={form.crowdsourcing_mode} onChange={handleChange}>
                <option value="external">External</option>
                <option value="internal">Internal</option>
              </select>
            </div>

            <div className="form-field form-field-wide">
              <label>Description</label>
              <textarea
                name="description"
                placeholder="Describe goals, target users, expected requirement areas, and any constraints."
                value={form.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field form-field-wide">
              <label>Contract Template <span>(optional)</span></label>
              <textarea
                name="contract_template"
                placeholder="Use placeholders like {{participant_name}}, {{participant_email}}, {{participant_phone}}, {{participant_cnic}}, {{job_title}}, {{deadline}}, and {{client_name}}."
                value={form.contract_template}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Job'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => navigate('/client/jobs')}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </>
  );
};

export default CreateJob;
