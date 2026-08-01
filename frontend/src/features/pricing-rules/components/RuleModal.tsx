import React, { useState, useEffect } from 'react';
import { SlideOver } from '../../../components/ui/SlideOver';
import type { PricingRule, PricingRuleCreate } from '../api/rulesApi';
import { createRule, updateRule } from '../api/rulesApi';
import { getProducts } from '../../products/api/productsApi';
import type { Product } from '../../products/api/productsApi';
import { getGlobalCompetitors, fetchCompetitors } from '../../products/api/competitorsApi';
import type { Competitor } from '../../products/api/competitorsApi';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { X, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../hooks/useToast';

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule?: PricingRule;
  onSave: () => void;
}

export function RuleModal({ isOpen, onClose, rule, onSave }: RuleModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState<PricingRuleCreate>({
    name: '',
    is_enabled: true,
    is_equal: true,
    auto_update_price: false,
    position: 'cheapest',
    comparison_operator: 'lower_than',
    value: 0,
    value_type: 'percentage',
    frequency: 'daily',
    event_type: 'price_drop',
    event_scope: 'market_average',
    competitor_id: undefined,
    product_ids: [],
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch products (increase size if you have many products to ensure they appear in the list)
      getProducts(1, 100).then(res => setProducts(res.items)).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (formData.product_ids && formData.product_ids.length > 0) {
      Promise.all(formData.product_ids.map(id => fetchCompetitors(id)))
        .then(results => {
           const allCompetitors = results.flat().map(cp => cp.competitor);
           // unique by id
           const unique = Array.from(new Map(allCompetitors.map(c => [c.id, c])).values());
           setCompetitors(unique);
        })
        .catch(console.error);
    } else {
      getGlobalCompetitors().then(setCompetitors).catch(console.error);
    }
  }, [formData.product_ids, isOpen]);

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        is_enabled: rule.is_enabled,
        is_equal: rule.is_equal,
        auto_update_price: rule.auto_update_price,
        position: rule.position,
        comparison_operator: rule.comparison_operator || 'lower_than',
        value: rule.value || 0,
        value_type: rule.value_type || 'percentage',
        frequency: rule.frequency || 'daily',
        event_type: rule.event_type || 'price_drop',
        event_scope: rule.event_scope || 'market_average',
        competitor_id: rule.competitor_id,
        product_ids: rule.product_ids || [],
      });
    } else {
      setFormData({
        name: '',
        is_enabled: true,
        is_equal: true,
        auto_update_price: false,
        position: 'cheapest',
        comparison_operator: 'lower_than',
        value: 0,
        value_type: 'percentage',
        frequency: 'daily',
        event_type: 'price_drop',
        event_scope: 'market_average',
        competitor_id: undefined,
        product_ids: [],
      });
    }
    setError(null);
  }, [rule, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (rule) {
        await updateRule(rule.id, formData);
        toast.success(t('pricing_rules.toast.edit_success', 'Règle mise à jour avec succès.'));
      } else {
        await createRule(formData);
        toast.success(t('pricing_rules.toast.add_success', 'Règle créée avec succès.'));
      }
      onSave();
    } catch (err: any) {
      const msg = err.message || t('pricing_rules.save_error', 'An error occurred while saving the rule.');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={rule ? t('pricing_rules.edit_title', 'Edit Pricing Rule') : t('pricing_rules.new_title', 'New Pricing Rule')}
      isDirty={false}
    >
      {(isExpanded: boolean) => (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col h-full bg-brand-bg text-brand-text-main">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <Input
            label={t('pricing_rules.rule_name', 'Rule Name')}
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('pricing_rules.rule_name_placeholder', 'e.g. Aggressive Match Lowest')}
          />
          
          <div>
            <label className="block text-sm font-medium text-brand-text-main mb-1">
              {t('pricing_rules.apply_to_products', 'Apply to Products')}
            </label>
            <div className="mb-4 relative">
              {formData.product_ids && formData.product_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.product_ids.map(id => {
                    const p = products.find(prod => prod.id === id);
                    if (!p) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                        {p.name}
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, product_ids: formData.product_ids?.filter(pid => pid !== id)})} 
                          className="hover:text-brand-danger transition-colors p-0.5 rounded-full hover:bg-brand-primary/20"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-text-muted">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder={t('pricing_rules.search_products_placeholder', 'Search products by name or SKU to add...')}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-brand-border rounded-xl text-sm hover:border-brand-primary/50 hover:shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-brand-text-muted"
                />
              </div>
              
              {productSearch.trim().length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-brand-surface border border-brand-border rounded-lg max-h-48 overflow-y-auto shadow-lg">
                  {products
                    .filter(p => !formData.product_ids?.includes(p.id))
                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
                    .map(p => (
                    <button 
                      key={p.id} 
                      type="button"
                      disabled={p.competitors_count === 0}
                      className={`w-full text-left flex flex-col p-2.5 transition-colors border-b border-brand-border last:border-0 ${p.competitors_count === 0 ? 'cursor-not-allowed opacity-60 bg-gray-50' : 'hover:bg-slate-50 cursor-pointer'}`}
                      onClick={() => {
                        const isReassigning = p.rule_id && (!rule || p.rule_id !== rule.id);
                        if (isReassigning) {
                          setConfirmProduct(p);
                          return;
                        }
                        setFormData({
                          ...formData, 
                          product_ids: [...(formData.product_ids || []), p.id]
                        });
                        setProductSearch('');
                      }}
                    >
                      <span className="text-sm font-medium text-brand-text-main flex items-center flex-wrap gap-2">
                        {p.name}
                        {p.rule_id && (!rule || p.rule_id !== rule.id) && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">{t('pricing_rules.assigned_elsewhere', 'Assigned elsewhere')}</span>
                        )}
                        {p.competitors_count === 0 && (
                          <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">{t('pricing_rules.no_competitors', 'No competitors')}</span>
                        )}
                      </span>
                      <span className="text-xs text-brand-text-muted">{t('products.sku', 'SKU')}: {p.sku}</span>
                    </button>
                  ))}
                  {products.filter(p => !formData.product_ids?.includes(p.id) && (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))).length === 0 && (
                    <div className="p-3 text-sm text-brand-text-muted text-center">{t('pricing_rules.no_products_found', 'No products found')}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-brand-surface p-4 rounded-lg border border-brand-border shadow-sm space-y-4">
            <h4 className="text-sm font-semibold text-brand-text-main mb-2">{t('pricing_rules.the_trigger', 'The Trigger')}</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-text-main mb-1">
                  {t('pricing_rules.event_scope', 'Event Scope')}
                </label>
                <select
                  value={formData.event_scope}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    event_scope: e.target.value as 'competitor' | 'market_average',
                    competitor_id: e.target.value === 'market_average' ? undefined : formData.competitor_id
                  })}
                  className="w-full p-2.5 rounded-lg border border-brand-border shadow-sm focus:border-brand-primary focus:ring-brand-primary outline-none transition-colors"
                >
                  <option value="market_average">{t('pricing_rules.market_average', 'Market Average')}</option>
                  <option value="competitor">{t('pricing_rules.specific_competitor', 'Specific Competitor')}</option>
                </select>
              </div>

              {formData.event_scope === 'competitor' && (
                <div>
                  <label className="block text-sm font-medium text-brand-text-main mb-1">
                    {t('pricing_rules.select_competitor', 'Select Competitor')}
                  </label>
                  <select
                    required
                    value={formData.competitor_id || ''}
                    onChange={(e) => setFormData({ ...formData, competitor_id: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-brand-border shadow-sm focus:border-brand-primary focus:ring-brand-primary outline-none transition-colors"
                  >
                    <option value="" disabled>{t('pricing_rules.select_competitor_placeholder', '-- Select a competitor --')}</option>
                    {competitors.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.domain_url})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-brand-text-main mb-1">
                  {t('pricing_rules.event_type', 'Event Type')}
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value as 'price_drop' | 'price_increase' })}
                  className="w-full p-2.5 rounded-lg border border-brand-border shadow-sm focus:border-brand-primary focus:ring-brand-primary outline-none transition-colors"
                >
                  <option value="price_drop">{t('pricing_rules.price_drops', 'Price Drops')}</option>
                  <option value="price_increase">{t('pricing_rules.price_increases', 'Price Increases')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-main mb-1">
                  {t('pricing_rules.check_frequency', 'Check Frequency')}
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                  className="w-full p-2.5 rounded-lg border border-brand-border shadow-sm focus:border-brand-primary focus:ring-brand-primary outline-none transition-colors"
                >
                  <option value="daily">{t('pricing_rules.daily', 'Daily')}</option>
                  <option value="weekly">{t('pricing_rules.weekly', 'Weekly')}</option>
                  <option value="monthly">{t('pricing_rules.monthly', 'Monthly')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-brand-surface p-4 rounded-lg border border-brand-border shadow-sm">
            <h4 className="text-sm font-semibold text-brand-text-main mb-4">{t('pricing_rules.the_action', 'The Action')}</h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="strategy_type"
                    checked={formData.is_equal}
                    onChange={() => setFormData({ ...formData, is_equal: true })}
                    className="text-brand-primary focus:ring-brand-primary border-brand-border"
                  />
                  <span className="text-sm text-brand-text-main">{t('pricing_rules.exact_match', 'Exact Match')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="strategy_type"
                    checked={!formData.is_equal}
                    onChange={() => setFormData({ ...formData, is_equal: false })}
                    className="text-brand-primary focus:ring-brand-primary border-brand-border"
                  />
                  <span className="text-sm text-brand-text-main">{t('pricing_rules.proportional', 'Proportional')}</span>
                </label>
              </div>

              {!formData.is_equal && (
                <div className={`flex gap-2 ${isExpanded ? 'flex-row items-center' : 'flex-col'}`}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.value || ''}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                    className={isExpanded ? 'w-24' : 'w-full'}
                  />
                  <select
                    value={formData.value_type}
                    onChange={(e) => setFormData({ ...formData, value_type: e.target.value as 'percentage' | 'amount' })}
                    className={`p-2.5 rounded-lg border border-brand-border shadow-sm focus:border-brand-primary focus:ring-brand-primary outline-none transition-colors ${isExpanded ? 'w-auto' : 'w-full'}`}
                  >
                    <option value="percentage">%</option>
                    <option value="amount">{t('pricing_rules.amount', 'Amount')}</option>
                  </select>
                  <select
                    value={formData.comparison_operator}
                    onChange={(e) => setFormData({ ...formData, comparison_operator: e.target.value as 'lower_than' | 'higher_than' })}
                    className={`p-2.5 rounded-lg border border-brand-border shadow-sm focus:border-brand-primary focus:ring-brand-primary outline-none transition-colors ${isExpanded ? 'w-auto' : 'w-full'}`}
                  >
                    <option value="lower_than">{t('pricing_rules.lower_than', 'Lower Than')}</option>
                    <option value="higher_than">{t('pricing_rules.higher_than', 'Higher Than')}</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm text-brand-text-muted">{t('pricing_rules.targeting_the', 'Targeting the')}</span>
                {formData.event_scope === 'competitor' ? (
                  <span className="text-sm font-semibold text-brand-primary bg-brand-primary/5 px-3 py-2 rounded-lg border border-brand-primary/20">
                    {t('pricing_rules.competitor_price_fixed')}
                  </span>
                ) : (
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value as 'cheapest' | 'avg' | 'highest' })}
                    className="p-2.5 rounded-lg border border-brand-border shadow-sm focus:border-brand-primary focus:ring-brand-primary outline-none transition-colors"
                  >
                    <option value="cheapest">{t('pricing_rules.cheapest_price', 'Cheapest Price')}</option>
                    <option value="avg">{t('pricing_rules.average_price', 'Average Price')}</option>
                    <option value="highest">{t('pricing_rules.highest_price', 'Highest Price')}</option>
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 opacity-60 cursor-not-allowed select-none">
              <input
                type="checkbox"
                checked={false}
                disabled
                className="rounded border-gray-300 text-gray-400 bg-gray-100 w-5 h-5 cursor-not-allowed"
              />
              <span className="text-sm text-brand-text-muted">
                {t('pricing_rules.auto_update_store', 'Automatically update my product price in my store (Shopify/WooCommerce)')}
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">{t('pricing_rules.coming_soon', 'Coming soon')}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 border-t border-brand-border bg-brand-surface flex justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('products.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('pricing_rules.saving', 'Saving...') : t('pricing_rules.save_rule', 'Save Rule')}
          </Button>
        </div>
      </form>
      <ConfirmModal
        isOpen={!!confirmProduct}
        onCancel={() => setConfirmProduct(null)}
        onConfirm={() => {
          if (confirmProduct) {
            setFormData({
              ...formData, 
              product_ids: [...(formData.product_ids || []), confirmProduct.id]
            });
            setProductSearch('');
          }
          setConfirmProduct(null);
        }}
        title={t('pricing_rules.reassign_product', 'Reassign Product')}
        message={t('pricing_rules.reassign_product_message', 'The product "{{productName}}" is already assigned to another rule. Do you want to reassign it to this new rule?', { productName: confirmProduct?.name })}
          confirmText={t('pricing_rules.yes_reassign', 'Yes, reassign')}
          cancelText={t('products.cancel', 'Cancel')}
        />
      </>
      )}
    </SlideOver>
  );
}
