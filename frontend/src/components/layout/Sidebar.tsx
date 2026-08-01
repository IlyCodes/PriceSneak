import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Calculator, Settings as SettingsIcon, LogOut, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

export interface SidebarProps {
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (val: boolean) => void;
}

export const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSidebar = () => {
    setIsExpanded((prev: boolean) => {
      const newVal = !prev;
      localStorage.setItem('sidebarExpanded', JSON.stringify(newVal));
      return newVal;
    });
  };
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const { t } = useTranslation();

  const mainNavItems = [
    { icon: LayoutDashboard, path: '/dashboard', label: t('sidebar.dashboard', 'Dashboard') },
    { icon: Package, path: '/products', label: t('sidebar.products', 'My Products') }, 
    { icon: Calculator, path: '/rules', label: t('sidebar.rules', 'Pricing Rules') },
  ];

  const bottomNavItems = [
    { icon: SettingsIcon, path: '/settings', label: t('sidebar.settings', 'Settings') },
  ];

  return (
    <>
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen?.(false)}
        />
      )}
      
      <aside 
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 flex flex-col bg-brand-surface border-r border-brand-border transition-all duration-300 h-full shrink-0",
          isExpanded ? "w-64" : "w-20",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-8 bg-white border border-brand-border rounded-full p-1 text-brand-text-muted hover:text-brand-primary z-10 shadow-sm"
      >
        {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      <div className="h-24 flex items-center px-5 shrink-0">
        <div className="flex items-center gap-3 text-brand-primary font-bold text-xl w-full">
          <div className="w-8 h-8 bg-brand-primary text-white rounded flex items-center justify-center shrink-0">
            P
          </div>
          {isExpanded && <span className="truncate">PriceSneak</span>}
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={!isExpanded ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm",
                isActive 
                  ? "bg-blue-50 text-brand-primary" 
                  : "text-brand-text-muted hover:bg-slate-50 hover:text-brand-text-main",
                !isExpanded && "justify-center"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isExpanded && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-brand-border p-3 space-y-1 shrink-0">
        <div className={cn("flex items-center gap-3 px-3 py-3 text-sm font-medium text-brand-text-main", !isExpanded && "justify-center")}>
          <User className="w-5 h-5 text-brand-text-muted shrink-0" />
          {isExpanded && <span className="truncate">{user?.name || 'PriceSneak Admin'}</span>}
        </div>

        {bottomNavItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={!isExpanded ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm",
                isActive 
                  ? "bg-blue-50 text-brand-primary" 
                  : "text-brand-text-muted hover:bg-slate-50 hover:text-brand-text-main",
                !isExpanded && "justify-center"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isExpanded && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        <button 
          onClick={logout}
          title={!isExpanded ? t('sidebar.logout', 'Logout') : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm text-brand-danger hover:bg-red-50 mt-2",
            !isExpanded && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isExpanded && <span className="truncate">{t('sidebar.logout', 'Logout')}</span>}
        </button>
        </div>
      </aside>
    </>
  );
};
