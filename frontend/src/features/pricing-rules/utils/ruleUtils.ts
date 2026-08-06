import type { PricingRule } from '../api/rulesApi';

export const generateRuleDescription = (rule: PricingRule, currencySymbol: string, t: any) => {
  let target = t('pricing_rules.target.avg');
  if (rule.competitor_id) {
    target = t('pricing_rules.target.competitor');
  } else if (rule.position === 'cheapest') {
    target = t('pricing_rules.target.cheapest');
  } else if (rule.position === 'highest') {
    target = t('pricing_rules.target.highest');
  }

  if (rule.is_equal) {
    return t('pricing_rules.action_desc.equal', { target });
  }

  const val = `${rule.value}${rule.value_type === 'percentage' ? '%' : currencySymbol}`;
  if (rule.comparison_operator === 'higher_than') {
    return t('pricing_rules.action_desc.higher', { val, target });
  } else {
    return t('pricing_rules.action_desc.lower', { val, target });
  }
};

export const generateRuleTrigger = (rule: PricingRule, t: any) => {
  const freq = rule.frequency === 'daily' ? t('pricing_rules.daily') :
               rule.frequency === 'weekly' ? t('pricing_rules.weekly') :
               t('pricing_rules.monthly');
  
  const eventType = rule.event_type === 'price_drop' ? t('pricing_rules.price_drops') :
                    t('pricing_rules.price_increases');

  const scope = rule.event_scope === 'market_average' ? t('pricing_rules.market_average') :
                t('pricing_rules.specific_competitor');
                
  return `${freq} - ${eventType} (${scope})`;
};
