import React from 'react';
import { Upload, CheckCircle2, FileSpreadsheet, Play, AlertCircle } from 'lucide-react';
import { useCSVImport } from './hooks/useCSVImport';

export const CSVImportPage: React.FC = () => {
  const {
    summary,
    conflictPolicy,
    setConflictPolicy,
    committedBatchId,
    uploadMutation,
    commitMutation,
    handleFileSelect,
    handleCommit,
    reset,
  } = useCSVImport();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileSelect(file);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-sky-600" />
          นำเข้าข้อมูล Job Order จากไฟล์ CSV (CSV Import & Reconcile)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          ระบบตรวจเทียบข้อมูลอัตโนมัติ (Dry-Run Reconciliation) ตรวจสอบความถูกต้องและจำแนกข้อมูลก่อนบันทึกจริง
        </p>
      </div>

      {/* Upload Drop Zone */}
      {!summary && (
        <div className="bg-white p-8 md:p-12 rounded-xl border-2 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50/30 hover:bg-sky-50/20 text-center transition-all">
          <input
            type="file"
            accept=".csv"
            id="csv-file-input"
            className="hidden"
            onChange={handleFileChange}
          />
          <label htmlFor="csv-file-input" className="cursor-pointer block">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
              <Upload className="w-7 h-7" />
            </div>
            <p className="text-sm md:text-base font-semibold text-slate-800">
              คลิกเพื่อเลือกไฟล์ CSV หรือลากไฟล์มาวางที่นี่
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              รองรับไฟล์ขนาดสูงสุด 50MB (UTF-8) พร้อมคอลัมน์มาตรฐาน: JobOrder, B/L, Invoice, Customer Name
            </p>
          </label>
          {uploadMutation.isPending && (
            <div className="mt-4 text-xs font-semibold text-sky-600 animate-pulse flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping"></span>
              กำลังวิเคราะห์และตรวจเทียบข้อมูล (Dry-Run Reconcile)...
            </div>
          )}
          {uploadMutation.isError && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg max-w-md mx-auto flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>เกิดข้อผิดพลาดในการอ่านไฟล์ CSV กรุณาตรวจสอบรูปแบบไฟล์</span>
            </div>
          )}
        </div>
      )}

      {/* Reconcile Summary Dashboard */}
      {summary && !committedBatchId && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-slate-400">
              <div className="text-xs font-medium text-slate-500">จำนวนทั้งหมด</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_rows}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 border-l-4 border-l-emerald-500">
              <div className="text-xs font-medium text-emerald-700">รายการใหม่ (New)</div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">{summary.new_rows}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-sky-200 bg-sky-50/30 border-l-4 border-l-sky-500">
              <div className="text-xs font-medium text-sky-700">ตรงกัน (Matched)</div>
              <div className="text-2xl font-bold text-sky-800 mt-1">{summary.matched_rows}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 border-l-4 border-l-indigo-500">
              <div className="text-xs font-medium text-indigo-700">เติมช่องว่าง (Fills Blank)</div>
              <div className="text-2xl font-bold text-indigo-800 mt-1">{summary.fills_blank}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 border-l-4 border-l-amber-500">
              <div className="text-xs font-medium text-amber-700">ขัดแย้ง (Conflict)</div>
              <div className="text-2xl font-bold text-amber-800 mt-1">{summary.conflicts}</div>
            </div>
          </div>

          {/* Conflict Policy Selector & Commit Button */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-800">นโยบายจัดการข้อมูลขัดแย้ง (Conflict Policy):</div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-2 text-xs">
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="policy"
                    value="keep_existing"
                    checked={conflictPolicy === 'keep_existing'}
                    onChange={(e) => setConflictPolicy(e.target.value)}
                  />
                  <span>คงค่าเดิมในระบบไว้ (Keep Existing)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="policy"
                    value="overwrite_incoming"
                    checked={conflictPolicy === 'overwrite_incoming'}
                    onChange={(e) => setConflictPolicy(e.target.value)}
                  />
                  <span>เขียนทับด้วยข้อมูลจากไฟล์ CSV (Overwrite)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={reset}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCommit}
                disabled={commitMutation.isPending}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>{commitMutation.isPending ? 'กำลังประมวลผล...' : 'ยืนยันนำเข้าข้อมูล (Commit Batch)'}</span>
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-semibold text-xs text-slate-800">
              ตัวอย่างรายการข้อมูล (Preview Rows)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase">
                    <th className="py-2.5 px-4">แถว #</th>
                    <th className="py-2.5 px-4">Job Order</th>
                    <th className="py-2.5 px-4">B/L No.</th>
                    <th className="py-2.5 px-4">Invoice No.</th>
                    <th className="py-2.5 px-4">ลูกค้า (Customer Name)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.preview_rows.map((row) => (
                    <tr key={row.row_no} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-400 font-mono">{row.row_no}</td>
                      <td className="py-2.5 px-4 font-semibold text-sky-700">{row.job_no}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{row.bl_no || '-'}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{row.invoice_no || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-800">{row.customer_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Committed Result Card */}
      {committedBatchId && (
        <div className="bg-white p-8 rounded-2xl border border-emerald-200 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">นำเข้าข้อมูลเสร็จสิ้นเรียบร้อยแล้ว</h2>
            <p className="text-xs text-slate-500 mt-1">Batch ID: {committedBatchId}</p>
          </div>
          <div className="pt-2">
            <button
              onClick={reset}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
            >
              นำเข้าไฟล์ใหม่ต่อ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
