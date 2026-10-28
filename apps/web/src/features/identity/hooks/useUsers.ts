import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/userApi';
import { CreateUserRequestDto, UserDto } from '../api/identityDto';
import { getUserInfo } from '@/shared/lib/tokenStorage';

export const useUsers = (options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();
  const userInfo = getUserInfo();
  const isAdmin = userInfo?.roles?.includes('admin') || false;
  const isEnabled = options?.enabled ?? isAdmin;

  const usersQuery = useQuery<UserDto[]>({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers(1, 50),
    enabled: isEnabled,
  });

  const syncMutation = useMutation({
    mutationFn: () => userApi.syncUsers(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserRequestDto) => userApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: (sub: string) => userApi.disableUser(sub),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ sub, role }: { sub: string; role: string }) => userApi.updateUserRole(sub, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return {
    users: usersQuery.data || [],
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
    syncMutation,
    createMutation,
    disableMutation,
    updateRoleMutation,
  };
};
