import { ShipmentDto, DocumentDto } from './shipmentDto';
import { Shipment, DocumentItem } from '../types/shipment';

export const shipmentMapper = {
  toShipment(dto: ShipmentDto): Shipment {
    return {
      id: dto.id,
      job_no: dto.job_no,
      bl_no: dto.bl_no,
      invoice_no: dto.invoice_no,
      customer_name: dto.customer_name,
      document_count: dto.document_count,
      assignee_name: dto.assignee_name,
      created_at: dto.created_at,
      match_tier: dto.match_tier,
    };
  },

  toDocumentItem(dto: DocumentDto): DocumentItem {
    return {
      id: dto.id,
      job_order_id: dto.job_order_id,
      document_type_id: dto.document_type_id,
      file_name: dto.file_name,
      mime_type: dto.mime_type,
      size_bytes: dto.size_bytes,
      created_at: dto.created_at,
    };
  },
};
