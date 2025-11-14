import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
};

// Environment APIs
export const environmentAPI = {
  getAll: (params) => api.get('/environments', { params }),
  getById: (id) => api.get(`/environments/${id}`),
  create: (data) => api.post('/environments', data),
  update: (id, data) => api.put(`/environments/${id}`, data),
  delete: (id) => api.delete(`/environments/${id}`),
  getAvailability: (id, params) => api.get(`/environments/${id}/availability`, { params }),
  getStatistics: () => api.get('/environments/statistics'),
  // Configuration (applications/hardware/network) management
  getConfigs: (envId) => api.get(`/environments/${envId}/configs`),
  createConfig: (envId, data) => api.post(`/environments/${envId}/configs`, data),
  updateConfig: (envId, configId, data) => api.put(`/environments/${envId}/configs/${configId}`, data),
  deleteConfig: (envId, configId) => api.delete(`/environments/${envId}/configs/${configId}`),
};

// Booking APIs
export const bookingAPI = {
  getAll: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  updateStatus: (id, data) => api.patch(`/bookings/${id}/status`, data),
  getMyBookings: () => api.get('/bookings/my-bookings'),
  getStatistics: () => api.get('/bookings/statistics'),
};

// Monitoring APIs
export const monitoringAPI = {
  getDashboard: () => api.get('/monitoring/dashboard'),
  getMetrics: (params) => api.get('/monitoring/metrics', { params }),
  getEnvironmentMetrics: (id, params) => api.get(`/monitoring/environments/${id}/metrics`, { params }),
  getEnvironmentHealth: (id) => api.get(`/monitoring/environments/${id}/health`),
  recordMetric: (data) => api.post('/monitoring/metrics', data),
};

// Analytics APIs
export const analyticsAPI = {
  getDashboard: (params) => api.get('/analytics/dashboard', { params }),
  getUtilization: (params) => api.get('/analytics/utilization', { params }),
  getUserActivity: (params) => api.get('/analytics/user-activity', { params }),
  getConflicts: (params) => api.get('/analytics/conflicts', { params }),
  getTrends: (params) => api.get('/analytics/trends', { params }),
  getPerformance: (params) => api.get('/analytics/performance', { params }),
  exportReport: (params) => api.get('/analytics/export', { params, responseType: 'blob' }),
};

// Notification APIs
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Comment APIs
export const commentAPI = {
  getAll: (params) => api.get('/comments', { params }),
  create: (data) => api.post('/comments', data),
  update: (id, data) => api.put(`/comments/${id}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
};

export default api;
