import React from 'react';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="h-screen w-full flex bg-brand-bg overflow-hidden font-sans">
      <Sidebar />
      <main id="main-scroll-container" className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
};
