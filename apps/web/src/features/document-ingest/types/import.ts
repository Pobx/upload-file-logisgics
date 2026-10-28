export type ConflictPolicy = 'keep_existing' | 'overwrite_incoming' | 'use_csv';

export interface PreviewRow {
  row_no: number;
  job_no: string;
  bl_no: string;
  invoice_no: string;
  customer_name: string;
}

export interface PreviewSummary {
  batch_id: string;
  file_name: string;
  total_rows: number;
  new_rows: number;
  matched_rows: number;
  fills_blank: number;
  conflicts: number;
  errors: number;
  preview_rows: PreviewRow[];
}

export type CSVImportResult = PreviewSummary;

export interface ImportValidationResult {
  isValid: boolean;
  errors?: string[];
  totalRows?: number;
}

export interface ImportHistoryItem {
  id: string;
  batch_id?: string;
  file_name: string;
  status: 'pending' | 'processing' | 'queued' | 'completed' | 'failed';
  total_rows: number;
  new_rows?: number;
  matched_rows?: number;
  fills_blank?: number;
  conflicts?: number;
  created_at: string;
  committed_at?: string;
}

export interface UploadCSVOptions {
  idempotencyKey?: string;
  onUploadProgress?: (progressEvent: any) => void;
}

export interface CommitBatchOptions {
  batchId: string;
  policy: ConflictPolicy | string;
}

export interface CommitBatchResponse {
  batch_id: string;
  status: string;
  policy: string;
}
