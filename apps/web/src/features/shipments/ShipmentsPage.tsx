import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { getUserInfo } from '@/shared/lib/tokenStorage';
import { canUploadDocuments } from '../identity';
import { useShipmentSearch } from './hooks/useShipmentSearch';
import { useShipmentTriage } from './hooks/useShipmentTriage';
import { TopKPIRibbon } from './components/TopKPIRibbon';
import { BentoTriageHeader } from './components/BentoTriageHeader';
import { ActionQueueCards } from './components/ActionQueueCards';
import { JobDetailSlideover } from './components/JobDetailSlideover';
import { Shipment, SearchItem } from './types/shipment';
import { filterShipmentItems } from './utils/partitionMath';

// Backwards-compatible exports for existing tests/consumers
export type { Shipment, SearchItem };
export { filterShipmentItems as filterSearchItems };

export const ShipmentsPage: React.FC = () => {
  const {
    query,
    setQuery,
    field,
    setField,
    activeTab,
    setActiveTab,
    selectedJob,
    setSelectedJob,
    allItems,
    filteredItems,
    isLoading,
    handleSearchSubmit,
  } = useShipmentSearch();

  const {
    totalCount,
    missingBLCount,
    completeCount,
    pendingCount,
    missingCount,
  } = useShipmentTriage(allItems);

  const userInfo = getUserInfo();
  const roles = userInfo?.roles || ['viewer'];
  const userRole = roles.includes('admin') ? 'admin' : roles.includes('staff') ? 'staff' : 'viewer';
  const allowUpload = canUploadDocuments(userRole);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* 0. Top KPI Ribbon (Executive Summary) */}
      <TopKPIRibbon
        totalCount={totalCount}
        missingBLCount={missingBLCount}
        pendingCount={pendingCount}
        readyCount={completeCount}
      />

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
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto no-scrollbar">
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
        ) : (
          <ActionQueueCards
            items={filteredItems}
            onSelectJob={(job) => setSelectedJob(job)}
            allowUpload={allowUpload}
          />
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

// SearchPage alias pointing to ShipmentsPage
export const SearchPage = ShipmentsPage;
