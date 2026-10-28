import { httpClient } from '@/shared/lib/httpClient';
import { ApiResponse } from '@/shared/types/api';
import { CreateUserRequestDto, UserDto } from './identityDto';

export const userApi = {
  getUsers: async (page = 1, size = 50): Promise<UserDto[]> => {
    const res = await httpClient.get<ApiResponse<UserDto[]>>(`/users?page=${page}&size=${size}`);
    return res.data?.data || [];
  },

  createUser: async (payload: CreateUserRequestDto): Promise<void> => {
    await httpClient.post<ApiResponse<void>>('/users', payload);
  },

  disableUser: async (sub: string): Promise<void> => {
    await httpClient.delete<ApiResponse<void>>(`/users/${sub}`);
  },

  updateUserRole: async (sub: string, role: string): Promise<void> => {
    await httpClient.put<ApiResponse<void>>(`/users/${sub}/roles`, { role });
  },

  syncUsers: async (): Promise<void> => {
    await httpClient.post<ApiResponse<void>>('/users/sync');
  },
};
