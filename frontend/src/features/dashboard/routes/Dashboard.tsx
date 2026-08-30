import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { Card } from '../../../components/ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';
import type { DashboardStats } from '../api/dashboardApi';
import { getDashboardStats, markAlertAsRead, markAllAlertsAsRead } from '../api/dashboardApi';
import { AlertsModal } from '../components/AlertsModal';
import { useAuth } from '../../auth/context/AuthContext';
import { CheckCircle2 } from 'lucide-react';

const COLORS = {
  cheapest: '#10b981',      // Emerald 500
  cheaper_than_avg: '#34d399', // Emerald 400
  avg: '#60a5fa',           // Blue 400
  higher_than_avg: '#f87171',  // Red 400
  highest: '#ef4444',       // Red 500
  all_equal: '#9ca3af',     // Gray 400
};

export const Dashboard = () => {
  const { t } = useTranslation();
  const { currencySymbol } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [isAlertsModalOpen]); // Re-fetch when modal closes to update stats if deleted

  const handleQuickMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAlertAsRead(id);
      if (stats) {
        setStats({
          ...stats,
          recent_alerts: stats.recent_alerts.map(a => a.id === id ? { ...a, is_read: true } : a)
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Parses JSON payload for dynamic translations, gracefully falling back to raw strings for backwards compatibility with older static alerts.
  const renderAlertMessage = (message: string) => {
    try {
      const data = JSON.parse(message);
      return t('dashboard.alert_msg_format', "Rule '{{rule}}' applied. Competitor price is {{comp_price}}{{sym}}. Your price is {{new_price}}{{sym}}.", {
        rule: data.rule_name,
        comp_price: data.comp_price,
        new_price: data.new_price,
        sym: currencySymbol
      });
    } catch {
      return message;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const pieData = stats ? [
    { name: t('dashboard.pos_cheapest', 'Lowest Price'), value: stats.price_positions.cheapest, color: COLORS.cheapest },
    { name: t('dashboard.pos_cheaper', 'Competitive'), value: stats.price_positions.cheaper_than_avg, color: COLORS.cheaper_than_avg },
    { name: t('dashboard.pos_avg', 'Market Average'), value: stats.price_positions.avg, color: COLORS.avg },
    { name: t('dashboard.pos_higher', 'Premium'), value: stats.price_positions.higher_than_avg, color: COLORS.higher_than_avg },
    { name: t('dashboard.pos_highest', 'Highest Price'), value: stats.price_positions.highest, color: COLORS.highest },
    { name: t('dashboard.pos_equal', 'Price Parity'), value: stats.price_positions.all_equal, color: COLORS.all_equal },
  ].filter(d => d.value > 0) : [];

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-text-main tracking-tight">
            {t('dashboard.title', 'My Store')}
          </h1>
          <p className="text-brand-text-muted mt-1 flex items-center">
            <Trans 
              i18nKey="dashboard.subtitle" 
              values={{ count: stats?.total_tracked_products || 0 }}
              components={{
                1: <span className="px-2.5 py-0.5 mx-1.5 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-sm" />
              }}
            />
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="flex flex-col justify-between">
          <div>
            <div className="text-sm font-medium text-brand-text-muted mb-4 uppercase tracking-wider">
              {t('dashboard.price_changes', 'Price Changes')}
            </div>
            <div className="flex gap-10">
              <div>
                <div className="text-5xl font-bold text-brand-success">{stats?.price_changes.decreased || 0}</div>
                <div className="text-sm text-brand-text-muted font-medium mt-1">{t('dashboard.decreased', 'Decreased')}</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-brand-danger">{stats?.price_changes.increased || 0}</div>
                <div className="text-sm text-brand-text-muted font-medium mt-1">{t('dashboard.increased', 'Increased')}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-brand-text-muted uppercase tracking-wider">
              {t('dashboard.recent_alerts', 'Recent Alerts')}
            </div>
            <div className="flex items-center gap-3">
              {stats && stats.recent_alerts.length > 0 && stats.recent_alerts.some(a => !a.is_read) && (
                <button 
                  onClick={async () => {
                    try {
                      await markAllAlertsAsRead();
                      setStats({
                        ...stats,
                        recent_alerts: stats.recent_alerts.map(a => ({ ...a, is_read: true }))
                      });
                    } catch(err) {
                      console.error(err);
                    }
                  }}
                  className="text-xs font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
                  title={t('dashboard.mark_all_read', 'Mark all as read')}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              {stats && stats.recent_alerts.length > 0 && (
                <button 
                  onClick={() => setIsAlertsModalOpen(true)}
                  className="text-xs font-medium text-brand-primary hover:text-brand-primary/80 underline underline-offset-2"
                >
                  {t('dashboard.show_all', 'Show all')}
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1">
            {stats && stats.recent_alerts.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_alerts.map((alert) => (
                  <div key={alert.id} className="flex gap-3 group relative rounded-lg transition-colors hover:bg-gray-50 p-2 -mx-2">
                    <div className="flex-shrink-0 mt-1">
                      {!alert.is_read ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
                        </span>
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <p className="text-sm font-medium text-brand-text-main line-clamp-1">{alert.product_name}</p>
                      <p className="text-xs text-brand-text-muted line-clamp-1" title={renderAlertMessage(alert.message)}>{renderAlertMessage(alert.message)}</p>
                    </div>
                    
                    {!alert.is_read && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleQuickMarkAsRead(alert.id, e)} 
                          className="p-1.5 text-brand-primary hover:bg-brand-primary/10 rounded-full transition-colors"
                          title={t('dashboard.mark_read', 'Mark as read')}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                {t('dashboard.no_recent_alerts', 'No recent alerts.')}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 pb-16">
        <Card className="col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm font-medium text-brand-text-muted uppercase tracking-wider">
              {t('dashboard.price_position', 'Price Position')}
            </div>
            <Link to="/products" className="text-xs font-medium text-brand-primary hover:text-brand-primary/80 hover:underline underline-offset-2">
              {t('dashboard.show_all_products', 'Show all products')} →
            </Link>
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row gap-8 items-center">
            {/* Left side: stats */}
            <div className={pieData.length > 0 ? "w-full md:w-1/2 grid grid-cols-2 gap-6" : "w-full grid grid-cols-2 md:grid-cols-3 gap-8"}>
              {[
                { label: t('dashboard.pos_cheapest', 'Lowest Price'), count: stats?.price_positions.cheapest || 0, color: COLORS.cheapest },
                { label: t('dashboard.pos_cheaper', 'Competitive'), count: stats?.price_positions.cheaper_than_avg || 0, color: COLORS.cheaper_than_avg },
                { label: t('dashboard.pos_avg', 'Market Average'), count: stats?.price_positions.avg || 0, color: COLORS.avg },
                { label: t('dashboard.pos_higher', 'Premium'), count: stats?.price_positions.higher_than_avg || 0, color: COLORS.higher_than_avg },
                { label: t('dashboard.pos_highest', 'Highest Price'), count: stats?.price_positions.highest || 0, color: COLORS.highest },
                { label: t('dashboard.pos_equal', 'Price Parity'), count: stats?.price_positions.all_equal || 0, color: COLORS.all_equal },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-xs text-brand-text-muted font-medium">{item.label}</span>
                  </div>
                  <span className="text-2xl font-bold text-brand-text-main">
                    {item.count} <span className="text-sm font-normal text-gray-400">{t('dashboard.products', 'products')}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Right side: Donut chart */}
            {pieData.length > 0 && (
              <div className="w-full md:w-1/2 h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      className="cursor-pointer focus:outline-none hover:opacity-90 transition-opacity"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`${value} ${t('dashboard.products', 'products')}`, undefined]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-bold text-brand-text-main tracking-tight">
                    {stats?.total_tracked_products || 0}
                  </span>
                  <span className="text-sm font-medium text-brand-text-muted mt-0.5">
                    {t('dashboard.products', 'products')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <AlertsModal 
        isOpen={isAlertsModalOpen} 
        onClose={() => setIsAlertsModalOpen(false)} 
      />
    </DashboardLayout>
  );
};
