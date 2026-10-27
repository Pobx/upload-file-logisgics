import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  FileWarning, 
  Loader2,
  Camera
} from 'lucide-react';
import { apiClient, getUserInfo } from '../../lib/api-client';
import { JobDetailSlideover, canUploadDocuments } from './JobDetailSlideover';
import { BentoTriageHeader } from './charts/BentoTriageHeader';
import { MicroProgressBar } from './charts/MicroProgressBar';

export interface SearchItem {
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

export function filterSearchItems(items: SearchItem[], tab: string): SearchItem[] {
  if (tab === 'missing') {
    return items.filter(item => item.document_count < 4);
  }
  if (tab === 'complete') {
    return items.filter(item => item.document_count >= 4);
  }
  return items;
}

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const [field, setField] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'missing' | 'complete'>('all');
  const [selectedJob, setSelectedJob] = useState<SearchItem | null>(null);

  const userInfo = getUserInfo();
  const roles = userInfo?.roles || ['staff'];
  const userRole = roles.includes('admin') ? 'admin' : roles.includes('staff') ? 'staff' : 'viewer';
  const allowUpload = canUploadDocuments(userRole);

  useEffect(() => {
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', query, field],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (field !== 'all') params.append('field', field);
      params.append('size', '50');

      const res = await apiClient.get(`/search?${params.toString()}`);
      return (res.data?.data || []) as SearchItem[];
    },
  });

  const allItems = data || [];
  const filteredItems = filterSearchItems(allItems, activeTab);

  const totalCount = allItems.length;
  const completeCount = allItems.filter(i => i.document_count >= 4).length;
  const missingCount = allItems.filter(i => i.document_count < 4).length;
  const missingBLCount = allItems.filter(i => !i.bl_no).length;
  const pendingCount = allItems.filter(i => i.document_count > 0 && i.document_count < 4 && !!i.bl_no).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query) {
      setSearchParams({ q: query });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* 1. Bento Triage & Visual Charts Header */}
      <BentoTriageHeader
        completeCount={completeCount}
        missingBLCount={missingBLCount}
        pendingCount={pendingCount}
        totalCount={totalCount}
      />

      {/* 2. Main Search & Filter Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-4 md:p-5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาเลข Job No., B/L No., Invoice หรือชื่อลูกค้า..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="h-10.5 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="all">ทุกฟิลด์ข้อมูล</option>
                <option value="job_no">เลข Job No.</option>
                <option value="bl_no">เลข B/L No.</option>
                <option value="invoice_no">เลข Invoice No.</option>
              </select>
            </div>

            <button
              type="submit"
              className="h-10.5 px-5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              ค้นหา
            </button>
          </div>
        </form>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            ทั้งหมด ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('missing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'missing'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            รอเอกสารเพิ่ม ({missingCount})
          </button>
          <button
            onClick={() => setActiveTab('complete')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'complete'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            เอกสารครบ ({completeCount})
          </button>
        </div>
      </div>

      {/* 3. Results Presentation */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
            <span>กำลังสืบค้นข้อมูลในระบบ...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            ไม่พบรายการข้อมูลตามเงื่อนไขที่ค้นหา
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Job Order #</th>
                    <th className="py-3 px-4">ลูกค้า (Customer)</th>
                    <th className="py-3 px-4">B/L / Booking</th>
                    <th className="py-3 px-4">วันที่บันทึก</th>
                    <th className="py-3 px-4">สถานะความครบถ้วน</th>
                    <th className="py-3 px-4 text-right">การกระทำ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const isComplete = item.document_count >= 4;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedJob(item)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-semibold text-sky-600 group-hover:text-sky-700">
                          {item.job_no}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {item.customer_name}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {item.bl_no || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(item.created_at).toLocaleDateString('th-TH')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1.5 min-w-[130px]">
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                ครบถ้วน ({item.document_count}/4)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <FileWarning className="w-3 h-3" />
                                รอเอกสาร ({item.document_count}/4)
                              </span>
                            )}
                            <MicroProgressBar
                              hasInvoice={!!item.invoice_no}
                              hasPackingList={item.document_count >= 2}
                              hasBL={!!item.bl_no}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {allowUpload ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJob(item);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 transition-colors cursor-pointer"
                            >
                              <span>ดู & แนบไฟล์</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJob(item);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              <span>ดูรายละเอียด</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Cards View (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {filteredItems.map((item) => {
                const isComplete = item.document_count >= 4;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedJob(item)}
                    className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-sky-600 text-sm">{item.job_no}</span>
                      {isComplete ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ ครบ 4/4
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          ⚠️ รอเอกสาร ({item.document_count}/4)
                        </span>
                      )}
                    </div>

                    <div className="font-medium text-slate-800 text-xs mb-1">
                      {item.customer_name}
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono mb-2.5">
                      B/L: {item.bl_no || '-'} • {new Date(item.created_at).toLocaleDateString('th-TH')}
                    </div>

                    {/* Micro Progress Bar on Mobile Card */}
                    <div className="mb-3">
                      <MicroProgressBar
                        hasInvoice={!!item.invoice_no}
                        hasPackingList={item.document_count >= 2}
                        hasBL={!!item.bl_no}
                      />
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      {allowUpload ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(item);
                            }}
                            className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold text-center cursor-pointer"
                          >
                            + ดู & แนบไฟล์
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(item);
                            }}
                            title="ถ่ายรูปสแกนเอกสารด่วน"
                            className="p-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center justify-center cursor-pointer"
                            aria-label="สแกนหรือแนบไฟล์ด้วยกล้อง"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(item);
                          }}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold text-center cursor-pointer"
                        >
                          ดูรายละเอียด
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Slide-over Inspector Drawer (Desktop) & Bottom Sheet (Mobile) */}
      <JobDetailSlideover
        jobOrder={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
};
