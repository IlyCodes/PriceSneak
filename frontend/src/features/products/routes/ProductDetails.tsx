import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { getProduct, deleteProduct, updateProduct, type Product } from '../api/productsApi';
import { Settings, ChevronDown, Download, Edit2, Trash2, ArrowLeft, Plus } from 'lucide-react';
import { SlideOver } from '../../../components/ui/SlideOver';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { ProductForm } from '../components/ProductForm';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';

const mockCompetitors: any[] = [];

export const ProductDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isEditSlideOverOpen, setIsEditSlideOverOpen] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchProduct = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await getProduct(id);
      setProduct(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const handleDeleteClick = () => {
    setIsManageOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleToggleActive = async (newStatus: boolean) => {
    if (!product) return;
    try {
      const updated = await updateProduct(product.id, { is_active: newStatus });
      setProduct(updated);
    } catch (err) {
      console.error('Failed to toggle product status:', err);
    }
  };

  const confirmDelete = async () => {
    if (id) {
      await deleteProduct(id);
      navigate('/products');
    }
  };

  const handleUpdate = async (data: any) => {
    if (id) {
      await updateProduct(id, data);
      setIsEditSlideOverOpen(false);
      setIsFormDirty(false);
      fetchProduct();
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-primary rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="py-20 text-center">
          <h2 className="text-xl font-bold text-slate-700">{t('products.not_found')}</h2>
          <button onClick={() => navigate('/products')} className="text-brand-primary mt-2">{t('products.back_to_catalog')}</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4">
        <button 
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('products.back')}
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('products.details_title')}</h1>
          <p className="text-slate-500 mt-1">{t('products.details_desc')}</p>
        </div>

        <div className="relative group">
          <Button 
            variant="outline"
            onClick={() => setIsManageOpen(!isManageOpen)}
            className="group flex items-center gap-2 shadow-sm focus:ring-brand-primary/20"
          >
            <Settings className="w-4 h-4 text-slate-400 group-hover:text-brand-primary transition-all duration-300 group-hover:rotate-90" />
            {t('products.manage')}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isManageOpen ? 'rotate-180' : ''}`} />
          </Button>
          
          {isManageOpen && (
            <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 origin-top-left md:origin-top-right">
              <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t('products.export')}
              </button>
              <button 
                onClick={() => { setIsManageOpen(false); setIsEditSlideOverOpen(true); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                {t('products.edit')}
              </button>
              <div className="h-px bg-slate-100 my-1"></div>
              <button 
                onClick={handleDeleteClick}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('products.delete')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-slate-500 mb-1">
                {product.brand || t('products.no_brand', 'No Brand')} &bull; {product.category || t('products.no_category', 'No Category')}
              </h3>
              <div className="text-2xl font-bold text-slate-900 mb-4">{product.name}</div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <div className="text-3xl font-bold text-brand-primary leading-none">
                  {product.my_current_price ? `$${product.my_current_price.toFixed(2)}` : 'N/A'}
                </div>
                <div className="text-sm font-medium text-slate-500 mt-1 sm:mt-0">
                  {t('products.cost_price')}: ${product.cost_price.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:items-end pt-4 sm:pt-0 mt-2 sm:mt-0 border-t sm:border-t-0 border-slate-100">
              <div className="flex items-center justify-between sm:justify-end gap-3 mb-3 w-full sm:w-auto">
                <span className={`text-sm sm:text-xs font-semibold ${product.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {product.is_active ? t('products.rule_active', 'Règle Activée') : t('products.rule_inactive', 'Règle Désactivée')}
                </span>
                <Switch checked={product.is_active} onChange={handleToggleActive} />
              </div>
              <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start w-full sm:w-auto">
                <p className="text-xs text-slate-500 sm:order-last">{t('products.last_sync')}</p>
                <div className="text-sm font-semibold text-slate-900">2 mins ago</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t('products.historical_chart')}</h2>
              <p className="text-xs text-slate-500 mt-1">{t('products.showing_all')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {mockCompetitors.length > 0 && (
                <>
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary w-4 h-4" />
                      <span className="text-sm text-slate-700">Amazon</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary w-4 h-4" />
                      <span className="text-sm text-slate-700">BestBuy</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary w-4 h-4" />
                      <span className="text-sm text-slate-700">Walmart</span>
                    </label>
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-full border border-slate-100">
                    <button className="px-4 py-1.5 text-sm font-medium text-slate-500 rounded-full hover:bg-slate-100">30D</button>
                    <button className="px-4 py-1.5 text-sm font-medium text-white bg-brand-primary rounded-full shadow-sm">90D</button>
                    <button className="px-4 py-1.5 text-sm font-medium text-slate-500 rounded-full hover:bg-slate-100">1Y</button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {mockCompetitors.length > 0 ? (
            <div className="h-64 w-full flex items-end justify-between gap-2 relative">
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-slate-400 pb-6">
                <span>$150</span>
                <span>$100</span>
                <span>$50</span>
              </div>
              <div className="absolute inset-0 pl-10 flex flex-col justify-between pb-6 pointer-events-none">
                <div className="w-full h-px bg-slate-100"></div>
                <div className="w-full h-px bg-slate-100"></div>
                <div className="w-full h-px bg-slate-100"></div>
              </div>
              <div className="flex-1 pl-12 h-full flex items-end justify-around pb-6 relative z-10">
                <div className="absolute -top-4 right-0 flex gap-4">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-500"></div><span className="text-xs text-slate-500">You</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-slate-300"></div><span className="text-xs text-slate-500">Amazon</span></div>
                </div>
                {[60, 70, 65, 80, 90].map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 group h-full justify-end">
                    <div className={`flex gap-1 items-end h-[${h}%]`}>
                      <div className="w-4 bg-blue-500 rounded-t-sm h-full group-hover:opacity-80 transition-opacity" style={{ height: `${h}%` }}></div>
                      <div className="w-4 bg-slate-300 rounded-t-sm group-hover:opacity-80 transition-opacity" style={{ height: `${h - 5}%` }}></div>
                    </div>
                    <span className="text-xs text-slate-400 mt-2">Sep {1 + i * 7}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 w-full flex flex-col items-center justify-center border-t border-slate-100 mt-2 pt-6">
              <div className="text-slate-300 mb-3">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Aucune donnée historique</h3>
              <p className="text-xs text-slate-500 max-w-xs text-center">Ajoutez des concurrents pour visualiser et comparer l'évolution des prix dans le temps.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t('products.comparison_title')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('products.comparison_desc')}</p>
            </div>
            {mockCompetitors.length > 0 && (
              <Button variant="primary" className="flex items-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                {t('products.add_competitor')}
              </Button>
            )}
          </div>
          
          {mockCompetitors.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                      <th className="p-4 pl-6 font-semibold">{t('products.comp_table_name')}</th>
                      <th className="p-4 font-semibold">{t('products.comp_table_price')}</th>
                      <th className="p-4 font-semibold">{t('products.comp_table_var')}</th>
                      <th className="p-4 font-semibold">{t('products.comp_table_date')}</th>
                      <th className="p-4 pr-6 font-semibold text-right">{t('products.comp_table_action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center text-[10px] font-bold text-white">A</div>
                          <span className="text-sm font-medium text-slate-900">Amazon.com</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-900 font-medium">$348.00</td>
                      <td className="p-4">
                        <span className="text-red-600 font-medium text-sm">-12.5%</span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">2 mins ago</td>
                      <td className="p-4 pr-6 text-right">
                        <Button variant="secondary" size="sm">{t('products.match_price')}</Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="md:hidden space-y-4">
                <div className="p-4 hover:bg-slate-50 transition-colors flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-white">A</div>
                      <span className="text-sm font-bold text-slate-900">Amazon.com</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 text-lg">$348.00</span>
                      <div className="text-red-600 font-medium text-xs mt-0.5">-12.5%</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      2 mins ago
                    </span>
                    <Button variant="secondary" size="sm">
                      {t('products.match_price')}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center mb-5 text-brand-primary">
                <Plus className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Aucun concurrent défini</h3>
              <p className="text-slate-500 max-w-sm mb-6 leading-relaxed">
                Gardez un œil sur le marché en ajoutant votre premier concurrent pour suivre automatiquement ses changements de prix.
              </p>
              <Button variant="primary" className="flex items-center gap-2 shadow-sm mt-2">
                <Plus className="w-4 h-4" />
                {t('products.add_competitor')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <SlideOver
        isOpen={isEditSlideOverOpen}
        onClose={() => { setIsEditSlideOverOpen(false); setIsFormDirty(false); }}
        title={t('products.edit')}
        isDirty={isFormDirty}
      >
        <ProductForm 
          initialData={product} 
          onSubmit={handleUpdate}
          onCancel={() => setIsEditSlideOverOpen(false)}
          onDirtyChange={setIsFormDirty}
        />
      </SlideOver>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title={t('products.delete')}
        message={t('products.delete_confirm')}
        confirmText={t('products.delete')}
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        variant="danger"
      />
    </DashboardLayout>
  );
};
