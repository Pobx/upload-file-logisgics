import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../api/customerApi';
import { CreateCustomerRequestDto, UpdateCustomerRequestDto } from '../api/customerDto';
import { Customer } from '../types/customer';

export interface UseCustomersOptions {
  search?: string;
  initialSearch?: string;
  enabled?: boolean;
}

export const useCustomers = (options?: UseCustomersOptions) => {
  const queryClient = useQueryClient();
  const [internalSearch, setInternalSearch] = useState(options?.initialSearch ?? '');
  const search = options?.search !== undefined ? options.search : internalSearch;

  const customersQuery = useQuery<Customer[]>({
    queryKey: ['customers', search],
    queryFn: () => customerApi.getCustomers(search),
    enabled: options?.enabled ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerRequestDto) => customerApi.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerRequestDto }) =>
      customerApi.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerApi.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: ({ targetId, sourceId }: { targetId: string; sourceId: string }) =>
      customerApi.mergeCustomers(targetId, sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return {
    customers: customersQuery.data || [],
    isLoading: customersQuery.isLoading,
    isError: customersQuery.isError,
    error: customersQuery.error,
    refetch: customersQuery.refetch,
    search,
    setSearch: setInternalSearch,
    createMutation,
    updateMutation,
    deleteMutation,
    mergeMutation,
  };
};
