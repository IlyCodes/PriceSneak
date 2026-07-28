import React, { useEffect, useRef, useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from './ConfirmModal';
import { useTranslation } from 'react-i18next';

interface SlideOverProps {
  isOpen: boolean;
  onClose: (force?: boolean) => void;
  title: string;
  children: React.ReactNode;
  isDirty?: boolean;
  expandUrl?: string; // If provided, shows the expand button
}

export function SlideOver({ isOpen, onClose, title, children, isDirty = false, expandUrl }: SlideOverProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty]);

  // Focus trap
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement?.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement?.focus();
            }
          }
        }
      };

      panelRef.current.addEventListener('keydown', handleTabKey);
      // Auto-focus first element
      firstElement?.focus();

      return () => {
        panelRef.current?.removeEventListener('keydown', handleTabKey);
      };
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    if (isDirty) {
      setIsConfirmModalOpen(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setIsConfirmModalOpen(false);
    onClose(true);
  };

  const handleExpand = () => {
    if (expandUrl) {
      navigate(expandUrl);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden" 
      aria-labelledby="slide-over-title" 
      role="dialog" 
      aria-modal="true"
    >
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
          aria-hidden="true" 
          onClick={handleClose}
        />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div 
            ref={panelRef}
            className={cn(
              "pointer-events-auto w-screen transition-all duration-300 ease-in-out transform",
              isExpanded ? "max-w-full" : "max-w-md",
              "translate-x-0"
            )}
          >
            <div className="flex h-full flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between px-4 py-6 sm:px-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900" id="slide-over-title">
                  {title}
                </h2>
                <div className="ml-3 flex h-7 items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExpand}
                    className="rounded-md bg-white text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
                    title="Ouvrir sur une page dédiée / Plein écran"
                  >
                    <span className="sr-only">Toggle expand</span>
                    {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-white text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
                    onClick={handleClose}
                  >
                    <span className="sr-only">Close panel</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="relative flex-1 px-4 py-6 sm:px-6 overflow-y-auto">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        title={t('products.discard_changes', 'Discard changes')}
        message={t('products.discard_confirm', 'You have unsaved changes. Are you sure you want to close?')}
        confirmText={t('products.discard', 'Discard')}
        onConfirm={confirmClose}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </div>
  );
}
