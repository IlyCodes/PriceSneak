import React from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      primary: "bg-brand-primary text-white hover:bg-blue-700 focus:ring-brand-primary rounded-xl shadow-sm",
      secondary: "bg-blue-50 text-brand-primary hover:bg-blue-100 focus:ring-brand-primary rounded-xl",
      outline: "border border-brand-border bg-transparent text-brand-text-main hover:bg-slate-50 focus:ring-slate-400 rounded-xl",
      ghost: "bg-transparent text-brand-text-muted hover:bg-slate-100 hover:text-brand-text-main rounded-xl",
      icon: "bg-transparent text-brand-text-muted hover:bg-slate-100 hover:text-brand-primary rounded-lg",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 py-2",
      lg: "h-12 px-6 text-lg",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
