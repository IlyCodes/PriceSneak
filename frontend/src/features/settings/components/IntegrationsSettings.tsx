
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/Card';
import { ShoppingBag, Store } from 'lucide-react';

export const IntegrationsSettings = () => {
  const { t } = useTranslation();
  
  return (
    <Card className="p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-brand-text-main">{t('integrations.title')}</h2>
        <p className="text-sm text-brand-text-muted mt-1">{t('integrations.description')}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="relative group rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center text-center opacity-75 overflow-hidden transition-all duration-300">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">{t('integrations.shopify')}</h3>
          <p className="text-xs text-slate-500">{t('integrations.shopify_desc')}</p>
          
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="bg-white text-slate-900 text-sm font-bold px-4 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
              {t('integrations.coming_soon')}
            </span>
          </div>
        </div>

        
        <div className="relative group rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center text-center opacity-75 overflow-hidden transition-all duration-300">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">{t('integrations.woocommerce')}</h3>
          <p className="text-xs text-slate-500">{t('integrations.woocommerce_desc')}</p>
          
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="bg-white text-slate-900 text-sm font-bold px-4 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
              {t('integrations.coming_soon')}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
