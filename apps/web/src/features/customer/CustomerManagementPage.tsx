import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getUserInfo } from '../../lib/api-client';
import { Building2, Plus, Search, GitMerge, CheckCircle2, X, AlertCircle } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  customer_code?: string;
  tax_id?: string;
  contact_name?: string;
  contact_phone?: string;
  is_active: boolean;
}

export const CustomerManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedTargetCustomer, setSelectedTargetCustomer] = useState<Customer | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [taxId, setTaxId] = useState('');
  const [contactName, setContactName] = useState('');
  const [sourceId, setSourceId] = useState('');

  const userInfo = getUserInfo();
  const isAdmin = userInfo?.roles?.includes('admin') || false;

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', search],
    queryFn: async () => {
      const res = await apiClient.get(`/customers?page=1&size=50&q=${encodeURIComponent(search)}`);
      return res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      await apiClient.post('/customers', payload);
    },
    onSuccess: () => {
      setShowCreateModal(false);
      setName('');
      setCode('');
      setTaxId('');
      setContactName('');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ targetId, sourceId }: { targetId: string; sourceId: string }) => {
      await apiClient.post(`/customers/${targetId}/merge`, { source_customer_id: sourceId });
    },
    onSuccess: () => {
      setShowMergeModal(false);
      setSelectedTargetCustomer(null);
      setSourceId('');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      customer_code: code || undefined,
      tax_id: taxId || undefined,
      contact_name: contactName || undefined,
    });
  };

  const handleMerge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetCustomer || !sourceId) return;
    mergeMutation.mutate({
      targetId: selectedTargetCustomer.id,
      sourceId,
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Page Header */}
      <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            ข้อมูลลูกค้าและคู่ค้า (Customer Directory)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ค้นหาและจัดการฐานข้อมูลลูกค้า รหัสสาขา เลขประจำตัวผู้เสียภาษี (Tax ID)
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มลูกค้าใหม่</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อลูกค้า, รหัสลูกค้า, หรือ Tax ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
          />
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            กำลังโหลดข้อมูลลูกค้า...
          </div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            ไม่พบรายชื่อลูกค้า
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">รหัสลูกค้า</th>
                    <th className="py-3 px-4">ชื่อลูกค้า / บริษัท</th>
                    <th className="py-3 px-4">เลขประจำตัวผู้เสียภาษี (Tax ID)</th>
                    <th className="py-3 px-4">ผู้ติดต่อ</th>
                    <th className="py-3 px-4">สถานะ</th>
                    {isAdmin && <th className="py-3 px-4 text-right">การจัดการ (Admin)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">
                        {c.customer_code || '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {c.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {c.tax_id || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {c.contact_name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          ใช้งานปกติ
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedTargetCustomer(c);
                              setShowMergeModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium transition-colors text-xs cursor-pointer"
                            title="รวมข้อมูลลูกค้าซ้ำซ้อนเข้ากับลูกค้ารายนี้"
                          >
                            <GitMerge className="w-3.5 h-3.5 text-purple-600" />
                            <span>รวมข้อมูล (Merge)</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-2.5">
              {customers.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-bold text-slate-900 text-xs">{c.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-600">
                      {c.customer_code || 'No Code'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mb-2">
                    Tax ID: {c.tax_id || '-'} • ผู้ติดต่อ: {c.contact_name || '-'}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSelectedTargetCustomer(c);
                        setShowMergeModal(true);
                      }}
                      className="w-full py-1 text-xs border border-purple-200 bg-purple-50 text-purple-700 rounded font-medium flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>รวมข้อมูลลูกค้านี้ (Merge)</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal: Create Customer */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">เพิ่มลูกค้าใหม่ในระบบ</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อลูกค้า / บริษัท *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                  placeholder="เช่น บจก. สยามขนส่งโลจิสติกส์"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">รหัสลูกค้า (Customer Code)</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                  placeholder="เช่น CUST-BKK-001"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                  placeholder="13 หลัก เช่น 0105558123456"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อผู้ติดต่อ</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium text-slate-700 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer shadow-xs"
                >
                  {createMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกลูกค้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Merge Customers (Admin Only) */}
      {showMergeModal && selectedTargetCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-purple-600" />
                รวมข้อมูลลูกค้า (Customer Merge)
              </h3>
              <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-900 mb-4">
              <div className="font-semibold">ลูกค้ารายหลักที่จะเก็บไว้ (Target):</div>
              <div className="text-sm font-bold mt-0.5">{selectedTargetCustomer.name}</div>
              <div className="text-[11px] text-purple-700 font-mono">ID: {selectedTargetCustomer.id}</div>
            </div>

            <form onSubmit={handleMerge} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลือกลูกค้าที่จะนำมารวม (Source - จะถูกโอนย้ายงานและปิดการใช้งาน):
                </label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- เลือกลูกค้าต้นทาง --</option>
                  {customers
                    .filter((c) => c.id !== selectedTargetCustomer.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.tax_id ? `(Tax: ${c.tax_id})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>คำเตือน: Job Orders ทั้งหมดของลูกค้าต้นทางจะถูกย้ายมารวมกับลูกค้ารายนี้อย่างถาวร</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium text-slate-700 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={mergeMutation.isPending || !sourceId}
                  className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {mergeMutation.isPending ? 'กำลังรวมข้อมูล...' : 'ยืนยันการรวมลูกค้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
