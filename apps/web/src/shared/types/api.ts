export interface ApiResponse<T = any> {
  code: string;
  message: string;
  data: T;
  error?: any;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
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

export interface PaginatedResponse<T, M = PageMeta> {
  code: string;
  message: string;
  data: T[];
  meta?: M;
}

// Backwards-compatible alias for ResponseEnvelope
export type ResponseEnvelope<T = any, M = any> = {
  code: string;
  message: string;
  data: T;
  meta?: M;
  error?: any;
};
