import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add bearer token from sessionStorage
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('bluetech_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle unauthorized errors (clear storage, etc.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('bluetech_token');
      sessionStorage.removeItem('bluetech_user');
      // Optionally redirect or dispatch event
    }
    return Promise.reject(error);
  }
);

export default api;
