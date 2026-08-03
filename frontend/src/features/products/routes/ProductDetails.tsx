import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { getProduct, deleteProduct, updateProduct, getProductHistory, getProductAnalysis, type Product } from '../api/productsApi';
import { getRules, type PricingRule } from '../../pricing-rules/api/rulesApi';
import { generateRuleDescription, generateRuleTrigger } from '../../pricing-rules/utils/ruleUtils';
import { fetchCompetitors, addCompetitor, updateCompetitor, deleteCompetitor, fetchCompetitorHistory, type CompetitorProduct, type PriceHistoryPoint } from '../api/competitorsApi';
import { Settings, ChevronDown, Download, Edit2, Trash2, ArrowLeft, Plus, FileSpreadsheet, Search, MoreVertical, Link as LinkIcon, ArrowUpRight, ArrowDownRight, Archive, Activity, DollarSign, UploadCloud, RefreshCw, BarChart2 } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { read, utils, writeFile } from 'xlsx';
import { useAuth } from '../../auth/context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SlideOver } from '../../../components/ui/SlideOver';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { ProductForm } from '../components/ProductForm';
import { AddCompetitorModal } from '../components/AddCompetitorModal';
import { ImportCompetitorsModal } from '../components/ImportCompetitorsModal';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';

const timeAgo = (dateString?: string): string => {
  if (!dateString) return 'Jamais';
  const utcDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
  const date = new Date(utcDateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 0) return 'À l\'instant'; // Why: Handle edge cases where local clock is behind server clock
  if (diffInSeconds < 60) return 'À l\'instant';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Il y a ${diffInHours} h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `Il y a ${diffInDays} j`;
};

