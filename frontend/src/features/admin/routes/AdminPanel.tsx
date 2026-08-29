import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Package, Activity, Target, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { apiFetch } from '../../../api/apiClient';
import toast from 'react-hot-toast';

interface Metrics {
  total_users: number;
  total_products: number;
  total_competitors: number;
  total_scrapes: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  products_count: number;
}

import { DashboardLayout } from '../../../components/layout/DashboardLayout';

export const AdminPanel = () => {
  const { t } = useTranslation();
  // ... rest of state
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const data = await apiFetch<Metrics>('/api/admin/metrics');
      setMetrics(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des métriques');
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiFetch<User[]>('/api/admin/users');
      setUsers(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchMetrics(), fetchUsers()]).finally(() => setIsLoading(false));
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(t('admin.delete_confirm_desc'))) {
      return;
    }
    
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      toast.success(t('admin.user_deleted'));
      setUsers(users.filter(u => u.id !== userId));
      fetchMetrics();
    } catch (error: any) {
      toast.error(error.message || 'Error deleting user');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text-main">
          {t('admin.title', 'Super Admin Dashboard')}
        </h1>
        <p className="text-brand-text-muted mt-1">
          {t('admin.subtitle', 'Platform overview and user management')}
        </p>
      </div>

      <div className="flex space-x-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {t('admin.tab_overview', 'Overview')}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {t('admin.tab_users', 'Users')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
        </div>
      ) : activeTab === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title={t('admin.metrics_users')}
            value={metrics?.total_users || 0}
            icon={Users}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <MetricCard
            title={t('admin.metrics_products')}
            value={metrics?.total_products || 0}
            icon={Package}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
          />
          <MetricCard
            title={t('admin.metrics_competitors')}
            value={metrics?.total_competitors || 0}
            icon={Target}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
          <MetricCard
            title={t('admin.metrics_scrapes')}
            value={metrics?.total_scrapes || 0}
            icon={Activity}
            color="text-amber-600"
            bgColor="bg-amber-50"
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">{t('admin.user_name')}</th>
                  <th className="px-6 py-4 font-semibold">{t('admin.user_email')}</th>
                  <th className="px-6 py-4 font-semibold">{t('admin.user_role')}</th>
                  <th className="px-6 py-4 font-semibold">{t('admin.user_products')}</th>
                  <th className="px-6 py-4 font-semibold text-right">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                    <td className="px-6 py-4 text-slate-500">{u.email}</td>
                    <td className="px-6 py-4">
                      {u.is_admin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <Shield size={14} />
                          {t('admin.user_role_admin')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          <UserIcon size={14} />
                          {t('admin.user_role_user')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-700">{u.products_count}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!u.is_admin && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title={t('admin.delete_user')}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
};

function MetricCard({ title, value, icon: Icon, color, bgColor }: { title: string, value: number, icon: any, color: string, bgColor: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${bgColor} ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-black text-slate-900 mt-1">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
