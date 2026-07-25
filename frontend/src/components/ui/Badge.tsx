import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'danger' | 'outline';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-blue-100 text-brand-primary",
    success: "bg-emerald-100 text-brand-success",
    danger: "bg-red-100 text-brand-danger",
    outline: "border border-brand-border text-brand-text-muted",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
