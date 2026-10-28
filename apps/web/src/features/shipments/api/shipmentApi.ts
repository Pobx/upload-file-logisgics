import { httpClient } from '@/shared/lib/httpClient';
import { ApiResponse } from '@/shared/types/api';
import { ShipmentDto, DocumentDto } from './shipmentDto';
import { Shipment, DocumentItem } from '../types/shipment';
import { shipmentMapper } from './shipmentMapper';

export const shipmentApi = {
  searchShipments: async (
    query?: string,
    options?: { field?: string; size?: number }
  ): Promise<Shipment[]> => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (options?.field && options.field !== 'all') params.append('field', options.field);
    params.append('size', String(options?.size || 50));

    const res = await httpClient.get<ApiResponse<ShipmentDto[]>>(`/search?${params.toString()}`);
    const dtos = res.data?.data || [];
    return dtos.map(shipmentMapper.toShipment);
  },

  getShipmentDetail: async (id: string): Promise<Shipment | null> => {
    const res = await httpClient.get<ApiResponse<ShipmentDto>>(`/job-orders/${id}`);
    const dto = res.data?.data;
    return dto ? shipmentMapper.toShipment(dto) : null;
  },

  getShipmentDocuments: async (jobId: string): Promise<DocumentItem[]> => {
    const res = await httpClient.get<ApiResponse<DocumentDto[]>>(`/job-orders/${jobId}/documents`);
    const dtos = res.data?.data || [];
    return dtos.map(shipmentMapper.toDocumentItem);
  },

  uploadDocument: async (
    jobId: string,
    file: File,
    documentTypeId: number = 1
  ): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type_id', String(documentTypeId));

    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const res = await httpClient.post<ApiResponse<any>>(
      `/job-orders/${jobId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return res.data?.data;
  },

  deleteDocument: async (jobId: string, docId: string): Promise<void> => {
    await httpClient.delete(`/job-orders/${jobId}/documents/${docId}`);
  },
};
