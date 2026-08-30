import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Package, Activity, Target, Trash2, Shield, User as UserIcon, Edit2 } from 'lucide-react';
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

type FAQ = {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
};

export const AdminPanel = () => {
  const { t } = useTranslation();
  // ... rest of state
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'faqs'>('overview');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // For FAQ Modal
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', is_active: true });

  const fetchMetrics = async () => {
    try {
      const data = await apiFetch<Metrics>('/api/admin/metrics');
      setMetrics(data);
    } catch (error) {
      toast.error(t('admin.error_metrics', 'Erreur lors du chargement des métriques'));
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiFetch<User[]>('/api/admin/users');
      setUsers(data);
    } catch (error) {
      toast.error(t('admin.error_users', 'Erreur lors du chargement des utilisateurs'));
    }
  };

  const fetchFaqs = async () => {
    try {
      const data = await apiFetch<FAQ[]>('/api/admin/faqs');
      setFaqs(data);
    } catch (error) {
      toast.error(t('admin.error_faqs', 'Erreur lors du chargement des FAQs'));
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchMetrics(), fetchUsers(), fetchFaqs()]).finally(() => setIsLoading(false));
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
      toast.error(error.message || t('admin.error_delete_user', 'Error deleting user'));
    }
  };

  const handleDeleteFaq = async (faqId: string) => {
    if (!window.confirm(t('admin.faq_delete_confirm', 'Are you sure you want to delete this FAQ?'))) {
      return;
    }
    
    try {
      await apiFetch(`/api/admin/faqs/${faqId}`, { method: 'DELETE' });
      toast.success(t('admin.faq_deleted', 'FAQ successfully deleted'));
      setFaqs(faqs.filter(f => f.id !== faqId));
    } catch (error: any) {
      toast.error(error.message || 'Error deleting FAQ');
    }
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFaq) {
        const updated = await apiFetch<FAQ>(`/api/admin/faqs/${editingFaq.id}`, {
          method: 'PUT',
          data: faqForm
        });
        setFaqs(faqs.map(f => f.id === updated.id ? updated : f));
        toast.success(t('admin.faq_updated', 'FAQ updated'));
      } else {
        const created = await apiFetch<FAQ>('/api/admin/faqs', {
          method: 'POST',
          data: faqForm
        });
        setFaqs([created, ...faqs]);
        toast.success(t('admin.faq_created', 'FAQ created'));
      }
      setIsFaqModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Error saving FAQ');
    }
  };

  const openFaqModal = (faq?: FAQ) => {
    if (faq) {
      setEditingFaq(faq);
      setFaqForm({ question: faq.question, answer: faq.answer, is_active: faq.is_active });
    } else {
      setEditingFaq(null);
      setFaqForm({ question: '', answer: '', is_active: true });
    }
    setIsFaqModalOpen(true);
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
        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'faqs'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {t('admin.tab_faqs', 'FAQs')}
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
      ) : activeTab === 'users' ? (
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
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="font-semibold text-slate-800">{t('admin.tab_faqs', 'Manage FAQs')}</h2>
            <button
              onClick={() => openFaqModal()}
              className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors"
            >
              + {t('admin.add_faq', 'New FAQ')}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold w-1/3">{t('admin.faq_question', 'Question')}</th>
                  <th className="px-6 py-4 font-semibold">{t('admin.faq_answer', 'Answer')}</th>
                  <th className="px-6 py-4 font-semibold">{t('admin.faq_status', 'Status')}</th>
                  <th className="px-6 py-4 font-semibold text-right">{t('admin.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {faqs.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{f.question}</td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{f.answer}</td>
                    <td className="px-6 py-4">
                      {f.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openFaqModal(f)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteFaq(f.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAQ Modal */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold">
                {editingFaq ? t('admin.edit_faq', 'Edit FAQ') : t('admin.add_faq', 'New FAQ')}
              </h3>
            </div>
            <form onSubmit={handleSaveFaq} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.faq_question', 'Question')}
                </label>
                <input
                  required
                  type="text"
                  value={faqForm.question}
                  onChange={e => setFaqForm({ ...faqForm, question: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.faq_answer', 'Answer')}
                </label>
                <textarea
                  required
                  rows={4}
                  value={faqForm.answer}
                  onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={faqForm.is_active}
                  onChange={e => setFaqForm({ ...faqForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-brand-primary border-slate-300 rounded focus:ring-brand-primary"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-slate-700">
                  {t('admin.faq_is_active', 'Active')}
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  {t('admin.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors"
                >
                  {t('admin.save', 'Save')}
                </button>
              </div>
            </form>
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
