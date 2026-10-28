export interface CustomerDto {
  id: string;
  name: string;
  customer_code?: string;
  tax_id?: string;
  contact_name?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCustomerRequestDto {
  name: string;
  customer_code?: string;
  tax_id?: string;
  contact_name?: string;
  contact_phone?: string;
}

export interface UpdateCustomerRequestDto {
  name?: string;
  customer_code?: string;
  tax_id?: string;
  contact_name?: string;
  contact_phone?: string;
  is_active?: boolean;
}

export interface MergeCustomerRequestDto {
  source_customer_id: string;
}
