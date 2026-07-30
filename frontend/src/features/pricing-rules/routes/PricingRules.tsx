import { useState, useEffect } from 'react';
import type { PricingRule } from '../api/rulesApi';
import { getRules, updateRule, deleteRule } from '../api/rulesApi';
import { RuleModal } from '../components/RuleModal';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { Plus, Zap, Trash2, Edit2, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
};

function PricingRuleCard({ 
  rule, 
  onToggle, 
  onEdit, 
  onDelete, 
  onQuickUpdate 
}: { 
  rule: PricingRule; 
  onToggle: (rule: PricingRule) => void; 
  onEdit: (rule: PricingRule) => void; 
  onDelete: (rule: PricingRule) => void; 
  onQuickUpdate: (rule: PricingRule, val: number) => Promise<void>; 
}) {
  const { t } = useTranslation();
  const { currencySymbol } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(rule.value || 0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onQuickUpdate(rule, editValue);
    setIsSaving(false);
    setIsEditing(false);
  };

  const renderTargetInfo = () => {
    if (rule.is_equal) {
       return <span className="text-base font-medium text-brand-text-main">{t('pricing_rules.exact_match', 'Exact Match')}</span>;
    }
    
    return (
      <div className="flex items-center gap-2">
         {isEditing ? (
            <div className="flex items-center gap-1">
              <input 
                type="number" 
                value={editValue}
                onChange={e => setEditValue(parseFloat(e.target.value))}
                className="w-16 px-1.5 py-0.5 text-sm border border-brand-primary rounded"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <span className="text-brand-text-muted text-sm">{rule.value_type === 'percentage' ? '%' : currencySymbol}</span>
              <button onClick={handleSave} disabled={isSaving} className="text-green-600 hover:text-green-700 p-1 bg-green-50 rounded"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setIsEditing(false); setEditValue(rule.value || 0); }} className="text-red-500 hover:text-red-600 p-1 bg-red-50 rounded"><X className="w-4 h-4" /></button>
            </div>
         ) : (
            <div className="flex items-center gap-1 group cursor-pointer" onClick={() => setIsEditing(true)}>
              <span className="text-base font-bold text-brand-primary border-b border-dashed border-brand-primary/50 group-hover:border-brand-primary transition-colors" title="Cliquer pour modifier rapidement">
                {rule.comparison_operator === 'lower_than' ? '- ' : '+ '}{rule.value} {rule.value_type === 'percentage' ? '%' : currencySymbol}
              </span>
              <Edit2 className="w-3.5 h-3.5 text-brand-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
         )}
      </div>
    );
  };

  return (
    <div className="bg-brand-surface rounded-xl border border-brand-border p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-brand-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-brand-text-main">{rule.name}</h3>
            <span
              className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                rule.is_enabled
                  ? 'text-brand-success bg-emerald-50'
                  : 'text-brand-text-muted bg-gray-100'
              }`}
            >
              {rule.is_enabled ? t('pricing_rules.active', 'Active') : t('pricing_rules.paused', 'Paused')}
            </span>
          </div>
        </div>
        <div title={rule.is_enabled ? t('pricing_rules.active', 'Active') : t('pricing_rules.paused', 'Paused')}>
          <Switch checked={rule.is_enabled} onChange={() => onToggle(rule)} />
        </div>
      </div>

      <div className="space-y-3 mt-6">
        <div className="flex justify-between items-center py-2 border-b border-brand-border">
          <span className="text-base text-brand-text-muted">{t('pricing_rules.the_action', 'The Action')}</span>
          {renderTargetInfo()}
        </div>
        <div className="flex justify-between items-center py-2 border-b border-brand-border">
          <span className="text-base text-brand-text-muted">{t('pricing_rules.products_affected', 'Products Affected')}</span>
          <span className="text-base font-medium text-brand-text-main">{rule.products_count} {t('pricing_rules.products', 'Products')}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-brand-border">
          <span className="text-base text-brand-text-muted">{t('pricing_rules.auto_update', 'Auto Update')}</span>
          <span className="text-base font-medium text-brand-text-main">
            {rule.auto_update_price ? t('pricing_rules.yes', 'Yes') : t('pricing_rules.no_alerts', 'No (Alerts Only)')}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-base text-brand-text-muted">{t('pricing_rules.last_execution', 'Last Execution')}</span>
          <span className="text-base text-brand-text-main">
            {rule.last_executed_at
              ? formatTimeAgo(rule.last_executed_at)
              : t('pricing_rules.never', 'Never')}
          </span>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => onEdit(rule)}
          className="flex-1 text-sm font-medium text-brand-text-muted hover:text-brand-primary transition-colors py-2 rounded-lg border border-brand-border hover:bg-slate-50"
        >
          {t('pricing_rules.edit_rule', 'Edit Rule')}
        </button>
        <button
          onClick={() => onDelete(rule)}
          className="w-10 h-10 flex items-center justify-center text-brand-text-muted hover:text-brand-danger transition-colors rounded-lg border border-brand-border hover:bg-red-50"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function PricingRules() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | undefined>(undefined);
  const [ruleToDelete, setRuleToDelete] = useState<PricingRule | null>(null);

  const fetchRules = async () => {
    try {
      const data = await getRules();
      setRules(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (rule: PricingRule) => {
    try {
      const updated = await updateRule(rule.id, { is_enabled: !rule.is_enabled });
      setRules(rules.map((r) => (r.id === rule.id ? { ...r, is_enabled: updated.is_enabled } : r)));
    } catch (error) {
      console.error(error);
    }
  };

  const confirmDelete = async () => {
    if (!ruleToDelete) return;
    try {
      await deleteRule(ruleToDelete.id);
      setRules(rules.filter((r) => r.id !== ruleToDelete.id));
    } catch (error) {
      console.error(error);
    } finally {
      setRuleToDelete(null);
    }
  };

  const handleQuickUpdate = async (rule: PricingRule, val: number) => {
    try {
      const updated = await updateRule(rule.id, { value: val });
      setRules(rules.map((r) => (r.id === rule.id ? { ...r, value: updated.value } : r)));
    } catch (error) {
      console.error(error);
    }
  };

  const openNewModal = () => {
    setEditingRule(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (rule: PricingRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-primary rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Page Title and Global Actions for accessibility and consistent layout */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-text-main tracking-tight">{t('pricing_rules.title', 'Pricing Rules')}</h1>
          <p className="text-brand-text-muted mt-1">{t('pricing_rules.desc', 'Manage active automation rules and strategies.')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={openNewModal}
            className="justify-center shrink-0 gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            {t('pricing_rules.new_rule', 'New Rule')}
          </Button>
        </div>
      </div>

      {/* Responsive grid to ensure cards display optimally across all device widths */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {rules.map((rule) => (
          <PricingRuleCard 
            key={rule.id} 
            rule={rule} 
            onToggle={handleToggle} 
            onEdit={openEditModal} 
            onDelete={setRuleToDelete} 
            onQuickUpdate={handleQuickUpdate} 
          />
        ))}
        {rules.length === 0 && (
          <div className="col-span-full py-12 text-center text-brand-text-muted bg-brand-surface rounded-xl border border-brand-border">
            {t('pricing_rules.no_rules_found', 'No pricing rules found. Create one to automate your pricing strategy.')}
          </div>
        )}
      </div>

      <RuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rule={editingRule}
        onSave={() => {
          setIsModalOpen(false);
          fetchRules();
        }}
      />

      <ConfirmModal
        isOpen={!!ruleToDelete}
        onCancel={() => setRuleToDelete(null)}
        onConfirm={confirmDelete}
        title={t('pricing_rules.delete_title', 'Delete Pricing Rule')}
        message={t('pricing_rules.delete_message', 'Are you sure you want to delete the rule "{{name}}"? This action cannot be undone.', { name: ruleToDelete?.name })}
        confirmText={t('products.delete', 'Delete')}
        variant="danger"
      />
    </DashboardLayout>
  );
}
