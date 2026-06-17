import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppShell from './components/AppShell';
import LandingPage from './pages/LandingPage';
import Privacy from './pages/Privacy';
import Login from './pages/Login';
import Register from './pages/Register';
import ClientDashboard from './pages/ClientDashboard';
import CreateJob from './pages/CreateJob';
import MyJobs from './pages/MyJobs';
import JobDetail from './pages/JobDetail';
import ParticipantDashboard from './pages/ParticipantDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ParticipantJobDetail from './pages/ParticipantJobDetail';
import ContractSign from './pages/ContractSign';
import TrainingMaterial from './pages/TrainingMaterial';
import CreateForm from './pages/CreateForm';
import ParticipantFormFill from './pages/ParticipantFormFill';
import ParticipantFormList from './pages/ParticipantFormList';
import ReportView from './pages/ReportView';
import Profile from './pages/Profile';
import BrowseParticipants from './pages/BrowseParticipants';
import { getStoredAccessToken, getStoredUser } from './services/api';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = getStoredAccessToken();
  const user = getStoredUser();
  
  if (!token || !user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'client') return <Navigate to="/client/dashboard" />;
    if (user.role === 'participant') return <Navigate to="/participant/dashboard" />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" />;
  }
  return children;
};

const RoleRedirect = () => {
  const token = getStoredAccessToken();
  const user = getStoredUser();
  if (!token || !user) return <Navigate to="/login" />;
  if (user.role === 'client') return <Navigate to="/client/dashboard" />;
  if (user.role === 'participant') return <Navigate to="/participant/dashboard" />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" />;
  return <Navigate to="/login" />;
};

const ProtectedPage = ({ children, allowedRoles }) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    <AppShell>{children}</AppShell>
  </ProtectedRoute>
);

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/dashboard" element={<RoleRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/client/dashboard" element={<ProtectedPage allowedRoles={['client']}><ClientDashboard /></ProtectedPage>} />
          <Route path="/client/create-job" element={<ProtectedPage allowedRoles={['client']}><CreateJob /></ProtectedPage>} />
          <Route path="/client/jobs" element={<ProtectedPage allowedRoles={['client']}><MyJobs /></ProtectedPage>} />
          <Route path="/client/jobs/:jobId" element={<ProtectedPage allowedRoles={['client']}><JobDetail /></ProtectedPage>} />
          <Route path="/participant/dashboard" element={<ProtectedPage allowedRoles={['participant']}><ParticipantDashboard /></ProtectedPage>} />
          <Route path="/admin/dashboard" element={<ProtectedPage allowedRoles={['admin']}><AdminDashboard /></ProtectedPage>} />
          <Route path="/participant/jobs/:jobId" element={<ProtectedPage allowedRoles={['participant']}><ParticipantJobDetail /></ProtectedPage>} />
          <Route path="/participant/contracts/:contractId" element={<ProtectedPage allowedRoles={['participant']}><ContractSign /></ProtectedPage>} />
          <Route path="/participant/jobs/:jobId/training" element={<ProtectedPage allowedRoles={['participant']}><TrainingMaterial /></ProtectedPage>} />
          <Route path="/client/jobs/:jobId/create-form" element={<ProtectedPage allowedRoles={['client']}><CreateForm /></ProtectedPage>} />
          <Route path="/client/jobs/:jobId/edit-form/:formId" element={<ProtectedPage allowedRoles={['client']}><CreateForm /></ProtectedPage>} />
          <Route path="/participant/jobs/:jobId/forms" element={<ProtectedPage allowedRoles={['participant']}><ParticipantFormList /></ProtectedPage>} />
          <Route path="/participant/jobs/:jobId/forms/:formId" element={<ProtectedPage allowedRoles={['participant']}><ParticipantFormFill /></ProtectedPage>} />
          <Route path="/client/jobs/:jobId/report" element={<ProtectedPage allowedRoles={['client']}><ReportView /></ProtectedPage>} />
          <Route path="/profile" element={<ProtectedPage allowedRoles={['client', 'participant']}><Profile /></ProtectedPage>} />
          <Route path="/profiles/:userId" element={<ProtectedPage allowedRoles={['client', 'participant', 'admin']}><Profile /></ProtectedPage>} />
          <Route path="/client/jobs/:jobId/browse-participants" element={<ProtectedPage allowedRoles={['client']}><BrowseParticipants /></ProtectedPage>} />

          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};


export default App;