const timeUntil = (dateString?: string, frequency?: string): string => {
  if (!dateString) return 'En attente...';
  
  const utcDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
  const lastDate = new Date(utcDateString);
  
  const nextDate = new Date(lastDate);
  if (frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
  else if (frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
  else if (frequency === 'monthly') nextDate.setDate(nextDate.getDate() + 30);
  else nextDate.setDate(nextDate.getDate() + 1); // Why: Fallback to daily schedule if no frequency is defined

  const now = new Date();
  const diffInSeconds = Math.floor((nextDate.getTime() - now.getTime()) / 1000);
  
  if (diffInSeconds <= 0) return 'Imminente';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Dans ${diffInMinutes} min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Dans ${diffInHours} h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `Dans ${diffInDays} j`;
};

export const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currencySymbol } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isEditSlideOverOpen, setIsEditSlideOverOpen] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [competitorToDelete, setCompetitorToDelete] = useState<CompetitorProduct | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorProduct[]>([]);
  const [isAddCompetitorModalOpen, setIsAddCompetitorModalOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<CompetitorProduct | undefined>();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isAddMenuEmptyOpen, setIsAddMenuEmptyOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [priceHistories, setPriceHistories] = useState<Record<string, PriceHistoryPoint[]>>({});
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<30 | 90 | 365>(30);
  const [isLoadingHistories, setIsLoadingHistories] = useState(false);
  const [ownHistory, setOwnHistory] = useState<PriceHistoryPoint[]>([]);
  const [analysis, setAnalysis] = useState<{ cheapest_price: number | null, avg_price: number | null, highest_price: number | null } | null>(null);
  const [productRule, setProductRule] = useState<PricingRule | null>(null);

  const fetchProduct = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const [productData, competitorsData, analysisData, rules] = await Promise.all([
        getProduct(id),
        fetchCompetitors(id),
        getProductAnalysis(id).catch(() => null),
        getRules().catch(() => [])
      ]);
      setProduct(productData);
      setCompetitors(competitorsData);
      setAnalysis(analysisData);
      if (productData.rule_id) {
        setProductRule(rules.find(r => r.id === productData.rule_id) || null);
      } else {
        setProductRule(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (searchParams.get('action') === 'add_competitor') {
      setIsAddCompetitorModalOpen(true);
      setSearchParams(prev => {
        prev.delete('action');
        return prev;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const isScraping = competitors.some(c => !c.last_scraped_at);
    if (isScraping && id) {
      const interval = setInterval(() => {
        fetchCompetitors(id).then(setCompetitors).catch(console.error);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [competitors, id]);

  useEffect(() => {
    if (competitors.length > 0 && selectedCompetitorIds.size === 0) {
      setSelectedCompetitorIds(new Set(competitors.slice(0, 3).map(c => c.id)));
    }
  }, [competitors]);

  useEffect(() => {
    const loadHistories = async () => {
      if (!id || competitors.length === 0) return;
      setIsLoadingHistories(true);
      
      try {
        const ownRes = await getProductHistory(id);
        setOwnHistory(ownRes.history);
      } catch (e) {
        console.error(e);
      }

      const histories: Record<string, PriceHistoryPoint[]> = {};
      await Promise.all(competitors.map(async (comp) => {
        try {
          const res = await fetchCompetitorHistory(id, comp.id);
          histories[comp.id] = res.history;
        } catch (e) {
          console.error(e);
        }
      }));
      setPriceHistories(histories);
      setIsLoadingHistories(false);
    };
    loadHistories();
  }, [competitors, id]);

  const toggleCompetitor = (compId: string) => {
    const newSet = new Set(selectedCompetitorIds);
    if (newSet.has(compId)) newSet.delete(compId);
    else newSet.add(compId);
    setSelectedCompetitorIds(newSet);
  };

  const handleDeleteClick = () => {
    setIsManageOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleToggleActive = async (newStatus: boolean) => {
    if (!product) return;
    
    if (newStatus && !product.rule_id) {
      toast.error(t('products.details.status.no_rule_error', "Impossible d'activer le produit : aucune règle de prix n'est assignée. Veuillez définir une règle d'abord."));
      return;
    }

    try {
      const updated = await updateProduct(product.id, { is_active: newStatus });
      setProduct(updated);
      toast.success(newStatus ? t('products.details.status.activated', 'Produit activé avec succès') : t('products.details.status.deactivated', 'Produit désactivé avec succès'));
    } catch (err: any) {
      console.error('Failed to toggle product status:', err);
      toast.error(err.message || t('errors.default', 'Une erreur est survenue.'));
    }
  };

  const confirmDelete = async () => {
    if (id) {
      try {
        await deleteProduct(id);
        toast.success(t('products.details.delete.success', 'Produit supprimé avec succès.'));
        navigate('/products');
      } catch (err: any) {
        toast.error(err.message || t('errors.default', 'Une erreur est survenue.'));
      }
    }
  };

  const handleUpdate = async (data: any) => {
    if (id) {
      try {
        await updateProduct(id, data);
        setIsEditSlideOverOpen(false);
        setIsFormDirty(false);
        fetchProduct();
        toast.success(t('products.details.edit.success', 'Produit mis à jour avec succès.'));
      } catch (err: any) {
        toast.error(err.message || t('errors.default', 'Une erreur est survenue.'));
      }
    }
  };

  const handleMatchPrice = async (price: number | undefined) => {
    if (price === undefined || !id || !product) return;
    try {
      const result = await updateProduct(id, { ...product, my_current_price: price } as Product);
      setProduct(result);
      toast.success(t('products.details.matchPrice.success', 'Prix ajusté avec succès.'));
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || t('errors.default', 'Une erreur est survenue.'));
    }
  };

  const handleAddCompetitor = async (url: string) => {
    if (id) {
      try {
        if (editingCompetitor) {
          await updateCompetitor(id, editingCompetitor.id, url);
        } else {
          await addCompetitor(id, url);
        }
        const competitorsData = await fetchCompetitors(id);
        setCompetitors(competitorsData);
        setEditingCompetitor(undefined);
        // Why: Edit action bypasses modal's internal toast, requiring manual trigger here
        if (editingCompetitor) toast.success(t('products.details.competitors.edit.success', 'Lien mis à jour avec succès.'));
      } catch (e: any) {
        throw e; // Why: Propagate error to modal for localized error handling
      }
    }
  };

  const handleDeleteCompetitor = async (competitorId: string) => {
    if (id) {
      try {
        await deleteCompetitor(id, competitorId);
        const competitorsData = await fetchCompetitors(id);
        setCompetitors(competitorsData);
        toast.success(t('products.details.competitors.delete.success', 'Concurrent supprimé avec succès.'));
      } catch (err: any) {
        toast.error(err.message || t('errors.default', 'Une erreur est survenue.'));
      }
    }
  };

  const handleImportCompetitors = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = utils.sheet_to_json(firstSheet, { header: 1 });
      
      let urlColIndex = -1;
      const headers = rows[0] || [];
      for (let i = 0; i < headers.length; i++) {
        if (typeof headers[i] === 'string' && headers[i].toLowerCase().includes('url')) {
          urlColIndex = i;
          break;
        }
      }
      
      if (urlColIndex === -1) {
        urlColIndex = 0;
      }
      
      const urls: string[] = [];
      const startIndex = (headers[urlColIndex] && typeof headers[urlColIndex] === 'string' && headers[urlColIndex].toLowerCase().includes('url')) ? 1 : 0;

      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (row && row[urlColIndex]) {
          const rawUrl = String(row[urlColIndex]).trim();
          if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
            urls.push(rawUrl);
          }
        }
      }
      
      if (urls.length === 0) {
        alert(t('products.details.competitors.importModal.errors.noValidLinks', 'Aucun lien valide trouvé dans le fichier.'));
        return;
      }
      
      if (id) {
        for (const url of urls) {
          try {
            await addCompetitor(id, url);
          } catch (e) {
            console.error("Failed to import URL:", url, e);
          }
        }
        
        const competitorsData = await fetchCompetitors(id);
        setCompetitors(competitorsData);
        setIsImportModalOpen(false);
      }
    } catch (e) {
      console.error(e);
      alert(t('products.details.competitors.importModal.errors.generic', 'Une erreur est survenue lors de la lecture du fichier.'));
    }
  };

  const handleExportExcel = () => {
    if (!product) return;

    const summaryData = competitors.map(comp => {
      const priceDiff = comp.current_price && product.my_current_price
        ? ((comp.current_price - product.my_current_price) / product.my_current_price) * 100
        : null;

      return {
        'Boutique': comp.competitor.name,
        'Lien': comp.product_url,
        [`Son Prix (${currencySymbol})`]: comp.current_price || 'N/A',
        [`Mon Prix (${currencySymbol})`]: product.my_current_price || 'N/A',
        'En Stock': comp.is_in_stock ? 'Oui' : 'Non',
        'Différence (%)': priceDiff !== null ? priceDiff.toFixed(2) : 'N/A',
        'Dernière mise à jour': comp.last_scraped_at ? new Date(comp.last_scraped_at).toLocaleDateString() : 'N/A'
      };
    });

    const summarySheet = utils.json_to_sheet(summaryData);

    const exportDateMap: Record<string, any> = {};

    ownHistory.forEach(point => {
      const d = new Date(point.recorded_at);
      const dStr = d.toLocaleDateString();
      if (!exportDateMap[dStr]) {
        exportDateMap[dStr] = { 'Date': dStr };
      }
      exportDateMap[dStr][`Mon Prix (${currencySymbol})`] = point.price;
    });

    Object.entries(priceHistories).forEach(([compId, history]) => {
      const comp = competitors.find(c => c.id === compId);
      if (!comp) return;
      
      history.forEach(point => {
        const d = new Date(point.recorded_at);
        const dStr = d.toLocaleDateString();
        if (!exportDateMap[dStr]) {
          exportDateMap[dStr] = { 'Date': dStr };
        }
        exportDateMap[dStr][comp.competitor.name] = point.price;
        if (exportDateMap[dStr][`Mon Prix (${currencySymbol})`] === undefined) {
          exportDateMap[dStr][`Mon Prix (${currencySymbol})`] = product.my_current_price;
        }
      });
    });
    
    const historyData = Object.values(exportDateMap).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    const historySheet = utils.json_to_sheet(historyData);

    const wb = utils.book_new();
    utils.book_append_sheet(wb, summarySheet, 'Résumé');
    utils.book_append_sheet(wb, historySheet, 'Historique des prix');

    const safeName = product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    writeFile(wb, `pricesneak_analyse_${safeName}.xlsx`);
    setIsManageOpen(false);
  };

  const renderAddCompetitorDropdown = (isOpenState: boolean, setIsOpenState: (v: boolean) => void) => (
    <div className="relative group w-full sm:w-auto">
      <Button variant="primary" className="flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto" onClick={() => setIsOpenState(!isOpenState)}>
        <Plus className="w-4 h-4" />
        {t('products.add_competitor')}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpenState ? 'rotate-180' : ''}`} />
      </Button>
      
      {isOpenState && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 origin-top sm:origin-top-right">
          <button 
            onClick={() => { setIsOpenState(false); setIsAddCompetitorModalOpen(true); }}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('products.manual_entry', 'Saisie Manuelle')}
          </button>
          <button 
            onClick={() => { setIsOpenState(false); setIsImportModalOpen(true); }}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('products.import_file', 'Importer Fichier')}
          </button>
          <div className="h-px bg-slate-100 my-1"></div>
          <button 
            disabled
            className="w-full text-left px-4 py-2 text-sm text-slate-400 cursor-not-allowed flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Smart Search (Coming Soon)
          </button>
        </div>
      )}
    </div>
  );

  const chartData = useMemo(() => {
    if (!product) return [];
    
    const dateMap: Record<string, any> = {};
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);
    
    ownHistory.forEach(point => {
      const d = new Date(point.recorded_at);
      if (d < cutoffDate) return;
      
      const dateStr = d.toLocaleDateString();
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { date: dateStr };
      }
      dateMap[dateStr]['You'] = point.price;
    });

    Object.entries(priceHistories).forEach(([compId, history]) => {
      const comp = competitors.find(c => c.id === compId);
      if (!comp || !selectedCompetitorIds.has(compId)) return;
      
      history.forEach(point => {
        const d = new Date(point.recorded_at);
        if (d < cutoffDate) return;
        
        const dateStr = d.toLocaleDateString();
        if (!dateMap[dateStr]) {
          dateMap[dateStr] = { date: dateStr };
        }
        dateMap[dateStr][comp.competitor.name] = point.price;
        if (dateMap[dateStr]['You'] === undefined) {
          dateMap[dateStr]['You'] = product.my_current_price;
        }
      });
    });
    
    return Object.values(dateMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [priceHistories, ownHistory, competitors, product, selectedCompetitorIds, timeRange]);

  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
              <button 
                onClick={handleExportExcel}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('products.export')} (Excel)
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

      <div className="grid grid-cols-1 gap-6 pb-24 sm:pb-12">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-slate-500 mb-1">
                {product.brand || t('products.no_brand', 'No Brand')} &bull; {product.category || t('products.no_category', 'No Category')}
              </h3>
              <div className="text-2xl font-bold text-slate-900 mb-4">{product.name}</div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <div className="text-3xl font-bold text-brand-primary leading-none">
                  {product.my_current_price ? `${currencySymbol}${product.my_current_price.toFixed(2)}` : 'N/A'}
                </div>
                <div className="text-sm font-medium text-slate-500 mt-1 sm:mt-0">
                  {t('products.cost_price')}: {currencySymbol}{product.cost_price.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:items-end pt-4 sm:pt-0 mt-2 sm:mt-0 border-t sm:border-t-0 border-slate-100">
              <div className="flex items-center justify-between sm:justify-end gap-3 mb-3 w-full sm:w-auto">
                {product.rule_id && productRule ? (
                  <div className="relative group/rule z-20">
                    <button 
                      onClick={() => navigate('/rules')}
                      className={`text-sm font-semibold hover:underline ${product.is_active ? 'text-brand-primary' : 'text-slate-400'}`}
                    >
                      Règle: {productRule.name}
                    </button>
                    <div className="absolute top-full mt-2 right-0 md:right-auto md:left-1/2 md:-translate-x-1/2 w-72 bg-slate-900 text-white text-xs rounded-lg p-4 shadow-xl opacity-0 invisible group-hover/rule:opacity-100 group-hover/rule:visible transition-all duration-200 pointer-events-none text-left">
                      <div className="font-semibold text-sm mb-1">{t('pricing_rules.the_action')}</div>
                      <div className="text-slate-300 mb-3">{generateRuleDescription(productRule, currencySymbol, t)}</div>
                      <div className="font-semibold text-sm mb-1">{t('pricing_rules.the_trigger')}</div>
                      <div className="text-slate-300">{generateRuleTrigger(productRule, t)}</div>
                      <div className="absolute -top-1 right-6 md:left-1/2 md:-translate-x-1/2 w-2 h-2 bg-slate-900 transform rotate-45"></div>
                    </div>
                  </div>
                ) : (
                  <span className={`text-sm sm:text-xs font-semibold ${product.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {product.is_active ? t('products.rule_active', 'Règle Activée') : t('products.rule_inactive', 'Règle Désactivée')}
                  </span>
                )}
                <div title={product.is_active ? t('products.rule_active', 'Règle Activée') : t('products.rule_inactive', 'Règle Désactivée')}>
                  <Switch checked={product.is_active} onChange={handleToggleActive} />
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto sm:items-end">
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full">
                  <p className="text-xs text-slate-500">{t('products.last_sync')}:</p>
                  <div className="text-sm font-semibold text-slate-900">
                    {(() => {
                      const scrapedDates = competitors.map(c => c.last_scraped_at).filter(Boolean) as string[];
                      const mostRecentScrape = scrapedDates.length > 0 ? scrapedDates.sort().reverse()[0] : undefined;
                      return timeAgo(mostRecentScrape);
                    })()}
                  </div>
                </div>
                
                {product.is_active && (
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full">
                    <p className="text-xs text-brand-primary/80">{t('products.next_sync')}:</p>
                    <div className="text-sm font-semibold text-brand-primary">
                      {(() => {
                        const scrapedDates = competitors.map(c => c.last_scraped_at).filter(Boolean) as string[];
                        const mostRecentScrape = scrapedDates.length > 0 ? scrapedDates.sort().reverse()[0] : undefined;
                        return timeUntil(mostRecentScrape, productRule?.frequency);
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {analysis && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-medium text-slate-500 mb-1">{t('products.table_cheapest')}</span>
              <span className="text-2xl font-bold text-emerald-600">
                {analysis.cheapest_price ? `${currencySymbol}${analysis.cheapest_price.toFixed(2)}` : '-'}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-medium text-slate-500 mb-1">{t('products.table_avg')}</span>
              <span className="text-2xl font-bold text-brand-primary">
                {analysis.avg_price ? `${currencySymbol}${analysis.avg_price.toFixed(2)}` : '-'}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-medium text-slate-500 mb-1">{t('products.table_highest')}</span>
              <span className="text-2xl font-bold text-red-600">
                {analysis.highest_price ? `${currencySymbol}${analysis.highest_price.toFixed(2)}` : '-'}
              </span>
            </div>
          </div>
        )}

        {/* Historique des prix */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t('products.historical_chart')}</h2>
              <p className="text-xs text-slate-500 mt-1">{t('products.showing_all')}</p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4">
              {competitors.length > 0 && (
                <>
                  <div className="flex flex-wrap items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                    {competitors.map((comp) => (
                      <label key={comp.id} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedCompetitorIds.has(comp.id)}
                          onChange={() => toggleCompetitor(comp.id)}
                          className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary w-4 h-4" 
                        />
                        <span className="text-sm text-slate-700">{comp.competitor.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-full border border-slate-100 justify-between sm:justify-start">
                    <button 
                      onClick={() => setTimeRange(30)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${timeRange === 30 ? 'text-white bg-brand-primary shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                    >30D</button>
                    <button 
                      onClick={() => setTimeRange(90)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${timeRange === 90 ? 'text-white bg-brand-primary shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                    >90D</button>
                    <button 
                      onClick={() => setTimeRange(365)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${timeRange === 365 ? 'text-white bg-brand-primary shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                    >1Y</button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {competitors.length > 0 ? (
            <div className="h-80 w-full flex items-end justify-between gap-2 relative pt-4">
              {isLoadingHistories ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-brand-primary rounded-full animate-spin"></div>
                </div>
              ) : selectedCompetitorIds.size === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Sélectionnez au moins un concurrent pour afficher l'historique
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(val) => `${currencySymbol}${val}`} dx={-10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`${currencySymbol}${Number(value).toFixed(2)}`, '']}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="You" stroke="#0f172a" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    {Array.from(selectedCompetitorIds).map((compId, idx) => {
                      const comp = competitors.find(c => c.id === compId);
                      if (!comp) return null;
                      return (
                        <Line 
                          key={compId}
                          type="monotone" 
                          dataKey={comp.competitor.name} 
                          stroke={chartColors[idx % chartColors.length]} 
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Aucune donnée disponible pour cette période
                </div>
              )}
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
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <h2 className="text-xl font-bold text-slate-900">{t('products.comparison_title')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('products.comparison_desc')}</p>
            </div>
            {competitors.length > 0 && renderAddCompetitorDropdown(isAddMenuOpen, setIsAddMenuOpen)}
          </div>
          
          {competitors.length > 0 ? (
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
                    {competitors.map((comp) => {
                      const priceDiff = comp.current_price && product.my_current_price
                        ? ((comp.current_price - product.my_current_price) / product.my_current_price) * 100
                        : null;
                      
                      return (
                        <tr key={comp.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center text-[10px] font-bold text-white">
                                {comp.competitor.name.charAt(0).toUpperCase()}
                              </div>
                              <a href={comp.product_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-primary hover:underline">
                                {comp.competitor.name}
                              </a>
                            </div>
                          </td>
                          <td className="p-4 text-slate-900 font-medium">
                            {!comp.last_scraped_at ? (
                              <div className="flex items-center gap-2 text-brand-primary">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span className="text-xs">{t('products.scraping_in_progress', 'Extraction...')}</span>
                              </div>
                            ) : comp.current_price ? (
                              `${currencySymbol}${comp.current_price.toFixed(2)}`
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="p-4">
                            {priceDiff !== null ? (
                              <span className={`font-medium text-sm ${priceDiff < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-4 text-xs text-slate-500">
                            {!comp.last_scraped_at ? (
                              <span className="text-brand-primary/80 italic">{t('products.scraping_ongoing', 'En cours')}</span>
                            ) : (
                              new Date(comp.last_scraped_at).toLocaleDateString()
                            )}
                          </td>
                          <td className="p-4 pr-6 text-right flex items-center justify-end gap-2">
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={() => handleMatchPrice(comp.current_price)}
                              disabled={!comp.current_price}
                            >
                              {t('products.match_price')}
                            </Button>
                            <button 
                              onClick={() => { setEditingCompetitor(comp); setIsAddCompetitorModalOpen(true); }}
                              className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded transition-colors"
                              title={t('products.edit')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setCompetitorToDelete(comp)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title={t('products.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="md:hidden space-y-4">
                {competitors.map((comp) => (
                  <div key={comp.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col border-t border-slate-100">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-white">
                          {comp.competitor.name.charAt(0).toUpperCase()}
                        </div>
                        <a href={comp.product_url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-brand-primary hover:underline">
                          {comp.competitor.name}
                        </a>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-slate-500 mb-1">{t('products.comp_table_price')}</div>
                        <div className="font-bold text-slate-900">
                          {!comp.last_scraped_at ? (
                            <div className="flex items-center gap-1 text-brand-primary text-sm">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span className="text-xs">{t('products.scraping_in_progress', 'Extraction...')}</span>
                            </div>
                          ) : comp.current_price ? (
                            `${currencySymbol}${comp.current_price.toFixed(2)}`
                          ) : (
                            'N/A'
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        {!comp.last_scraped_at ? (
                          <span className="text-brand-primary/80 italic">{t('products.scraping_ongoing', 'En cours...')}</span>
                        ) : (
                          new Date(comp.last_scraped_at).toLocaleDateString()
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleMatchPrice(comp.current_price)}
                          disabled={!comp.current_price}
                        >
                          {t('products.match_price')}
                        </Button>
                        <button 
                          onClick={() => { setEditingCompetitor(comp); setIsAddCompetitorModalOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-brand-primary rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setCompetitorToDelete(comp)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 px-6 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-b-xl border-t border-slate-100">
              <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-brand-primary/20 rounded-full animate-ping opacity-75"></div>
                <Search className="w-10 h-10 text-brand-primary relative z-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                {t('products.empty_competitors.title', 'Suivez vos concurrents')}
              </h3>
              <p className="text-slate-500 max-w-md mx-auto leading-relaxed mb-8">
                {t('products.empty_competitors.desc', 'Un produit sans concurrents, c\'est comme naviguer à l\'aveugle. Ajoutez vos concurrents pour surveiller leurs prix et ajuster automatiquement les vôtres.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Button 
                  onClick={() => setIsAddCompetitorModalOpen(true)}
                  className="px-8 py-3 text-base shadow-lg shadow-brand-primary/20 hover:shadow-xl hover:shadow-brand-primary/30 transition-all hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t('products.empty_competitors.cta', 'Ajouter mon premier concurrent')}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-6 py-3 text-base"
                >
                  <FileSpreadsheet className="w-5 h-5 mr-2 text-slate-400" />
                  {t('products.empty_competitors.import', 'Importer une liste')}
                </Button>
              </div>
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
      <ConfirmModal 
        isOpen={!!competitorToDelete}
        title="Supprimer ce concurrent ?"
        message={`Êtes-vous sûr de vouloir supprimer ${competitorToDelete?.competitor?.name || 'ce concurrent'} de la liste de vos concurrents ? L'historique des prix associé sera également perdu. Cette action est irréversible.`}
        confirmText={t('common.delete', 'Supprimer')}
        onConfirm={() => {
          if (competitorToDelete) {
            handleDeleteCompetitor(competitorToDelete.id);
            setCompetitorToDelete(null);
          }
        }}
        onCancel={() => setCompetitorToDelete(null)}
        variant="danger"
      />
      <AddCompetitorModal
        isOpen={isAddCompetitorModalOpen}
        onClose={() => { setIsAddCompetitorModalOpen(false); setEditingCompetitor(undefined); }}
        onSubmit={handleAddCompetitor}
        initialData={editingCompetitor}
      />
      <ImportCompetitorsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportCompetitors}
      />
    </DashboardLayout>
  );
};
