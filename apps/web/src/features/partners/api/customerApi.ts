import { httpClient } from '@/shared/lib/httpClient';
import { ApiResponse } from '@/shared/types/api';
import {
  CustomerDto,
  CreateCustomerRequestDto,
  UpdateCustomerRequestDto,
} from './customerDto';

export const customerApi = {
  getCustomers: async (search = '', page = 1, size = 50): Promise<CustomerDto[]> => {
    const query = search ? `&q=${encodeURIComponent(search)}` : '';
    const res = await httpClient.get<ApiResponse<CustomerDto[]>>(
      `/customers?page=${page}&size=${size}${query}`
    );
    return res.data?.data || [];
  },

  createCustomer: async (payload: CreateCustomerRequestDto): Promise<CustomerDto> => {
    const res = await httpClient.post<ApiResponse<CustomerDto>>('/customers', payload);
    return res.data?.data;
  },

  updateCustomer: async (id: string, payload: UpdateCustomerRequestDto): Promise<CustomerDto> => {
    const res = await httpClient.put<ApiResponse<CustomerDto>>(`/customers/${id}`, payload);
    return res.data?.data;
  },

  deleteCustomer: async (id: string): Promise<void> => {
    await httpClient.delete<ApiResponse<void>>(`/customers/${id}`);
  },

  mergeCustomers: async (targetId: string, sourceId: string): Promise<void> => {
    await httpClient.post<ApiResponse<void>>(`/customers/${targetId}/merge`, {
      source_customer_id: sourceId,
    });
  },
};
