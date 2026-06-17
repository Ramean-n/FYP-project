import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getJobInvitations, inviteParticipant, listParticipants } from '../services/api';

const mediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `http://127.0.0.1:8000${path}`;
};

const BrowseParticipants = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [inviteMessage, setInviteMessage] = useState({});
  const [inviting, setInviting] = useState(null);
  const [invitationStatus, setInvitationStatus] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const [participantsRes, invitationsRes] = await Promise.all([
          listParticipants(),
          getJobInvitations(jobId),
        ]);
        setParticipants(participantsRes.data);
        const statuses = {};
        invitationsRes.data.forEach((inv) => {
          statuses[inv.participant?.id] = inv.status;
        });
        setInvitationStatus(statuses);
      } catch {
        setError('Failed to load participants.');
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, [jobId]);

  const handleInvite = async (participant) => {
    const participantId = participant.user_id;
    setInviting(participantId);
    setError('');
    try {
      await inviteParticipant(jobId, { participant_id: participantId, message: inviteMessage[participantId] || '' });
      setInvitationStatus((prev) => ({ ...prev, [participantId]: 'pending' }));
      setMessage('Invitation sent successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invitation.');
    } finally {
      setInviting(null);
    }
  };

  const filtered = participants.filter((participant) =>
    participant.username?.toLowerCase().includes(search.toLowerCase()) ||
    participant.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-title">
        <div className="page-title-content">
          <p className="eyebrow">Internal Job</p>
          <h2>Browse Participants</h2>
          <p>Find and invite participants for this internal requirements job.</p>
        </div>
      </div>

      {message && <div className="alert-modern success"><span className="alert-icon">✓</span>{message}</div>}
      {error && <div className="alert-modern danger"><span className="alert-icon">⚠</span>{error}</div>}

      <div className="search-container-modern">
        <div className="search-wrapper">
          <span className="search-icon"></span>
          <input 
            className="search-field-modern" 
            placeholder="Search by name or email..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      <section className="data-panel-modern">
        {loading ? (
          <div className="empty-state-modern">
            <div className="loading-spinner"></div>
            <p>Loading participants...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-icon"></div>
            <p>No participants found</p>
            <p className="empty-subtext">Try adjusting your search terms</p>
          </div>
        ) : (
          <div className="module-grid-modern">
            {filtered.map((participant) => (
              <article className="surface-card-modern module-card-modern" key={participant.id}>
                <div className="profile-header-modern">
                  <div className="avatar-wrapper">
                    {participant.profile_picture ? (
                      <img className="avatar-img-modern" src={mediaUrl(participant.profile_picture)} alt={`${participant.username} profile`} />
                    ) : (
                      <div className="avatar-placeholder-modern">{participant.username?.charAt(0)?.toUpperCase()}</div>
                    )}
                    <div className={`avatar-status ${invitationStatus[participant.user_id] || ''}`}></div>
                  </div>
                  <div className="profile-info-modern">
                    <h3 className="profile-name">{participant.username}</h3>
                    <p className="profile-email">{participant.email}</p>
                  </div>
                </div>

                {participant.bio && (
                  <p className="profile-bio">
                    {participant.bio.substring(0, 120)}{participant.bio.length > 120 ? '...' : ''}
                  </p>
                )}

                {participant.skills?.length > 0 && (
                  <div className="skills-container">
                    <span className="skills-label">Skills</span>
                    <div className="chip-list-modern">
                      {participant.skills.slice(0, 4).map((skill) => (
                        <span className="pill-modern" key={skill.id || skill.name}>
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="invite-section">
                  <textarea
                    className="textarea-modern"
                    placeholder="Add an optional message with your invitation..."
                    value={inviteMessage[participant.user_id] || ''}
                    onChange={(e) => setInviteMessage((prev) => ({ ...prev, [participant.user_id]: e.target.value }))}
                  />
                </div>

                <div className="action-row-modern">
                  <button 
                    className="btn btn-primary" 
                    type="button" 
                    onClick={() => navigate(`/profiles/${participant.user_id}`)}
                  >
                    <span className="btn-icon-sm"></span>
                    View Profile
                  </button>
                  {invitationStatus[participant.user_id] ? (
                    <span className={`pill-status ${invitationStatus[participant.user_id]}`}>
                      <span className="status-icon">{invitationStatus[participant.user_id] === 'accepted' ? '✓' : invitationStatus[participant.user_id] === 'rejected' ? '✕' : '⏳'}</span>
                      {invitationStatus[participant.user_id]}
                    </span>
                  ) : (
                    <button 
                      className="btn btn-primary-modern" 
                      type="button" 
                      onClick={() => handleInvite(participant)} 
                      disabled={inviting === participant.user_id}
                    >
                      {inviting === participant.user_id ? (
                        <>
                          <span className="loading-dots">...</span>
                          Sending
                        </>
                      ) : (
                        <>
                          <span className="btn-icon-sm">✉</span>
                          Invite
                        </>
                      )}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default BrowseParticipants;