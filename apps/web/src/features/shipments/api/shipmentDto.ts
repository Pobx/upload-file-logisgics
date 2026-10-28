export interface ShipmentDto {
  id: string;
  job_no: string;
  bl_no?: string | null;
  invoice_no?: string | null;
  customer_name: string;
  document_count: number;
  assignee_name?: string | null;
  created_at: string;
  match_tier: number;
}

export interface DocumentDto {
  id: string;
  job_order_id: string;
  document_type_id: number;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface SearchShipmentsParams {
  query?: string;
  field?: string;
  size?: number;
}
