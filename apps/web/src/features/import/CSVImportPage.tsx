import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Upload, CheckCircle2, FileSpreadsheet, Play, Layers } from 'lucide-react';

interface PreviewSummary {
  batch_id: string;
  file_name: string;
  total_rows: number;
  new_rows: number;
  matched_rows: number;
  fills_blank: number;
  conflicts: number;
  errors: number;
  preview_rows: Array<{
    row_no: number;
    job_no: string;
    bl_no: string;
    invoice_no: string;
    customer_name: string;
  }>;
}

export const CSVImportPage: React.FC = () => {
  const [summary, setSummary] = useState<PreviewSummary | null>(null);
  const [conflictPolicy, setConflictPolicy] = useState('keep_existing');
  const [committedBatchId, setCommittedBatchId] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      // Generate Idempotency-Key
      const idemKey = crypto.randomUUID();
      const res = await apiClient.post('/imports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Idempotency-Key': idemKey,
        },
      });
      return res.data?.data as PreviewSummary;
    },
    onSuccess: (data) => {
      setSummary(data);
    },
  });

  const commitMutation = useMutation({
    mutationFn: async ({ batchId, policy }: { batchId: string; policy: string }) => {
      await apiClient.post(`/imports/${batchId}/commit`, {
        conflict_policy: policy,
      });
      return batchId;
    },
    onSuccess: (batchId) => {
      setCommittedBatchId(batchId);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      uploadMutation.mutate(file);
    }
  };

  const handleCommit = () => {
    if (!summary) return;
    commitMutation.mutate({
      batchId: summary.batch_id,
      policy: conflictPolicy,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          นำเข้าข้อมูล Job Order จากไฟล์ CSV (CSV Import & Reconcile)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          ระบบตรวจเทียบข้อมูลอัตโนมัติ (Reconcile) แบ่งประเภทเป็น New, Matched, Fills Blank, และ Conflict
        </p>
      </div>

      {/* Upload Box */}
      {!summary && (
        <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-300 text-center hover:bg-slate-50 transition-colors">
          <input
            type="file"
            accept=".csv"
            id="csv-file-input"
            className="hidden"
            onChange={handleFileChange}
          />
          <label htmlFor="csv-file-input" className="cursor-pointer block">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">คลิกเพื่อเลือกไฟล์ CSV หรือลากไฟล์มาวางที่นี่</p>
            <p className="text-xs text-slate-400 mt-1">ขนาดสูงสุด 50 MB, UTF-8 พร้อม Header: JobOrder, B/L, Invoice, Customer Name</p>
          </label>
          {uploadMutation.isPending && (
            <div className="mt-4 text-sm font-medium text-indigo-600 animate-pulse">
              กำลังวิเคราะห์และตรวจเทียบข้อมูล (Dry-Run Reconcile)...
            </div>
          )}
        </div>
      )}

      {/* Reconcile Summary Dashboard */}
      {summary && !committedBatchId && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500">จำนวนทั้งหมด</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{summary.total_rows}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
              <div className="text-xs font-medium text-emerald-700">รายการใหม่ (New)</div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">{summary.new_rows}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30">
              <div className="text-xs font-medium text-blue-700">ตรงกัน (Matched)</div>
              <div className="text-2xl font-bold text-blue-800 mt-1">{summary.matched_rows}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/30">
              <div className="text-xs font-medium text-indigo-700">เติมช่องว่าง (Fills Blank)</div>
              <div className="text-2xl font-bold text-indigo-800 mt-1">{summary.fills_blank}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30">
              <div className="text-xs font-medium text-amber-700">ขัดแย้ง (Conflict)</div>
              <div className="text-2xl font-bold text-amber-800 mt-1">{summary.conflicts}</div>
            </div>
          </div>

          {/* Conflict Policy Selector & Commit Button */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-800">นโยบายจัดการข้อมูลขัดแย้ง (Conflict Policy):</div>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="policy"
                    value="keep_existing"
                    checked={conflictPolicy === 'keep_existing'}
                    onChange={(e) => setConflictPolicy(e.target.value)}
                  />
                  <span>คงค่าเดิมในระบบไว้ (Keep Existing - ปลอดภัยที่สุด)</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="policy"
                    value="use_csv"
                    checked={conflictPolicy === 'use_csv'}
                    onChange={(e) => setConflictPolicy(e.target.value)}
                  />
                  <span>เขียนทับด้วยข้อมูลจาก CSV (Use CSV)</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleCommit}
              disabled={commitMutation.isPending}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
            >
              <Play className="w-4 h-4" />
              {commitMutation.isPending ? 'กำลังเริ่มประมวลผล...' : 'ยืนยันนำเข้าข้อมูล (Commit)'}
            </button>
          </div>

          {/* Preview Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              ตัวอย่างข้อมูล 100 แถวแรกจากไฟล์ {summary.file_name}
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">แถวที่</th>
                    <th className="px-4 py-2.5">Job Order</th>
                    <th className="px-4 py-2.5">B/L</th>
                    <th className="px-4 py-2.5">Invoice</th>
                    <th className="px-4 py-2.5">ชื่อลูกค้า (Customer)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.preview_rows.map((r) => (
                    <tr key={r.row_no} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-400">{r.row_no}</td>
                      <td className="px-4 py-2 font-medium text-slate-800">{r.job_no}</td>
                      <td className="px-4 py-2">{r.bl_no || '-'}</td>
                      <td className="px-4 py-2">{r.invoice_no || '-'}</td>
                      <td className="px-4 py-2">{r.customer_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Committed Progress Status */}
      {committedBatchId && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800 mb-1">ส่งงานเข้าคิวประมวลผลเบื้องหลังแล้ว (Queued)</h2>
          <p className="text-sm text-slate-500 mb-4">
            ระบบกำลังประมวลผลด้วย River Worker ทีละ Chunk 1,000 แถว ข้อมูลกำลังทยอยบันทึกเข้าสู่ระบบ
          </p>
          <div className="inline-flex gap-3">
            <button
              onClick={() => {
                setSummary(null);
                setCommittedBatchId(null);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              นำเข้าไฟล์ใหม่
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
