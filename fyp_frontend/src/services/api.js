import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
});

const AUTH_KEYS = ['access_token', 'refresh_token', 'user'];

const authStorage = () => window.sessionStorage;

const clearLegacySharedAuth = () => {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const getStoredAccessToken = () => authStorage().getItem('access_token');

export const getStoredRefreshToken = () => authStorage().getItem('refresh_token');

export const getStoredUser = () => {
  try {
    return JSON.parse(authStorage().getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const storeAuthSession = (user, accessToken, refreshToken) => {
  authStorage().setItem('access_token', accessToken);
  authStorage().setItem('refresh_token', refreshToken);
  authStorage().setItem('user', JSON.stringify(user));
  clearLegacySharedAuth();
  setAccessToken(accessToken);
};

export const setAccessToken = (token) => {
  if (token) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete API.defaults.headers.common.Authorization;
  }
};

export const clearStoredAuth = () => {
  AUTH_KEYS.forEach((key) => authStorage().removeItem(key));
  clearLegacySharedAuth();
  setAccessToken(null);
};

const savedAccessToken = getStoredAccessToken();
if (savedAccessToken) {
  setAccessToken(savedAccessToken);
}

API.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - auto refresh token on 401
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        clearStoredAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post('http://127.0.0.1:8000/api/users/token/refresh/', {
          refresh: refreshToken,
        });
        const newAccess = res.data.access;
        authStorage().setItem('access_token', newAccess);
        setAccessToken(newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: newAccess }));
        return API(originalRequest);
      } catch {
        clearStoredAuth();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth
export const login = (data) => API.post('/users/login/', data);
export const register = (data) => API.post('/users/register/', data);
export const getNotifications = () => API.get('/users/notifications/');
export const markNotificationsRead = () => API.post('/users/notifications/read/');

// Jobs - Client
export const createJob = (data) => API.post('/jobs/create/', data);
export const getMyJobs = () => API.get('/jobs/my-jobs/');
export const getJobApplications = (jobId) => API.get(`/jobs/${jobId}/applications/`);
export const decideApplication = (applicationId, data) => API.post(`/jobs/applications/${applicationId}/decide/`, data);
export const createContract = (jobId, data) => API.post(`/jobs/${jobId}/contract/create/`, data);
export const uploadTraining = (jobId, data) => API.post(`/jobs/${jobId}/training/upload/`, data);

// Jobs - Participant
export const getAvailableJobs = () => API.get('/jobs/available/');
export const applyForJob = (jobId) => API.post(`/jobs/${jobId}/apply/`);
export const getMyApplications = () => API.get('/jobs/my-applications/');
export const signContract = (contractId) => API.post(`/jobs/contracts/${contractId}/sign/`);
export const getTrainingMaterial = (jobId) => API.get(`/jobs/${jobId}/training/`);
export const completeTraining = (jobId) => API.post(`/jobs/${jobId}/training/complete/`);

// Jobs - Admin
export const getAdminPendingJobs = () => API.get('/jobs/admin/pending/');
export const decideJob = (jobId, data) => API.post(`/jobs/admin/${jobId}/decide/`, data);

// Requirements - Client
export const getFormById = (jobId, formId) => API.get(`/requirements/jobs/${jobId}/forms/${formId}/detail/`);
export const createRequirementForm = (jobId, data) => API.post(`/requirements/jobs/${jobId}/forms/create/`, data);
export const listForms = (jobId) => API.get(`/requirements/jobs/${jobId}/forms/`);
export const publishForm = (jobId, formId) => API.post(`/requirements/jobs/${jobId}/forms/${formId}/publish/`);
export const getFormSubmissions = (jobId, formId) => API.get(`/requirements/jobs/${jobId}/forms/${formId}/submissions/`);

// Requirements - Participant
export const listPublishedForms = (jobId) => API.get(`/requirements/jobs/${jobId}/forms/published/`);
export const viewForm = (jobId, formId) => API.get(`/requirements/jobs/${jobId}/forms/${formId}/`);
export const checkRequirementSubmission = (jobId, formId) => API.get(`/requirements/jobs/${jobId}/forms/${formId}/submission-status/`);
export const submitRequirements = (jobId, formId, data) => API.post(`/requirements/jobs/${jobId}/forms/${formId}/submit/`, data);
export const getMySubmittedForms = () => API.get('/requirements/submissions/my/');

// NLP
export const runNLP = (jobId) => API.post(`/nlp/jobs/${jobId}/run/`);
export const getNLPResult = (jobId) => API.get(`/nlp/jobs/${jobId}/result/`);

// Reports
export const generateReport = (jobId) => API.post(`/reports/jobs/${jobId}/generate/`);
export const getReport = (jobId) => API.get(`/reports/jobs/${jobId}/`);
export const updateReport = (jobId, report) => API.put(`/reports/jobs/${jobId}/`, { report });
export const exportReport = (jobId, format) =>
  API.get(`/reports/jobs/${jobId}/export/${format}/`, { responseType: 'blob' });

// Profiles
export const getMyProfile = () => API.get('/profiles/me/');
export const updateMyProfile = (data) => API.put('/profiles/me/', data);
export const viewProfile = (userId) => API.get(`/profiles/${userId}/`);
export const listParticipants = () => API.get('/profiles/participants/');

// Experience
export const addExperience = (data) => API.post('/profiles/experience/', data);
export const updateExperience = (id, data) => API.put(`/profiles/experience/${id}/`, data);
export const deleteExperience = (id) => API.delete(`/profiles/experience/${id}/`);

// Education
export const addEducation = (data) => API.post('/profiles/education/', data);
export const updateEducation = (id, data) => API.put(`/profiles/education/${id}/`, data);
export const deleteEducation = (id) => API.delete(`/profiles/education/${id}/`);

// Projects
export const addProject = (data) => API.post('/profiles/projects/', data);
export const updateProject = (id, data) => API.put(`/profiles/projects/${id}/`, data);
export const deleteProject = (id) => API.delete(`/profiles/projects/${id}/`);

// Skills
export const addSkill = (data) => API.post('/profiles/skills/', data);
export const deleteSkill = (id) => API.delete(`/profiles/skills/${id}/`);

// Invitations
export const inviteParticipant = (jobId, data) => API.post(`/jobs/${jobId}/invite/`, data);
export const getMyInvitations = () => API.get('/jobs/invitations/my/');
export const respondInvitation = (invitationId, data) => API.post(`/jobs/invitations/${invitationId}/respond/`, data);
export const getJobInvitations = (jobId) => API.get(`/jobs/${jobId}/invitations/`);

export default API;
