import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { X, Link as LinkIcon, Edit2 } from 'lucide-react';
import { type CompetitorProduct } from '../api/competitorsApi';

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void>;
  initialData?: CompetitorProduct;
}

export function AddCompetitorModal({ isOpen, onClose, onSubmit, initialData }: AddCompetitorModalProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl(initialData?.product_url || '');
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!url.trim()) {
      setError(t('products.details.competitors.addModal.errors.required'));
      return;
    }

    try {
      new URL(url); // Ensure backend doesn't crash on invalid formatting
    } catch {
      setError(t('products.details.competitors.addModal.errors.invalidUrl'));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(url);
      setUrl('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-brand-bg p-6 text-left shadow-2xl transition-all border border-brand-primary/10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              {initialData ? <Edit2 className="h-5 w-5 mr-2 text-brand-primary" /> : <LinkIcon className="h-5 w-5 mr-2 text-brand-primary" />}
              {initialData ? t('products.edit') : t('products.details.competitors.addModal.title')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label={t('products.details.competitors.addModal.urlLabel')}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://amazon.fr/dp/..."
                error={error}
                autoFocus
                required
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t('products.details.competitors.addModal.helpText')}
              </p>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t('products.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? '...' : (initialData ? t('common.save', 'Enregistrer') : t('products.add'))}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
