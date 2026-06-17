import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API, { createRequirementForm, getFormById, publishForm } from '../services/api';

const FIELD_TYPES = [
  { value: 'text', label: 'Text / Paragraph' },
  { value: 'radio', label: 'Multiple Choice' },
  { value: 'rating', label: 'Rating' },
  { value: 'voting', label: 'Voting' },
];

const defaultField = () => ({
  id: crypto.randomUUID(),
  type: 'text',
  label: '',
  required: true,
  options: ['Option 1', 'Option 2'],
  max: 5,
});

const CreateForm = () => {
  const { jobId, formId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(formId);
  const [instructions, setInstructions] = useState('');
  const [fields, setFields] = useState([defaultField()]);
  const [saving, setSaving] = useState(false);
  const [publishNow, setPublishNow] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingForm, setLoadingForm] = useState(isEditing);

  useEffect(() => {
    const loadExistingForm = async () => {
      try {
        const res = await getFormById(jobId, formId);
        const form = res.data;
        setInstructions(form.instructions || '');
        if (form.fields_config?.fields?.length) {
          setFields(form.fields_config.fields.map((field) => ({
            id: field.name || crypto.randomUUID(),
            type: field.type || 'text',
            label: field.label || '',
            required: field.required ?? true,
            options: field.options || ['Option 1', 'Option 2'],
            max: field.max || 5,
          })));
        }
      } catch {
        setError('Failed to load form.');
      } finally {
        setLoadingForm(false);
      }
    };
    if (isEditing) loadExistingForm();
  }, [formId, isEditing, jobId]);

  const updateField = (id, changes) => setFields((prev) => prev.map((field) => field.id === id ? { ...field, ...changes } : field));
  const addField = () => setFields((prev) => [...prev, defaultField()]);
  const removeField = (id) => setFields((prev) => prev.length === 1 ? prev : prev.filter((field) => field.id !== id));

  const moveField = (id, dir) => {
    setFields((prev) => {
      const idx = prev.findIndex((field) => field.id === id);
      const swap = idx + dir;
      if (swap < 0 || swap >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const addOption = (id) => {
    const field = fields.find((item) => item.id === id);
    updateField(id, { options: [...(field?.options || []), `Option ${(field?.options?.length || 0) + 1}`] });
  };

  const updateOption = (fieldId, idx, value) => {
    const field = fields.find((item) => item.id === fieldId);
    const options = [...(field?.options || [])];
    options[idx] = value;
    updateField(fieldId, { options });
  };

  const removeOption = (fieldId, idx) => {
    const field = fields.find((item) => item.id === fieldId);
    const options = field?.options?.filter((_, i) => i !== idx) || [];
    updateField(fieldId, { options });
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!instructions.trim()) return setError('Please add form instructions.');
    for (const field of fields) {
      if (!field.label.trim()) return setError('All questions need a label.');
      if (['radio', 'voting'].includes(field.type) && field.options.length < 2) return setError(`"${field.label}" needs at least 2 options.`);
    }

    const fields_config = { fields: fields.map(({ id, ...rest }) => ({ name: id, ...rest })) };
    setSaving(true);
    try {
      if (isEditing) {
        await API.patch(`/requirements/jobs/${jobId}/forms/${formId}/`, { instructions, fields_config });
        if (publishNow) await publishForm(jobId, formId);
        setSuccess(publishNow ? 'Form updated and published.' : 'Form updated successfully.');
      } else {
        const res = await createRequirementForm(jobId, { instructions, fields_config });
        const newFormId = res.data?.form?.id;
        if (publishNow && newFormId) await publishForm(jobId, newFormId);
        setSuccess(publishNow ? 'Form created and published.' : 'Form saved as draft.');
      }
      setTimeout(() => navigate(`/client/jobs/${jobId}`), 1200);
    } catch (err) {
      setError(err.response?.data?.error || JSON.stringify(err.response?.data) || 'Failed to save form.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingForm) return <div className="empty-state">Loading form...</div>;

  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Requirements Module</p>
          <h2>{isEditing ? 'Edit Requirement Form' : 'Create Requirement Form'}</h2>
          <p>Build a structured questionnaire for participants.</p>
        </div>
        <div className="action-row">
          <button className="btn btn-primary" type="button" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      </div>

      {error && <p className="form-alert danger">{error}</p>}
      {success && <p className="form-alert success">{success}</p>}

      <div className="builder-layout">
        <section className="builder-main">
          <div className="data-panel form-panel">
            <div className="form-field">
              <label>Instructions</label>
              <textarea
                placeholder="Explain what participants should provide in this form."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
          </div>

          {fields.map((field, idx) => (
            <QuestionCard
              key={field.id}
              field={field}
              idx={idx}
              total={fields.length}
              onUpdate={(changes) => updateField(field.id, changes)}
              onRemove={() => removeField(field.id)}
              onMove={(dir) => moveField(field.id, dir)}
              onAddOption={() => addOption(field.id)}
              onUpdateOption={(optionIndex, value) => updateOption(field.id, optionIndex, value)}
              onRemoveOption={(optionIndex) => removeOption(field.id, optionIndex)}
            />
          ))}

          <button className="btn btn-secondary full-width-action" type="button" onClick={addField}>
            Add Question
          </button>
        </section>

        <aside className="builder-side">
          <section className="data-panel">
            <h3>Publish Settings</h3>
            <p>{fields.length} question{fields.length !== 1 ? 's' : ''} added.</p>
            <label className="check-row">
              <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
              <span>Publish after saving</span>
            </label>
            <button className="btn btn-primary full-width-action" type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : isEditing ? (publishNow ? 'Update & Publish' : 'Update Form') : (publishNow ? 'Save & Publish' : 'Save Draft')}
            </button>
          </section>
        </aside>
      </div>
    </>
  );
};

const QuestionCard = ({ field, idx, total, onUpdate, onRemove, onMove, onAddOption, onUpdateOption, onRemoveOption }) => {
  const hasOptions = ['radio', 'voting'].includes(field.type);

  return (
    <section className="data-panel question-card">
      <div className="section-heading-row">
        <div><span className="pill">Q{idx + 1}</span></div>
        <div className="action-row">
          <button className="btn btn-primary" type="button" disabled={idx === 0} onClick={() => onMove(-1)}>Up</button>
          <button className="btn btn-primary" type="button" disabled={idx === total - 1} onClick={() => onMove(1)}>Down</button>
          <button className="btn btn-danger" type="button" onClick={onRemove}>Remove</button>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label>Question Type</label>
          <select value={field.type} onChange={(e) => onUpdate({ type: e.target.value, options: field.options?.length ? field.options : ['Option 1', 'Option 2'] })}>
            {FIELD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>

        <div className="form-field form-field-wide">
          <label>Question Label</label>
          <input value={field.label} onChange={(e) => onUpdate({ label: e.target.value })} placeholder="What feature is most important?" />
        </div>
      </div>

      {hasOptions && (
        <div className="option-list">
          {field.options?.map((option, optionIndex) => (
            <div className="option-editor" key={optionIndex}>
              <input value={option} onChange={(e) => onUpdateOption(optionIndex, e.target.value)} placeholder={`Option ${optionIndex + 1}`} />
              <button className="icon-button" type="button" onClick={() => onRemoveOption(optionIndex)} disabled={field.options.length <= 2}>x</button>
            </div>
          ))}
          <button className="btn btn-secondary" type="button" onClick={onAddOption}>Add Option</button>
        </div>
      )}

      {field.type === 'rating' && (
        <div className="rating-config">
          <span>Max rating:</span>
          {[3, 4, 5, 7, 10].map((number) => (
            <button className={`tab-chip ${field.max === number ? 'active' : ''}`} key={number} type="button" onClick={() => onUpdate({ max: number })}>
              {number}
            </button>
          ))}
        </div>
      )}

      <label className="check-row">
        <input type="checkbox" checked={field.required} onChange={(e) => onUpdate({ required: e.target.checked })} />
        <span>Required question</span>
      </label>
    </section>
  );
};

export default CreateForm;
