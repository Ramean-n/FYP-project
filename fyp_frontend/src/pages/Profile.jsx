import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  addEducation,
  addExperience,
  addProject,
  addSkill,
  deleteEducation,
  deleteExperience,
  deleteProject,
  deleteSkill,
  getMyProfile,
  updateMyProfile,
  viewProfile,
} from '../services/api';

const mediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return 'http://127.0.0.1:8000' + path;
};

const cleanPayload = (data) =>
  Object.fromEntries(Object.entries(data).filter(([_key, value]) => value !== ''));

/* ─── focus/blur helpers ─── */
const onFocus = (e) => {
  e.target.style.borderColor = 'var(--primary)';
  e.target.style.boxShadow = '0 0 0 3px var(--primary-subtle)';
};
const onBlur = (e) => {
  e.target.style.borderColor = 'var(--border-subtle)';
  e.target.style.boxShadow = 'none';
};

/* ─── styles ─── */
const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, var(--surface-2) 0%, var(--surface-3) 100%)',
    padding: '0 0 64px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  shell: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },

  heroCard: {
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border-card)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
    borderRadius: '16px 16px 0 0',
  },
  heroBody: {
    padding: '32px 40px',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    border: '3px solid var(--avatar-border)',
    background: 'linear-gradient(135deg, var(--avatar-gradient-start), var(--avatar-gradient-end))',
    display: 'grid',
    placeItems: 'center',
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--on-primary)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  heroName: {
    margin: '0 0 6px',
    fontSize: 30,
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  heroBio: {
    margin: '0 0 12px',
    color: 'var(--text-muted)',
    fontSize: 15,
    lineHeight: 1.6,
    maxWidth: '600px',
  },
  metaChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 14px',
    borderRadius: 999,
    background: 'var(--surface-2)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
  },
  metaChipLink: {
    color: 'var(--primary)',
    background: 'var(--primary-subtle)',
    borderColor: 'var(--border-accent)',
  },
  roleBadge: {
    padding: '6px 16px',
    borderRadius: 999,
    background: 'var(--primary-subtle)',
    border: '1px solid var(--border-accent)',
    color: 'var(--primary-2)',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    whiteSpace: 'nowrap',
  },
  editBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 10,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: 'var(--shadow-inset)',
    transition: 'all 0.2s',
  },
  editBtnActive: {
    background: 'var(--danger-bg)',
    borderColor: 'var(--danger-border)',
    color: 'var(--danger)',
  },

  alertSuccess: {
    padding: '14px 40px',
    background: 'var(--success-bg)',
    borderBottom: '1px solid var(--success-border)',
    color: 'var(--success-text)',
    fontSize: 14,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  alertDanger: {
    padding: '14px 40px',
    background: 'var(--danger-bg)',
    borderBottom: '1px solid var(--danger-border)',
    color: 'var(--danger)',
    fontSize: 14,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  editPanel: {
    background: 'var(--surface-muted)',
    borderBottom: '1px solid var(--border-card)',
    padding: '24px 40px',
  },
  editPanelTitle: { margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' },
  editPanelSub: { margin: '0 0 20px', color: 'var(--text-muted)', fontSize: 14 },

  tabRow: {
    display: 'flex',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border-card)',
    padding: '0 40px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
  },
  tab: {
    padding: '16px 22px',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    marginBottom: '-1px',
  },
  tabActive: {
    color: 'var(--primary)',
    fontWeight: 700,
    borderBottom: '2px solid var(--primary)',
  },

  pageBody: {
    padding: '32px 40px',
    background: 'var(--surface-2)',
    flex: 1,
    minHeight: 'calc(100vh - 260px)',
  },

  sectionCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border-card)',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  sectionHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 28px',
    borderBottom: '1px solid var(--border-card)',
    background: 'var(--surface-muted)',
  },
  sectionTitle: {
    margin: '0 0 4px',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  sectionSub: {
    margin: 0,
    fontSize: 13,
    color: 'var(--soft)',
  },
  addToggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    borderRadius: 10,
    border: '1px solid var(--border-accent)',
    background: 'var(--primary-subtle)',
    color: 'var(--primary)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  addToggleBtnActive: {
    background: 'var(--danger-bg)',
    borderColor: 'var(--danger-border)',
    color: 'var(--danger)',
  },

  inlineForm: {
    padding: '24px 28px',
    background: 'var(--input-bg)',
    borderBottom: '1px solid var(--border-item)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
    marginBottom: 18,
  },
  formField: { display: 'grid', gap: 6 },
  formFieldWide: { display: 'grid', gap: 6, gridColumn: '1 / -1' },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    width: '100%',
    minHeight: 44,
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    background: 'var(--surface)',
    padding: '0 14px',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  textarea: {
    width: '100%',
    minHeight: 96,
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    background: 'var(--surface)',
    padding: '12px 14px',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  select: {
    width: '100%',
    minHeight: 44,
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    background: 'var(--surface)',
    padding: '0 14px',
    fontSize: 14,
    outline: 'none',
  },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 10 },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 22px',
    borderRadius: 10,
    border: 'none',
    background: 'var(--primary)',
    color: 'var(--on-primary)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: 'none',
    transition: 'all 0.2s',
  },
  cancelBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    borderRadius: 10,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface)',
    color: 'var(--text-muted)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 24px',
    borderRadius: 10,
    border: 'none',
    background: 'var(--primary)',
    color: 'var(--on-primary)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: 'none',
    transition: 'all 0.2s',
  },

  itemList: { display: 'grid', padding: '16px 20px', gap: 12 },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    color: 'var(--soft)',
    fontSize: 15,
  },
  emptyIcon: { fontSize: 36, marginBottom: 12, display: 'block', opacity: 0.45 },

  listItem: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    padding: '16px 18px',
    border: '1px solid var(--border-item)',
    borderRadius: 12,
    background: 'var(--surface-tint)',
    transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
  },
  listItemLeft: {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
  },
  itemDot: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'var(--primary-tint)',
    border: '1px solid var(--border-accent-strong)',
    display: 'grid',
    placeItems: 'center',
    fontSize: 17,
    flexShrink: 0,
  },
  itemTitle: { margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' },
  itemSub: { margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 },
  deleteBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid var(--danger-border)',
    background: 'var(--danger-bg-soft)',
    color: 'var(--danger)',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
    flexShrink: 0,
  },

  skillsBody: { padding: '20px 28px' },
  skillsGrid: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  skillPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 999,
    background: 'var(--primary-subtle)',
    border: '1px solid var(--border-accent-strong)',
    color: 'var(--primary-2)',
    fontSize: 14,
    fontWeight: 600,
    boxShadow: 'none',
  },
  skillDeleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: 'none',
    background: 'var(--border-accent-strong)',
    color: 'var(--primary-dark)',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
  },
};

