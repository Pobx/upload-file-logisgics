import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Users, UserPlus, RefreshCw, Shield, CheckCircle, XCircle } from 'lucide-react';

interface UserProfile {
  sub: string;
  username: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  department?: string;
  employee_id?: string;
  email?: string;
  source: string;
  is_active: boolean;
  synced_at: string;
}

export const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRole, setNewRole] = useState('staff');

  const { data: users, isLoading } = useQuery<UserProfile[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get('/users?page=1&size=50');
      return res.data?.data || [];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/users/sync');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      await apiClient.post('/users', payload);
    },
    onSuccess: () => {
      setShowCreateModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewFirstName('');
      setNewLastName('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (sub: string) => {
      await apiClient.delete(`/users/${sub}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      username: newUsername,
      password: newPassword,
      first_name: newFirstName,
      last_name: newLastName,
      roles: [newRole],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            การจัดการผู้ใช้งานในระบบ (User Management)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            จัดการบัญชีผู้ใช้งานทั้ง Local (Keycloak) และผู้ใช้งานจาก Active Directory / LDAP
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            ซิงก์ข้อมูล (Sync AD)
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            เพิ่มผู้ใช้ใหม่
          </button>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3.5">ชื่อผู้ใช้ / รหัสพนักงาน</th>
                <th className="px-6 py-3.5">ชื่อ-นามสกุล</th>
                <th className="px-6 py-3.5">แผนก / ตำแหน่ง</th>
                <th className="px-6 py-3.5">แหล่งข้อมูล</th>
                <th className="px-6 py-3.5">สถานะ</th>
                <th className="px-6 py-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    กำลังโหลดข้อมูลผู้ใช้...
                  </td>
                </tr>
              ) : users && users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.sub} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <div>{u.username}</div>
                      {u.employee_id && (
                        <div className="text-xs text-slate-400">ID: {u.employee_id}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="px-6 py-4">
                      <div>{u.department || '-'}</div>
                      <div className="text-xs text-slate-400">{u.position}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        u.source === 'ldap' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {u.source.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> ใช้งานอยู่
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
                          <XCircle className="w-3.5 h-3.5" /> ปิดใช้งาน
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.is_active && u.source === 'local' && (
                        <button
                          onClick={() => disableMutation.mutate(u.sub)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                        >
                          ระงับสิทธิ์
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    ไม่พบข้อมูลผู้ใช้ในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              เพิ่มผู้ใช้งานใหม่ (Local User)
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">รหัสผ่านชั่วคราว *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อจริง *</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">สิทธิ์การใช้งาน (Role)</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="staff">Staff (จัดการเอกสารและข้อมูล)</option>
                  <option value="admin">Admin (ผู้ดูแลระบบสูงสุด)</option>
                  <option value="viewer">Viewer (ค้นหาและอ่านอย่างเดียว)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                >
                  {createMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกผู้ใช้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
