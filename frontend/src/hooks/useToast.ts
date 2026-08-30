import { toast as hotToast, type ToastOptions } from 'react-hot-toast';

export const useToast = () => {
  const success = (message: string, options?: ToastOptions) => {
    return hotToast.success(message, options);
  };

  const error = (message: string, options?: ToastOptions) => {
    return hotToast.error(message, options);
  };

  const loading = (message: string, options?: ToastOptions) => {
    return hotToast.loading(message, options);
  };

  const dismiss = (toastId?: string) => {
    hotToast.dismiss(toastId);
  };

  const custom = (message: string, options?: ToastOptions) => {
    return hotToast(message, options);
  };

  return {
    success,
    error,
    loading,
    dismiss,
    custom,
  };
};
