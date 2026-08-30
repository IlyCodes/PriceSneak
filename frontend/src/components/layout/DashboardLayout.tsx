import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import { ChatbotWidget } from '../../features/dashboard/components/ChatbotWidget';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-full flex bg-brand-bg overflow-hidden font-sans">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile TopBar */}
        <header className="md:hidden flex items-center justify-between px-4 h-16 bg-white border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2 text-brand-primary font-bold text-lg">
            <div className="w-7 h-7 bg-brand-primary text-white rounded flex items-center justify-center shrink-0 text-sm">
              P
            </div>
            <span>PriceSneak</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -mr-2 text-brand-text-muted hover:text-brand-primary focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main id="main-scroll-container" className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
      <ChatbotWidget />
    </div>
  );
};
