import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Building2, Plus, Search, GitMerge } from 'lucide-react';

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

  const { data: customers, isLoading } = useQuery<Customer[]>({
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            การจัดการข้อมูลลูกค้า (Customer Management)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ฐานข้อมูลลูกค้าทางธุรกิจที่เป็นเจ้าของ Job Order พร้อมระบบ Merge ป้องกันชื่อซ้ำ
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          เพิ่มลูกค้าใหม่
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า หรือ รหัสลูกค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3.5">ชื่อลูกค้า</th>
              <th className="px-6 py-3.5">รหัสลูกค้า</th>
              <th className="px-6 py-3.5">Tax ID</th>
              <th className="px-6 py-3.5">ผู้ติดต่อ</th>
              <th className="px-6 py-3.5">สถานะ</th>
              <th className="px-6 py-3.5 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  กำลังโหลดข้อมูลลูกค้า...
                </td>
              </tr>
            ) : customers && customers.length > 0 ? (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-800">{c.name}</td>
                  <td className="px-6 py-4">{c.customer_code || '-'}</td>
                  <td className="px-6 py-4">{c.tax_id || '-'}</td>
                  <td className="px-6 py-4">{c.contact_name || '-'}</td>
                  <td className="px-6 py-4">
                    {c.is_active ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                        ใช้งานอยู่
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                        ปิดใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {c.is_active && (
                      <button
                        onClick={() => {
                          setSelectedTargetCustomer(c);
                          setShowMergeModal(true);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                        Merge รายการ
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  ไม่พบข้อมูลลูกค้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">เพิ่มลูกค้าใหม่</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อลูกค้า (Customer Name) *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">รหัสลูกค้า</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tax ID</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อผู้ติดต่อ</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                >
                  {createMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && selectedTargetCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-indigo-600" />
              รวมรายการลูกค้า (Merge Customer)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              ย้าย Job Orders ทั้งหมดจากลูกค้ารายอื่นมายัง <b>{selectedTargetCustomer.name}</b> และปิดการใช้งานรายการเดิม
            </p>

            <form onSubmit={handleMerge} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  เลือกลูกค้าที่จะยุบรวม (Source Customer ID)
                </label>
                <select
                  required
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">-- เลือกลูกค้าที่จะรวมเข้ามา --</option>
                  {customers
                    ?.filter((c) => c.id !== selectedTargetCustomer.id && c.is_active)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.customer_code ? `(${c.customer_code})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={mergeMutation.isPending || !sourceId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                >
                  {mergeMutation.isPending ? 'กำลังรวม...' : 'ยืนยันการรวมรายการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
