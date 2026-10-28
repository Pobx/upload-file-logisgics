export type CustomerStatus = 'active' | 'inactive';

export interface Customer {
  id: string;
  name: string;
  customer_code?: string;
  tax_id?: string;
  contact_name?: string;
  contact_phone?: string;
  is_active: boolean;
  // Domain camelCase aliases
  customerCode?: string;
  taxId?: string;
  contactName?: string;
  contactPhone?: string;
  isActive?: boolean;
}

export interface CustomerFormData {
  name: string;
  customer_code?: string;
  tax_id?: string;
  contact_name?: string;
  contact_phone?: string;
}

export interface MergeCustomerParams {
  targetId: string;
  sourceId: string;
}
