import React from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export const Dashboard = () => {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-text-main tracking-tight">Dashboard</h1>
          <p className="text-brand-text-muted mt-1">High-level overview of the price tracking engine.</p>
        </div>
        <Button className="shrink-0 gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="text-sm font-medium text-brand-text-muted mb-4">Total Products Tracked</div>
          <div className="text-5xl font-bold text-brand-text-main">12,408</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-brand-text-muted mb-4">Price Changes</div>
          <div className="flex gap-10">
            <div>
              <div className="text-4xl font-bold text-brand-success">156</div>
              <div className="text-xs text-brand-text-muted font-medium mt-1">Decreased</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-brand-danger">42</div>
              <div className="text-xs text-brand-text-muted font-medium mt-1">Increased</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-brand-text-muted mb-4">Competitor Drops Today</div>
          <div className="flex items-baseline gap-4">
            <div className="text-5xl font-bold text-brand-text-main">3</div>
            <span className="px-2 py-1 bg-emerald-50 text-brand-success text-xs font-medium rounded-full">↓ -12%</span>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};