const TAB_ICONS = { experience: '', education: '', projects: '', skills: '' };

const Profile = () => {
  const { user } = useAuth();
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('experience');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [bioText, setBioText] = useState('');
  const [locationText, setLocationText] = useState('');
  const [websiteText, setWebsiteText] = useState('');

  const [showExpForm, setShowExpForm] = useState(false);
  const [showEduForm, setShowEduForm] = useState(false);
  const [showProjForm, setShowProjForm] = useState(false);
  const [showSkillForm, setShowSkillForm] = useState(false);

  const [expForm, setExpForm] = useState({ title: '', company: '', start_date: '', end_date: '', currently_working: false, description: '' });
  const [eduForm, setEduForm] = useState({ degree: '', institution: '', field_of_study: '', start_date: '', end_date: '', currently_studying: false });
  const [projForm, setProjForm] = useState({ title: '', description: '', url: '', start_date: '', end_date: '' });
  const [skillForm, setSkillForm] = useState({ name: '', level: 'intermediate' });

  const isOwner = !userId || Number(userId) === user?.id;
  const profileImage = mediaUrl(profile?.profile_picture || (isOwner ? user?.profile_picture : ''));

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = userId ? await viewProfile(userId) : await getMyProfile();
      setProfile(res.data);
      setBioText(res.data.bio || '');
      setLocationText(res.data.location || '');
      setWebsiteText(res.data.website || '');
    } catch {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, [userId]);

  const saveProfile = async () => {
    try {
      const res = await updateMyProfile({ bio: bioText, location: locationText, website: websiteText });
      setProfile(res.data);
      setEditing(false);
      setMessage('Profile updated.');
    } catch {
      setError('Failed to update profile.');
    }
  };

  const addItem = async (type, e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (type === 'experience') {
        await addExperience(cleanPayload(expForm));
        setExpForm({ title: '', company: '', start_date: '', end_date: '', currently_working: false, description: '' });
        setShowExpForm(false);
      }
      if (type === 'education') {
        await addEducation(cleanPayload(eduForm));
        setEduForm({ degree: '', institution: '', field_of_study: '', start_date: '', end_date: '', currently_studying: false });
        setShowEduForm(false);
      }
      if (type === 'projects') {
        await addProject(cleanPayload(projForm));
        setProjForm({ title: '', description: '', url: '', start_date: '', end_date: '' });
        setShowProjForm(false);
      }
      if (type === 'skills') {
        await addSkill(cleanPayload(skillForm));
        setSkillForm({ name: '', level: 'intermediate' });
        setShowSkillForm(false);
      }
      setMessage('Saved successfully.');
      fetchProfile();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Failed to save item.');
    }
  };

  const removeItem = async (type, id) => {
    try {
      if (type === 'experience') await deleteExperience(id);
      if (type === 'education') await deleteEducation(id);
      if (type === 'projects') await deleteProject(id);
      if (type === 'skills') await deleteSkill(id);
      setMessage('Deleted successfully.');
      fetchProfile();
    } catch {
      setError('Failed to delete item.');
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--soft)' }}>
        <div style={{ fontSize: 30, marginBottom: 10 }}>Loading</div>
        <p style={{ margin: 0, fontSize: 14 }}>Loading profile…</p>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.shell}>
        {message && <div style={S.alertSuccess}><span>✓</span> {message}</div>}
        {error && <div style={S.alertDanger}><span>✕</span> {error}</div>}

        <div style={S.heroCard}>
          <div style={S.heroBody}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, minWidth: 0 }}>
                <div style={S.avatar}>
                  {profileImage
                    ? <img style={S.avatarImg} src={profileImage} alt={(profile?.username || 'User') + ' profile'} />
                    : profile?.username?.charAt(0)?.toUpperCase()
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={S.heroName}>{profile?.username || user?.username}</h2>
                  <p style={S.heroBio}>{profile?.bio || 'No professional summary added yet.'}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {profile?.location && (
                      <span style={S.metaChip}>{profile.location}</span>
                    )}
                    {profile?.website && (
                      <a style={{ ...S.metaChip, ...S.metaChipLink }} href={profile.website} target="_blank" rel="noreferrer">
                        {profile.website}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                <span style={S.roleBadge}>{profile?.role || user?.role}</span>
                {isOwner && (
                  <button
                    style={{ ...S.editBtn, ...(editing ? S.editBtnActive : {}) }}
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                  >
                    {editing ? 'Cancel' : 'Edit Profile'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {isOwner && editing && (
          <div style={S.editPanel}>
            <p style={S.editPanelTitle}>Edit Profile Info</p>
            <p style={S.editPanelSub}>Update your bio, location, and website link.</p>
            <div style={S.formGrid}>
              <div style={S.formFieldWide}>
                <label style={S.label}>Bio</label>
                <textarea style={S.textarea} value={bioText} onChange={(e) => setBioText(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div style={S.formField}>
                <label style={S.label}>Location</label>
                <input style={S.input} value={locationText} onChange={(e) => setLocationText(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div style={S.formField}>
                <label style={S.label}>Website</label>
                <input style={S.input} value={websiteText} onChange={(e) => setWebsiteText(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={S.saveBtn} type="button" onClick={saveProfile}>Save Changes</button>
            </div>
          </div>
        )}

        <div style={S.tabRow}>
          {['experience', 'education', 'projects', 'skills'].map((tab) => (
            <button
              key={tab}
              style={{ ...S.tab, ...(activeTab === tab ? S.tabActive : {}) }}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {TAB_ICONS[tab]} {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div style={S.pageBody}>
          {activeTab === 'experience' && (
            <div style={S.sectionCard}>
              <div style={S.sectionHead}>
                <div>
                  <h2 style={S.sectionTitle}>Experience</h2>
                  <p style={S.sectionSub}>Work history and professional roles</p>
                </div>
                {isOwner && (
                  <button
                    style={{ ...S.addToggleBtn, ...(showExpForm ? S.addToggleBtnActive : {}) }}
                    type="button"
                    onClick={() => setShowExpForm((v) => !v)}
                  >
                    {showExpForm ? 'Cancel' : '+ Add Experience'}
                  </button>
                )}
              </div>

              {showExpForm && (
                <form style={S.inlineForm} onSubmit={(e) => addItem('experience', e)}>
                  <div style={S.formGrid}>
                    <div style={S.formField}>
                      <label style={S.label}>Title</label>
                      <input style={S.input} value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} required onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>Company</label>
                      <input style={S.input} value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} required onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>Start Date</label>
                      <input style={S.input} type="date" value={expForm.start_date} onChange={(e) => setExpForm({ ...expForm, start_date: e.target.value })} required onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>End Date</label>
                      <input style={S.input} type="date" value={expForm.end_date} onChange={(e) => setExpForm({ ...expForm, end_date: e.target.value })} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formFieldWide}>
                      <label style={S.label}>Description</label>
                      <textarea style={S.textarea} value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                  </div>
                  <div style={S.formActions}>
                    <button style={S.cancelBtn} type="button" onClick={() => setShowExpForm(false)}>Cancel</button>
                    <button style={S.submitBtn} type="submit">+ Add Experience</button>
                  </div>
                </form>
              )}

              <div style={S.itemList}>
                {(profile?.experiences || []).length === 0 ? (
                  <div style={S.emptyState}><span style={S.emptyIcon}></span>No experience added yet.</div>
                ) : (
                  profile.experiences.map((item) => (
                    <div
                      style={S.listItem}
                      key={item.id}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-accent-strong)'; e.currentTarget.style.background = 'var(--primary-subtle)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-item)'; e.currentTarget.style.background = 'var(--surface-tint)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={S.listItemLeft}>
                        <div style={S.itemDot}></div>
                        <div>
                          <h3 style={S.itemTitle}>{item.title}</h3>
                          <p style={S.itemSub}>{item.company}</p>
                        </div>
                      </div>
                      {isOwner && editing && (
                        <button style={S.deleteBtn} type="button" onClick={() => removeItem('experience', item.id)}>Delete</button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'education' && (
            <div style={S.sectionCard}>
              <div style={S.sectionHead}>
                <div>
                  <h2 style={S.sectionTitle}>Education</h2>
                  <p style={S.sectionSub}>Academic background and qualifications</p>
                </div>
                {isOwner && (
                  <button
                    style={{ ...S.addToggleBtn, ...(showEduForm ? S.addToggleBtnActive : {}) }}
                    type="button"
                    onClick={() => setShowEduForm((v) => !v)}
                  >
                    {showEduForm ? 'Cancel' : '+ Add Education'}
                  </button>
                )}
              </div>

              {showEduForm && (
                <form style={S.inlineForm} onSubmit={(e) => addItem('education', e)}>
                  <div style={S.formGrid}>
                    <div style={S.formField}>
                      <label style={S.label}>Degree</label>
                      <input style={S.input} value={eduForm.degree} onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })} required onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>Institution</label>
                      <input style={S.input} value={eduForm.institution} onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })} required onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>Field of Study</label>
                      <input style={S.input} value={eduForm.field_of_study} onChange={(e) => setEduForm({ ...eduForm, field_of_study: e.target.value })} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>Start Date</label>
                      <input style={S.input} type="date" value={eduForm.start_date} onChange={(e) => setEduForm({ ...eduForm, start_date: e.target.value })} required onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>End Date</label>
                      <input style={S.input} type="date" value={eduForm.end_date} onChange={(e) => setEduForm({ ...eduForm, end_date: e.target.value })} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                  </div>
                  <div style={S.formActions}>
                    <button style={S.cancelBtn} type="button" onClick={() => setShowEduForm(false)}>Cancel</button>
                    <button style={S.submitBtn} type="submit">+ Add Education</button>
                  </div>
                </form>
              )}

              <div style={S.itemList}>
                {(profile?.education || []).length === 0 ? (
                  <div style={S.emptyState}><span style={S.emptyIcon}></span>No education added yet.</div>
                ) : (
                  profile.education.map((item) => (
                    <div
                      style={S.listItem}
                      key={item.id}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-accent-strong)'; e.currentTarget.style.background = 'var(--primary-subtle)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-item)'; e.currentTarget.style.background = 'var(--surface-tint)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={S.listItemLeft}>
                        <div style={S.itemDot}></div>
                        <div>
                          <h3 style={S.itemTitle}>{item.degree}</h3>
                          <p style={S.itemSub}>{item.institution}{item.field_of_study ? ' · ' + item.field_of_study : ''}</p>
                        </div>
                      </div>
                      {isOwner && editing && (
                        <button style={S.deleteBtn} type="button" onClick={() => removeItem('education', item.id)}>Delete</button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div style={S.sectionCard}>
              <div style={S.sectionHead}>
                <div>
                  <h2 style={S.sectionTitle}>Projects</h2>
                  <p style={S.sectionSub}>Portfolio and personal projects</p>
                </div>
                {isOwner && (
                  <button
                    style={{ ...S.addToggleBtn, ...(showProjForm ? S.addToggleBtnActive : {}) }}
                    type="button"
                    onClick={() => setShowProjForm((v) => !v)}
                  >
                    {showProjForm ? 'Cancel' : '+ Add Project'}
                  </button>
                )}
              </div>

              {showProjForm && (
                <form style={S.inlineForm} onSubmit={(e) => addItem('projects', e)}>
                  <div style={S.formGrid}>
                    <div style={S.formField}>
                      <label style={S.label}>Title</label>
                      <input style={S.input} value={projForm.title} onChange={(e) => setProjForm({ ...projForm, title: e.target.value })} required onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>URL</label>
                      <input style={S.input} value={projForm.url} onChange={(e) => setProjForm({ ...projForm, url: e.target.value })} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>Start Date</label>
                      <input style={S.input} type="date" value={projForm.start_date} onChange={(e) => setProjForm({ ...projForm, start_date: e.target.value })} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>End Date</label>
                      <input style={S.input} type="date" value={projForm.end_date} onChange={(e) => setProjForm({ ...projForm, end_date: e.target.value })} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formFieldWide}>
                      <label style={S.label}>Description</label>
                      <textarea style={S.textarea} value={projForm.description} onChange={(e) => setProjForm({ ...projForm, description: e.target.value })} required onFocus={onFocus} onBlur={onBlur} />
                    </div>
                  </div>
                  <div style={S.formActions}>
                    <button style={S.cancelBtn} type="button" onClick={() => setShowProjForm(false)}>Cancel</button>
                    <button style={S.submitBtn} type="submit">+ Add Project</button>
                  </div>
                </form>
              )}

              <div style={S.itemList}>
                {(profile?.projects || []).length === 0 ? (
                  <div style={S.emptyState}><span style={S.emptyIcon}></span>No projects added yet.</div>
                ) : (
                  profile.projects.map((item) => (
                    <div
                      style={S.listItem}
                      key={item.id}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-accent-strong)'; e.currentTarget.style.background = 'var(--primary-subtle)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-item)'; e.currentTarget.style.background = 'var(--surface-tint)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={S.listItemLeft}>
                        <div style={S.itemDot}></div>
                        <div>
                          <h3 style={S.itemTitle}>{item.title}</h3>
                          <p style={S.itemSub}>{item.description}</p>
                        </div>
                      </div>
                      {isOwner && editing && (
                        <button style={S.deleteBtn} type="button" onClick={() => removeItem('projects', item.id)}>Delete</button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div style={S.sectionCard}>
              <div style={S.sectionHead}>
                <div>
                  <h2 style={S.sectionTitle}>Skills</h2>
                  <p style={S.sectionSub}>Technical skills and proficiencies</p>
                </div>
                {isOwner && (
                  <button
                    style={{ ...S.addToggleBtn, ...(showSkillForm ? S.addToggleBtnActive : {}) }}
                    type="button"
                    onClick={() => setShowSkillForm((v) => !v)}
                  >
                    {showSkillForm ? 'Cancel' : '+ Add Skill'}
                  </button>
                )}
              </div>

              {showSkillForm && (
                <form style={S.inlineForm} onSubmit={(e) => addItem('skills', e)}>
                  <div style={S.formGrid}>
                    <div style={S.formField}>
                      <label style={S.label}>Skill Name</label>
                      <input style={S.input} value={skillForm.name} onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })} required onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>Level</label>
                      <select style={S.select} value={skillForm.level} onChange={(e) => setSkillForm({ ...skillForm, level: e.target.value })}>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>
                  </div>
                  <div style={S.formActions}>
                    <button style={S.cancelBtn} type="button" onClick={() => setShowSkillForm(false)}>Cancel</button>
                    <button style={S.submitBtn} type="submit">+ Add Skill</button>
                  </div>
                </form>
              )}

              <div style={S.skillsBody}>
                {(profile?.skills || []).length === 0 ? (
                  <div style={S.emptyState}><span style={S.emptyIcon}></span>No skills added yet.</div>
                ) : (
                  <div style={S.skillsGrid}>
                    {profile.skills.map((skill) => (
                      <span style={S.skillPill} key={skill.id}>
                        {skill.name}
                        {isOwner && editing && (
                          <button style={S.skillDeleteBtn} type="button" onClick={() => removeItem('skills', skill.id)}>×</button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;