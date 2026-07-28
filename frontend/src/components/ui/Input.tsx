import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {label} {props.required && '*'}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full p-2.5 border rounded-lg outline-none transition-colors ${
            error 
              ? 'border-red-300 focus:ring-2 focus:ring-red-200 focus:border-red-500' 
              : 'border-slate-300 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
