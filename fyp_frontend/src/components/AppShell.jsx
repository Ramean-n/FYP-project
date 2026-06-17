import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationsRead } from '../services/api';
import Icon from './Icons';
import ThemeToggle from './ThemeToggle';

const roleHome = {
  client: '/client/dashboard',
  participant: '/participant/dashboard',
  admin: '/admin/dashboard',
};

const roleLinks = {
  client: [
    { label: 'Dashboard', to: '/client/dashboard', icon: 'dashboard' },
    { label: 'Create Job', to: '/client/create-job', icon: 'plus' },
    { label: 'My Jobs', to: '/client/jobs', icon: 'briefcase' },
    { label: 'Profile', to: '/profile', icon: 'profile' },
  ],
  participant: [
    { label: 'Available Jobs', to: '/participant/dashboard?section=available', icon: 'briefcase', defaultSection: true },
    { label: 'My Jobs', to: '/participant/dashboard?section=myJobs', icon: 'dashboard' },
    { label: 'Applications', to: '/participant/dashboard?section=applications', icon: 'file' },
    { label: 'Invitations', to: '/participant/dashboard?section=invitations', icon: 'users' },
    { label: 'My Contracts', to: '/participant/dashboard?section=contracts', icon: 'file' },
    { label: 'Training Materials', to: '/participant/dashboard?section=training', icon: 'dashboard' },
    { label: 'Submitted Forms', to: '/participant/dashboard?section=submittedForms', icon: 'file' },
    { label: 'Saved Jobs', to: '/participant/dashboard?section=saved', icon: 'bookmark' },
    { label: 'Profile', to: '/profile', icon: 'profile' },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard?section=overview', icon: 'dashboard', defaultSection: true },
    { label: 'Users', to: '/admin/dashboard?section=users', icon: 'users' },
    { label: 'Jobs', to: '/admin/dashboard?section=jobs', icon: 'briefcase' },
    { label: 'User Status', to: '/admin/dashboard?section=status', icon: 'profile' },
  ],
};

const AppShell = ({ children }) => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const links = roleLinks[user?.role] || [];
  const currentLocation = `${location.pathname}${location.search}`;
  const notificationCount = notifications.filter((item) => !item.is_read).length;
  const profilePicture = user?.profile_picture;
  const profilePictureUrl = profilePicture?.startsWith('http') ? profilePicture : profilePicture ? `http://127.0.0.1:8000${profilePicture}` : '';

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await getNotifications();
        setNotifications(res.data);
      } catch {
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, []);

  const toggleNotifications = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen && notificationCount > 0) {
      try {
        await markNotificationsRead();
        setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      } catch {}
    }
  };

  const logout = () => {
    logoutUser();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <NavLink className="brand-mark" to={roleHome[user?.role] || '/'}>
          </NavLink>
          <div>
            <div className="brand-name requify-brand">Requify</div>
            <div className="brand-role">{user?.role || 'Platform'}</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink className="nav-item" to="/" onClick={() => setOpen(false)}>
            <Icon name="home" size={18} />
            <span>Home</span>
          </NavLink>
          {links.map((item) => (
            <NavLink
              key={`${item.label}-${item.to}`}
              className={({ isActive }) => `nav-item ${(currentLocation === item.to || (item.defaultSection && location.pathname === item.to.split('?')[0] && !location.search) || (isActive && !item.to.includes('?'))) ? 'active' : ''}`}
              to={item.to}
              onClick={() => setOpen(false)}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink className="nav-item" to="/#about" onClick={() => setOpen(false)}>
            <Icon name="info" size={17} />
            <span>About Us</span>
          </NavLink>
          <NavLink className="nav-item" to="/#contact" onClick={() => setOpen(false)}>
            <Icon name="contact" size={17} />
            <span>Contact Us</span>
          </NavLink>
          <div className="user-chip">
            {profilePictureUrl ? (
              <img className="avatar avatar-img" src={profilePictureUrl} alt={`${user?.username || 'User'} profile`} />
            ) : (
              <div className="avatar">{user?.username?.charAt(0)?.toUpperCase() || 'R'}</div>
            )}
            <div>
              <strong>{user?.username || 'User'}</strong>
              <span>{user?.email || user?.role}</span>
            </div>
          </div>
          <button className="nav-item nav-danger" type="button" onClick={logout}>
            <Icon name="logout" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {open && <button className="sidebar-backdrop" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />}

      <div className="shell-main">
        <header className="topbar">
          <button className="icon-button mobile-menu" type="button" onClick={() => setOpen(true)} title="Open menu">
            <Icon name="menu" size={20} />
          </button>
          <div>
            <p className="eyebrow"><span className="topbar-brand-text">Requify</span> Workspace</p>
            <h1>{user?.role === 'admin' ? 'Admin Control Center' : user?.role === 'client' ? 'Client Dashboard' : 'Participant Dashboard'}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button notification-button" type="button" title="Notifications" onClick={toggleNotifications}>
              <Icon name="bell" size={18} />
              {notificationCount > 0 && <span>{notificationCount}</span>}
            </button>
            {notificationsOpen && (
              <div className="notification-menu">
                <div className="notification-menu-head">
                  <strong>Notifications</strong>
                </div>
                {notifications.length === 0 ? (
                  <div className="notification-empty">No Notifications Yet</div>
                ) : (
                  <div className="notification-list">
                    {notifications.map((item) => (
                      <article className={`notification-item ${item.is_read ? '' : 'unread'}`} key={item.id}>
                        <span className="pill">{item.notification_type?.replaceAll('_', ' ')}</span>
                        <h3>{item.title}</h3>
                        <p>{item.message}</p>
                        <time>{new Date(item.created_at).toLocaleString()}</time>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
            <ThemeToggle />
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
