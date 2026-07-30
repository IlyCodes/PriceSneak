import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import type { ProductCreate, Product } from '../api/productsApi';

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: ProductCreate) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel,
  onDirtyChange 
}) => {
  const { t } = useTranslation();
  const isEditing = !!initialData;
  const [formData, setFormData] = useState<ProductCreate>({
    sku: initialData?.sku || '',
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    category: initialData?.category || '',
    my_current_price: initialData?.my_current_price || undefined,
    cost_price: initialData?.cost_price || 0,
    is_active: initialData?.is_active ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (onDirtyChange) {
      const isDirty = 
        formData.sku !== (initialData?.sku || '') ||
        formData.name !== (initialData?.name || '') ||
        formData.brand !== (initialData?.brand || '') ||
        formData.category !== (initialData?.category || '') ||
        formData.my_current_price !== (initialData?.my_current_price || undefined) ||
        formData.cost_price !== (initialData?.cost_price || 0) ||
        formData.is_active !== (initialData?.is_active ?? true);
      
      onDirtyChange(isDirty);
    }
  }, [formData, initialData, onDirtyChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value ? parseFloat(value) : undefined) : value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.my_current_price !== undefined && formData.my_current_price < formData.cost_price) {
      setIsConfirmModalOpen(true);
      return;
    }
    executeSubmit();
  };

  const executeSubmit = async () => {
    setIsConfirmModalOpen(false);
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'enregistrement.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white">

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Input
          label={t('products.sku')}
          name="sku"
          value={formData.sku}
          onChange={handleChange}
          placeholder={t('products.sku_placeholder')}
          required
        />
        
        <Input
          label={t('products.name')}
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder={t('products.name_placeholder')}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('products.brand')}
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            placeholder="Ex: Apple"
          />
          <Input
            label={t('products.category')}
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="Ex: Smartphones"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('products.cost_price')}
            name="cost_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost_price || ''}
            onChange={handleChange}
            required
            className="font-medium"
          />
          <Input
            label={t('products.my_price')}
            name="my_current_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.my_current_price || ''}
            onChange={handleChange}
            className="font-medium text-brand-primary"
          />
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-5 h-5 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
            />
            <span className="text-sm font-medium text-slate-700">
              {t('products.is_active')}
            </span>
          </label>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 p-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('products.cancel')}
        </Button>
        <Button 
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? '...' : isEditing ? t('products.update') : t('products.add')}
        </Button>
      </div>
    </form>
    <ConfirmModal 
      isOpen={isConfirmModalOpen}
      title={t('products.price_warning_title')}
      message={t('products.price_warning_desc')}
      confirmText={t('products.proceed')}
      onConfirm={executeSubmit}
      onCancel={() => setIsConfirmModalOpen(false)}
    />
    </>
  );
}
