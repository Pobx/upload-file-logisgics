import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Search, Download, FileText, ChevronRight, Filter } from 'lucide-react';

interface SearchItem {
  id: string;
  job_no: string;
  bl_no?: string;
  invoice_no?: string;
  customer_name: string;
  document_count: number;
  assignee_name?: string;
  created_at: string;
  match_tier: number;
}

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [field, setField] = useState('all');
  const [cursor, setCursor] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['search', query, field, cursor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (field !== 'all') params.append('field', field);
      if (cursor) params.append('cursor', cursor);
      params.append('size', '20');

      const res = await apiClient.get(`/search?${params.toString()}`);
      return {
        items: (res.data?.data || []) as SearchItem[],
        meta: res.data?.meta,
      };
    },
  });

  const handleDownload = async (docId: string) => {
    try {
      const res = await apiClient.get(`/documents/${docId}/download-link`);
      const url = res.data?.data?.download_url;
      if (url) {
        window.open(url, '_blank');
      }
    } catch {
      alert('ไม่สามารถดาวน์โหลดเอกสารได้');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Search Filter Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-600" />
          ค้นหาเอกสารโลจิสติกส์ (High-Speed Search Engine)
        </h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="sm:w-44">
            <select
              value={field}
              onChange={(e) => {
                setField(e.target.value);
                setCursor(null);
              }}
              className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">ทั้งหมด (All Fields)</option>
              <option value="job_no">Job Order No</option>
              <option value="bl_no">Bill of Lading (B/L)</option>
              <option value="invoice_no">Invoice No</option>
            </select>
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="พิมพ์คำค้นหา (เช่น JO-2026, BL-TH, หรือชื่อบริษัท)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(null);
              }}
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400 mt-3">
          <span className="flex items-center gap-1 font-medium text-slate-500">
            <Filter className="w-3.5 h-3.5" /> ลำดับผลลัพธ์:
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">● Tier 1: Exact Match</span>
          <span className="inline-flex items-center gap-1 text-blue-600 font-medium">● Tier 2: Prefix Match</span>
          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">● Tier 3: Contains Match</span>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3.5">Tier</th>
              <th className="px-6 py-3.5">Job Order</th>
              <th className="px-6 py-3.5">B/L</th>
              <th className="px-6 py-3.5">Invoice</th>
              <th className="px-6 py-3.5">ลูกค้า (Customer)</th>
              <th className="px-6 py-3.5">เอกสาร</th>
              <th className="px-6 py-3.5 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  กำลังค้นหาข้อมูล...
                </td>
              </tr>
            ) : data && data.items.length > 0 ? (
              data.items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        it.match_tier === 1
                          ? 'bg-emerald-100 text-emerald-800'
                          : it.match_tier === 2
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      T{it.match_tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{it.job_no}</td>
                  <td className="px-6 py-4">{it.bl_no || '-'}</td>
                  <td className="px-6 py-4">{it.invoice_no || '-'}</td>
                  <td className="px-6 py-4">{it.customer_name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      {it.document_count} ไฟล์
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDownload(it.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> ดาวน์โหลด
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  ไม่พบผลลัพธ์ที่ตรงกับคำค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Keyset Pagination Footer */}
        {data?.meta && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>แสดงผลลัพธ์ {data.items.length} รายการ</div>
            <div>
              {data.meta.has_next && (
                <button
                  onClick={() => setCursor(data.meta.next_cursor)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                >
                  หน้าถัดไป (Keyset Next) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
