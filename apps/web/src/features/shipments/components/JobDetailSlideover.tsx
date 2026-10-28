import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { apiClient, ResponseEnvelope, getUserInfo } from '../../../lib/api-client';

import { DocumentItem } from '../types/shipment';
export type { DocumentItem };

export interface JobDetailSlideoverProps {
  jobOrder: {
    id: string;
    job_no: string;
    customer_name: string;
    bl_no?: string | null;
    invoice_no?: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

import { canUploadDocuments, canDeleteDocuments } from '../../identity';
export { canUploadDocuments, canDeleteDocuments };

const DOCUMENT_TYPES = [
  { id: 1, name: 'Bill of Lading (B/L)', code: 'BL' },
  { id: 2, name: 'Commercial Invoice', code: 'INV' },
  { id: 3, name: 'Packing List', code: 'PL' },
  { id: 4, name: 'Customs Declaration', code: 'CUSTOMS' },
];

export const JobDetailSlideover: React.FC<JobDetailSlideoverProps> = ({
  jobOrder,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<number>(1);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const userInfo = getUserInfo();
  const roles = userInfo?.roles || ['staff'];
  const userRole = roles.includes('admin') ? 'admin' : roles.includes('staff') ? 'staff' : 'viewer';
  const allowUpload = canUploadDocuments(userRole);
  const allowDelete = canDeleteDocuments(userRole);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Query: Get documents for this job order
  const { data: documents = [], isLoading } = useQuery<DocumentItem[]>({
    queryKey: ['job-documents', jobOrder?.id],
    queryFn: async () => {
      if (!jobOrder?.id) return [];
      const res = await apiClient.get<ResponseEnvelope<DocumentItem[]>>(`/job-orders/${jobOrder.id}/documents`);
      return res.data.data || [];
    },
    enabled: isOpen && !!jobOrder?.id,
  });

  // Mutation: Upload document
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadError(null);
      setUploadSuccess(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type_id', String(selectedDocTypeId));

      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      const res = await apiClient.post<ResponseEnvelope<any>>(
        `/job-orders/${jobOrder?.id}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Idempotency-Key': idempotencyKey,
          },
        }
      );
      return res.data;
    },
    onSuccess: () => {
      setUploadSuccess('อัปโหลดเอกสารสำเร็จเรียบร้อยแล้ว');
      queryClient.invalidateQueries({ queryKey: ['job-documents', jobOrder?.id] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
    },
    onError: (err: any) => {
      setUploadError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    },
  });

  // Mutation: Delete document (admin)
  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      await apiClient.delete(`/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-documents', jobOrder?.id] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });

  const handleDownload = async (docId: string) => {
    try {
      const res = await apiClient.get<ResponseEnvelope<{ download_url: string }>>(`/documents/${docId}/download-link`);
      const url = res.data.data.download_url;
      if (url) {
        window.open(url, '_blank');
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'ไม่สามารถสร้างลิงก์ดาวน์โหลดได้');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadMutation.mutate(e.target.files[0]);
      e.target.value = '';
    }
  };

  if (!isOpen || !jobOrder) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer / Bottom Sheet Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <aside 
          className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col z-10 transition-transform duration-300"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                  Job Inspector
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {jobOrder.bl_no ? `B/L: ${jobOrder.bl_no}` : ''}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{jobOrder.job_no}</h2>
              <p className="text-xs text-slate-600 truncate max-w-xs">{jobOrder.customer_name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Upload Area (Hidden for Viewer) */}
            {allowUpload ? (
              <div className="space-y-3 bg-sky-50/40 border border-sky-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    แนบเอกสารเข้า Job นี้
                  </label>
                  <select
                    value={selectedDocTypeId}
                    onChange={(e) => setSelectedDocTypeId(Number(e.target.value))}
                    className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-700 outline-none focus:border-sky-500"
                  >
                    {DOCUMENT_TYPES.map((dt) => (
                      <option key={dt.id} value={dt.id}>
                        {dt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dropzone */}
                <label className="border-2 border-dashed border-sky-300 hover:border-sky-500 bg-white hover:bg-sky-50/30 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-all group">
                  <UploadCloud className="w-8 h-8 text-sky-500 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-xs font-semibold text-slate-800">
                    ลากไฟล์มาวาง หรือแตะเพื่อเลือกไฟล์
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    รองรับ PDF, รูปภาพ (PNG, JPEG) สูงสุด 50MB
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploadMutation.isPending}
                  />
                </label>

                {uploadMutation.isPending && (
                  <div className="flex items-center justify-center gap-2 text-xs text-sky-600 py-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังอัปโหลดเอกสาร...</span>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md p-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                {uploadError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md p-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-500">
                🔒 โหมดอ่านอย่างเดียว (Viewer): ไม่สามารถแนบหรือแก้ไขเอกสารได้
              </div>
            )}

            {/* Checklist Overview */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                ความครบถ้วนของเอกสาร (Document Checklist)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {DOCUMENT_TYPES.map((dt) => {
                  const hasDoc = documents.some((d) => d.document_type_id === dt.id);
                  return (
                    <div
                      key={dt.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium ${
                        hasDoc
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50/40 border-amber-200 text-amber-800'
                      }`}
                    >
                      {hasDoc ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <span className="truncate">{dt.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Existing Documents List */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  เอกสารที่จัดเก็บแล้ว ({documents.length})
                </h3>
              </div>

              {isLoading ? (
                <div className="text-center py-6 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                  <span>กำลังโหลดข้อมูลเอกสาร...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-400">
                  ยังไม่มีเอกสารแนบใน Job นี้
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <FileText className="w-5 h-5 text-sky-600 shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-slate-800 truncate" title={doc.file_name}>
                            {doc.file_name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {(doc.size_bytes / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString('th-TH')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDownload(doc.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                          title="ดาวน์โหลดไฟล์ผ่าน Signed Link"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          <span>ดูไฟล์</span>
                        </button>

                        {allowDelete && (
                          <button
                            onClick={() => {
                              if (confirm('คุณแน่ใจว่าต้องการลบเอกสารนี้ใช่หรือไม่?')) {
                                deleteMutation.mutate(doc.id);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="ลบเอกสาร (Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
