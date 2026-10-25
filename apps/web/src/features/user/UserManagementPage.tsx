import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getUserInfo } from '../../lib/api-client';
import { Users, UserPlus, RefreshCw, Shield, CheckCircle2, XCircle, X } from 'lucide-react';

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

  const userInfo = getUserInfo();
  const isAdmin = userInfo?.roles?.includes('admin') || false;

  const { data: users = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get('/users?page=1&size=50');
      return res.data?.data || [];
    },
    enabled: isAdmin,
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
      role: newRole,
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-md mx-auto text-center font-sans">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <Shield className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
          <p className="text-xs text-slate-500 mt-1">
            เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถจัดการผู้ใช้งานและสิทธิ์ความปลอดภัยได้
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            จัดการบัญชีผู้ใช้งาน & สิทธิ์ (User & Access Control)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ซิงค์บัญชีผู้ใช้จาก Keycloak OIDC, กำหนดบทบาทสิทธิ์ (Roles), และเพิกถอนสิทธิ์แบบ Real-time
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            <span>ซิงค์ผู้ใช้</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ สร้างผู้ใช้</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">กำลังโหลดรายชื่อผู้ใช้...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">ไม่พบข้อมูลผู้ใช้งาน</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">ชื่อผู้ใช้ (Username)</th>
                  <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                  <th className="py-3 px-4">แผนก / ตำแหน่ง</th>
                  <th className="py-3 px-4">แหล่งที่มา</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.sub} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.username}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {u.department || u.position ? `${u.department || ''} ${u.position ? `(${u.position})` : ''}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{u.source}</td>
                    <td className="py-3 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          ใช้งานปกติ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" />
                          ปิดการใช้งาน
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.is_active && (
                        <button
                          onClick={() => {
                            if (confirm(`คุณต้องการระงับการใช้งานบัญชี ${u.username} ใช่หรือไม่?`)) {
                              disableMutation.mutate(u.sub);
                            }
                          }}
                          className="px-2.5 py-1 text-xs border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-md font-medium cursor-pointer transition-colors"
                        >
                          ระงับบัญชี
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">สร้างบัญชีผู้ใช้งานใหม่</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username) *</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">รหัสผ่านเริ่มต้น *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชื่อจริง</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">บทบาทสิทธิ์ (Role) *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="staff">Staff / CS (ค้นหาและอัปโหลดเอกสาร)</option>
                  <option value="admin">Admin (ผู้ดูแลระบบสูงสุด)</option>
                  <option value="viewer">Viewer (อ่านและดาวน์โหลดอย่างเดียว)</option>
                </select>
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
                  className="flex-1 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {createMutation.isPending ? 'กำลังสร้าง...' : 'สร้างบัญชีผู้ใช้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
