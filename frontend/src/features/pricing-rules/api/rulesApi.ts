import { apiFetch } from '../../../api/apiClient';

export interface PricingRule {
  id: string;
  name: string;
  is_enabled: boolean;
  is_equal: boolean;
  auto_update_price: boolean;
  value?: number;
  value_type?: 'percentage' | 'amount';
  comparison_operator?: 'lower_than' | 'higher_than';
  position: 'cheapest' | 'avg' | 'highest';
  frequency?: 'daily' | 'weekly' | 'monthly';
  event_type?: 'price_drop' | 'price_increase';
  event_scope?: 'competitor' | 'market_average';
  competitor_id?: string;
  last_executed_at?: string;
  products_count: number;
  product_ids: string[];
}

export type PricingRuleCreate = Omit<PricingRule, 'id' | 'products_count' | 'last_executed_at'> & {
  product_ids?: string[];
};

export const getRules = () => {
  return apiFetch<PricingRule[]>('/api/pricing-rules/');
};

export const createRule = (data: PricingRuleCreate) => {
  return apiFetch<PricingRule>('/api/pricing-rules/', { data });
};

export const updateRule = (id: string, data: Partial<PricingRuleCreate>) => {
  return apiFetch<PricingRule>(`/api/pricing-rules/${id}`, {
    method: 'PUT',
    data,
  });
};

export const deleteRule = (id: string) => {
  return apiFetch(`/api/pricing-rules/${id}`, { method: 'DELETE' });
};
