import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { Button } from '../../../components/ui/Button';
import { SlideOver } from '../../../components/ui/SlideOver';
import { ProductForm } from '../components/ProductForm';
import { getProducts, getProduct, createProduct, updateProduct, importProducts, exportProducts, type Product, type PaginatedProducts } from '../api/productsApi';
import { Plus, Edit2, Search, ChevronLeft, ChevronRight, Upload, Download, FileType, FileSpreadsheet } from 'lucide-react';
import { ImportProductsModal } from '../components/ImportProductsModal';

export const ProductsList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [productsData, setProductsData] = useState<PaginatedProducts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  
  // Slide-over state
  const action = searchParams.get('action');
  const editId = searchParams.get('id');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isFetchingProduct, setIsFetchingProduct] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const size = 10;

  const fetchProducts = async (page: number, search?: string) => {
    setIsLoading(true);
    try {
      const data = await getProducts(page, size, search);
      setProductsData(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        if (searchQuery) {
          if (prev.get('search') !== searchQuery) {
            prev.set('search', searchQuery);
            prev.set('page', '1');
          }
        } else {
          prev.delete('search');
        }
        return prev;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, setSearchParams]);

  useEffect(() => {
    fetchProducts(currentPage, searchParams.get('search') || undefined);
  }, [currentPage, searchParams.get('search')]);

  useEffect(() => {
    if (action === 'edit' && editId) {
      setIsFetchingProduct(true);
      getProduct(editId).then(data => {
        setSelectedProduct(data);
        setIsFetchingProduct(false);
      }).catch(() => {
        setIsFetchingProduct(false);
        closeSlideOver();
      });
    } else if (action === 'new') {
      setSelectedProduct(undefined);
    }
  }, [action, editId]);

  const openNewSlideOver = () => {
    setSearchParams(prev => {
      prev.set('action', 'new');
      prev.delete('id');
      return prev;
    });
  };

  const closeSlideOver = () => {
    setSearchParams(prev => {
      prev.delete('action');
      prev.delete('id');
      return prev;
    });
    setIsFormDirty(false);
    setSelectedProduct(undefined);
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
      prev.set('page', newPage.toString());
      return prev;
    });
  };

  const handleFormSubmit = async (data: any) => {
    if (action === 'edit' && editId) {
      await updateProduct(editId, data);
    } else {
      await createProduct(data);
    }
    closeSlideOver();
    fetchProducts(currentPage, searchParams.get('search') || undefined); // Refresh list
  };



  const handleImportSubmit = async (file: File) => {
    try {
      const result = await importProducts(file);
      alert(`Import successful: ${result.imported} created, ${result.updated} updated.`);
      fetchProducts(currentPage, searchParams.get('search') || undefined);
    } catch (error: any) {
      alert(`Error importing file: ${error.message}`);
      throw error;
    }
  };

  const handleExport = async (type: 'csv' | 'excel') => {
    try {
      setIsExporting(true);
      await exportProducts(type, searchQuery || undefined);
    } catch (error) {
      console.error("Failed to export products:", error);
      alert("Erreur lors de l'exportation des produits.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-text-main tracking-tight">{t('products.list_title')}</h1>
          <p className="text-brand-text-muted mt-1">{t('products.list_desc')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex items-center w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('products.search_placeholder')} 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white w-full sm:w-64"
            />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Button variant="outline" className="w-full justify-center gap-2" onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} disabled={isExporting}>
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-brand-primary rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {t('products.export')}
            </Button>
            
            {isExportMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-0" 
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-10">
                  <button 
                    onClick={() => { setIsExportMenuOpen(false); handleExport('csv'); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <div className="bg-slate-100 text-slate-600 p-1.5 rounded-md">
                      <FileType className="w-4 h-4" />
                    </div>
                    {t('products.export_csv')}
                  </button>
                  <button 
                    onClick={() => { setIsExportMenuOpen(false); handleExport('excel'); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-md">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    {t('products.export_excel')}
                  </button>
                </div>
              </>
            )}
          </div>
          </div>
          
          <div className="relative flex-1 sm:flex-none">
            <Button onClick={() => setIsAddMenuOpen(!isAddMenuOpen)} className="w-full justify-center shrink-0 gap-2">
              <Plus className="w-4 h-4" />
              {t('products.add_product')}
            </Button>
            
            {isAddMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-0" 
                  onClick={() => setIsAddMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-10">
                  <button 
                    onClick={() => { setIsAddMenuOpen(false); openNewSlideOver(); }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <div className="bg-brand-primary/10 text-brand-primary p-2 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium">{t('products.manual_entry')}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{t('products.manual_entry_desc')}</div>
                    </div>
                  </button>
                  <div className="h-px bg-slate-100 my-1 mx-4"></div>
                  <button 
                    onClick={() => { setIsAddMenuOpen(false); setIsImportModalOpen(true); }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium">{t('products.import_file')}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{t('products.import_file_desc')}</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 uppercase tracking-wider text-xs">{t('products.table_name')}</th>
                <th className="px-6 py-4 uppercase tracking-wider text-xs">{t('products.table_your_price')}</th>
                <th className="px-6 py-4 uppercase tracking-wider text-xs">{t('products.table_highest')}</th>
                <th className="px-6 py-4 uppercase tracking-wider text-xs">{t('products.table_avg')}</th>
                <th className="px-6 py-4 uppercase tracking-wider text-xs">{t('products.table_cheapest')}</th>
                <th className="px-6 py-4 uppercase tracking-wider text-xs text-right">{t('products.table_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-brand-primary rounded-full animate-spin mb-2"></div>
                    <p>{t('products.loading')}</p>
                  </td>
                </tr>
              ) : productsData?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {t('products.empty')}
                  </td>
                </tr>
              ) : (
                productsData?.items.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-slate-900">{product.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{product.sku}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">
                        {product.my_current_price ? `$${product.my_current_price.toFixed(2)}` : '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">--</td>
                    <td className="px-6 py-4 text-slate-500">--</td>
                    <td className="px-6 py-4 text-slate-500">--</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/products/${product.id}`)}
                          className="text-brand-primary border-slate-200 hover:border-brand-primary hover:bg-brand-primary/5"
                        >
                          {t('products.view_details')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden flex flex-col divide-y divide-slate-100">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-brand-primary rounded-full animate-spin mb-2"></div>
              <p>{t('products.loading')}</p>
            </div>
          ) : productsData?.items.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              {t('products.empty')}
            </div>
          ) : (
            productsData?.items.map(product => (
              <div key={product.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 pr-4">
                    <div className="font-bold text-slate-900 leading-tight">{product.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-1">{product.sku}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-500 mb-0.5">{t('products.table_your_price')}</div>
                    <span className="font-bold text-slate-900 text-lg">
                      {product.my_current_price ? `$${product.my_current_price.toFixed(2)}` : '--'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4 pt-3 border-t border-slate-100">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t('products.table_highest')}</div>
                    <div className="text-sm text-slate-900 mt-0.5">--</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t('products.table_avg')}</div>
                    <div className="text-sm text-slate-900 mt-0.5">--</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t('products.table_cheapest')}</div>
                    <div className="text-sm text-slate-900 mt-0.5">--</div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="md"
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="w-full text-brand-primary border-slate-200 hover:border-brand-primary hover:bg-brand-primary/5 shadow-sm"
                >
                  {t('products.view_details')}
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {productsData && productsData.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white">
            <span className="text-sm text-slate-500">
              Affichage de {((productsData.page - 1) * productsData.size) + 1} à {Math.min(productsData.page * productsData.size, productsData.total)} sur {productsData.total} produits
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: productsData.pages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                    currentPage === i + 1 
                      ? 'bg-brand-primary text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                disabled={currentPage === productsData.pages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <SlideOver
        isOpen={!!action}
        onClose={() => closeSlideOver()}
        title={action === 'edit' ? t('products.form_edit_title') : t('products.form_add_title')}
        isDirty={isFormDirty}
        expandUrl={action === 'edit' && editId ? `/products/${editId}` : undefined}
      >
        {isFetchingProduct ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <ProductForm 
            initialData={selectedProduct} 
            onSubmit={handleFormSubmit}
            onCancel={() => closeSlideOver()}
            onDirtyChange={setIsFormDirty}
          />
        )}
      </SlideOver>

      <ImportProductsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportSubmit}
      />
    </DashboardLayout>
  );
};
