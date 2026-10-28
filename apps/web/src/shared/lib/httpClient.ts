import axios, { AxiosError, AxiosResponse } from 'axios';
import { getAuthToken, setAuthToken } from './tokenStorage';
import { ApiError, ApiResponse } from '../types/api';

export const httpClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = httpClient;

// Request Interceptor: attach Bearer token
httpClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Broadcast channel for multi-tab logout synchronization (SPEC 8.4)
const authChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('docsearch_auth') : null;

// Global event listener callbacks for system errors
export type ServiceStatusListener = (status: 'OK' | 'DEGRADED' | 'DOWN', message?: string) => void;
const serviceStatusListeners = new Set<ServiceStatusListener>();

export const onServiceStatusChange = (cb: ServiceStatusListener) => {
  serviceStatusListeners.add(cb);
  return () => {
    serviceStatusListeners.delete(cb);
  };
};

// Response Interceptor
httpClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // If response is file download or blob, return directly
    if (response.config.responseType === 'blob') {
      return response;
    }

    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    const data = error.response?.data;
    const status = error.response?.status;
    const code = data?.code;

    // Handle Token Revoked or Expired
    if (status === 401 || code === '4010' || code === '4011') {
      setAuthToken(null);
      if (authChannel) {
        authChannel.postMessage({ type: 'LOGOUT' });
      }
      // Redirect to login if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?reason=' + (code === '4011' ? 'token_revoked' : 'session_expired');
      }
    }

    // Handle DB or Storage Unavailable (503)
    if (status === 503 || code === '5030' || code === '5031') {
      const msg = code === '5031' ? 'ระบบจัดเก็บเอกสารไม่พร้อมใช้งานชั่วคราว' : 'ฐานข้อมูลระบบไม่พร้อมใช้งานชั่วคราว';
      serviceStatusListeners.forEach(listener => listener('DEGRADED', msg));
    }

    const apiError: ApiError = {
      code: code ? String(code) : `${status || 500}`,
      message: data?.message || error.message || 'API request failed',
      details: data?.error,
      status,
    };

    (error as any).apiError = apiError;

    return Promise.reject(error);
  }
);
