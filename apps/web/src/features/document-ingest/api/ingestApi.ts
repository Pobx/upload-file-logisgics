import { httpClient } from '@/shared/lib/httpClient';
import { ApiResponse } from '@/shared/types/api';
import {
  CSVImportResult,
  ImportHistoryItem,
  UploadCSVOptions,
  CommitBatchOptions,
  CommitBatchResponse,
} from '../types/import';

export const ingestApi = {
  uploadCSV: async (file: File, options?: UploadCSVOptions): Promise<CSVImportResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const idemKey =
      options?.idempotencyKey ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()));

    const res = await httpClient.post<ApiResponse<CSVImportResult>>('/imports', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Idempotency-Key': idemKey,
      },
      onUploadProgress: options?.onUploadProgress,
    });
    return res.data?.data as CSVImportResult;
  },

  commitBatch: async ({ batchId, policy }: CommitBatchOptions): Promise<CommitBatchResponse> => {
    const res = await httpClient.post<ApiResponse<CommitBatchResponse>>(`/imports/${batchId}/commit`, {
      conflict_policy: policy,
    });
    return (res.data?.data || {
      batch_id: batchId,
      status: 'queued',
      policy,
    }) as CommitBatchResponse;
  },

  getImportHistory: async (page = 1, size = 20): Promise<ImportHistoryItem[]> => {
    const res = await httpClient.get<ApiResponse<ImportHistoryItem[]>>(
      `/imports?page=${page}&size=${size}`
    );
    return res.data?.data || [];
  },

  getImportStatus: async (batchId: string): Promise<ImportHistoryItem> => {
    const res = await httpClient.get<ApiResponse<ImportHistoryItem>>(`/imports/${batchId}`);
    return res.data?.data;
  },

  downloadTemplate: async (): Promise<Blob> => {
    try {
      const res = await httpClient.get('/imports/template', { responseType: 'blob' });
      return res.data;
    } catch {
      const csvContent =
        'JobOrder,B/L,Invoice,Customer Name\nJOB-2026-0001,BL-123456,INV-9999,Sample Customer Ltd\n';
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }
  },
};
