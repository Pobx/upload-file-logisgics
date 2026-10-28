import { httpClient } from '@/shared/lib/httpClient';
import { clearAuthToken, getUserInfo, setAuthToken } from '@/shared/lib/tokenStorage';
import { ApiResponse } from '@/shared/types/api';
import { UserInfo } from '../types/auth';
import { LoginRequestDto, LoginResponseDto } from './identityDto';

export const authApi = {
  login: async (credentials: LoginRequestDto): Promise<LoginResponseDto> => {
    const res = await httpClient.post<ApiResponse<LoginResponseDto>>('/auth/login', credentials);
    const data = res.data?.data;
    if (data?.access_token) {
      setAuthToken(data.access_token);
    }
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await httpClient.post('/auth/logout').catch(() => {});
    } finally {
      clearAuthToken();
    }
  },

  verifySession: (): UserInfo | null => {
    return getUserInfo();
  },
};
