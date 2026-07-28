import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileType, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';

interface ImportCompetitorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}

export function ImportCompetitorsModal({ isOpen, onClose, onImport }: ImportCompetitorsModalProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validTypes = [
      'text/csv', 
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    // MIME types vary by OS, verify extension instead
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isValidExt = ext === 'csv' || ext === 'xls' || ext === 'xlsx';

    if (validTypes.includes(file.type) || isValidExt) {
      setSelectedFile(file);
    } else {
      setError(t('products.details.competitors.importModal.errors.invalidFormat', "Format de fichier non supporté. Veuillez utiliser CSV ou Excel (.xlsx)."));
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      await onImport(selectedFile);
      onClose();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    const headers = "URL\n";
    const sample = "https://www.amazon.com/dp/B0CHX48DBN\nhttps://www.bestbuy.com/site/apple-iphone-15-pro-128gb/6525411.p\n";
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "pricesneak_competitors_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetState = () => {
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-brand-primary/10">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t('products.details.competitors.importModal.title', 'Importer des Concurrents')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('products.details.competitors.importModal.desc', 'Uploadez un fichier contenant les liens des produits concurrents.')}</p>
            
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-sm text-slate-900 font-bold mb-0.5">
                {t('products.important_title')}
              </p>
              <p className="text-sm text-slate-600">
                {t('products.details.competitors.importModal.importantDesc', 'Le fichier doit contenir une seule colonne "URL".')}
                <a href="#" onClick={handleDownloadTemplate} className="text-brand-primary font-medium hover:underline block sm:inline sm:ml-1 mt-1 sm:mt-0">
                  {t('products.download_template')}
                </a>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {!selectedFile ? (
            <div 
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
                ${isDragging ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-200 hover:border-brand-primary hover:bg-slate-50'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
              />
              
              <div className="w-14 h-14 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">{t('products.drag_drop')}</h3>
              <p className="text-sm text-slate-500 text-center max-w-xs">
                {t('products.support_desc')}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center relative">
              <button 
                onClick={resetState}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <FileType className="w-12 h-12 text-slate-400 mb-4" />
              <div className="flex items-center gap-2 text-brand-primary font-medium mb-1">
                <CheckCircle className="w-4 h-4" />
                {t('products.file_selected')}
              </div>
              <p className="text-sm font-semibold text-slate-900 truncate max-w-xs text-center mb-1">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            {t('products.cancel')}
          </Button>
          <Button variant="primary" onClick={handleImport} disabled={!selectedFile || isUploading}>
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block"></div>
                {t('products.importing')}
              </>
            ) : t('products.btn_import')}
          </Button>
        </div>
      </div>
    </div>
  );
}
