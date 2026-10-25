import axios, { AxiosError, AxiosResponse } from 'axios';

export interface ResponseEnvelope<T = any, M = any> {
  code: string;
  message: string;
  data: T;
  meta?: M;
}

export interface PageMeta {
  page: number;
  size: number;
  total: number;
}

export interface CursorMeta {
  size: number;
  next_cursor: string | null;
  has_next: boolean;
}

const TOKEN_KEY = 'docsearch_token';
let currentToken: string | null = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

export const setAuthToken = (token: string | null) => {
  currentToken = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getAuthToken = () => currentToken;

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: attach Bearer token
apiClient.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

// Broadcast channel for multi-tab logout synchronization (SPEC 8.4)
const authChannel = new BroadcastChannel('docsearch_auth');

// Global event listener callbacks for system errors
type ServiceStatusListener = (status: 'OK' | 'DEGRADED' | 'DOWN', message?: string) => void;
const serviceStatusListeners = new Set<ServiceStatusListener>();

export const onServiceStatusChange = (cb: ServiceStatusListener) => {
  serviceStatusListeners.add(cb);
  return () => {
    serviceStatusListeners.delete(cb);
  };
};

// Response Interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse<ResponseEnvelope>) => {
    // If response is file download or blob, return directly
    if (response.config.responseType === 'blob') {
      return response;
    }

    // Return the response envelope
    return response;
  },
  (error: AxiosError<ResponseEnvelope>) => {
    const data = error.response?.data;
    const status = error.response?.status;
    const code = data?.code;

    // Handle Token Revoked or Expired
    if (status === 401 || code === '4010' || code === '4011') {
      setAuthToken(null);
      authChannel.postMessage({ type: 'LOGOUT' });
      // Redirect to login if not already there
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?reason=' + (code === '4011' ? 'token_revoked' : 'session_expired');
      }
    }

    // Handle DB or Storage Unavailable (503)
    if (status === 503 || code === '5030' || code === '5031') {
      const msg = code === '5031' ? 'ระบบจัดเก็บเอกสารไม่พร้อมใช้งานชั่วคราว' : 'ฐานข้อมูลระบบไม่พร้อมใช้งานชั่วคราว';
      serviceStatusListeners.forEach(listener => listener('DEGRADED', msg));
    }

    return Promise.reject(error);
  }
);
