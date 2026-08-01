import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { SlideOver } from '../../../components/ui/SlideOver';
import { Button } from '../../../components/ui/Button';
import type { Alert } from '../api/dashboardApi';
import { getAlerts, markAlertAsRead, markAllAlertsAsRead } from '../api/dashboardApi';
import { useAuth } from '../../auth/context/AuthContext';
import clsx from 'clsx';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GroupedAlerts = {
  today: Alert[];
  yesterday: Alert[];
  older: Alert[];
};

export const AlertsModal = ({ isOpen, onClose }: AlertsModalProps) => {
  const { t } = useTranslation();
  const { currencySymbol } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await getAlerts(sort);
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen, sort]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAlertAsRead(id);
      setAlerts(alerts.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAlertsAsRead();
      setAlerts(alerts.map(a => ({ ...a, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const groupAlerts = (alertList: Alert[]): GroupedAlerts => {
    const grouped: GroupedAlerts = { today: [], yesterday: [], older: [] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    alertList.forEach(a => {
      const alertDate = new Date(a.created_at);
      if (alertDate >= today) {
        grouped.today.push(a);
      } else if (alertDate >= yesterday && alertDate < today) {
        grouped.yesterday.push(a);
      } else {
        grouped.older.push(a);
      }
    });

    return grouped;
  };

  const groupedAlerts = groupAlerts(alerts);

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

  const renderAlertGroup = (title: string, group: Alert[]) => {
    if (group.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="sticky top-0 bg-white z-10 text-xs font-semibold text-brand-text-muted uppercase tracking-wider py-2 border-b border-gray-100 mb-3">
          {title}
        </h3>
        <div className="space-y-3">
          {group.map((alert) => (
            <div 
              key={alert.id}
              className={clsx(
                "p-4 rounded-xl border transition-all duration-200 group relative",
                !alert.is_read ? "bg-brand-primary/5 border-brand-primary/20" : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
              )}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  {!alert.is_read ? (
                    <button onClick={(e) => handleMarkAsRead(alert.id, e)} className="text-brand-primary hover:scale-110 transition-transform" title={t('dashboard.mark_read', 'Mark as read')}>
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-primary"></span>
                      </span>
                    </button>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-medium text-brand-text-main mb-1">
                    {alert.product_name}
                  </p>
                  <p className="text-xs text-brand-text-muted">
                    {renderAlertMessage(alert.message)}
                  </p>
                  <div className="text-[10px] text-gray-400 mt-2 font-medium">
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <SlideOver
        isOpen={isOpen}
        onClose={onClose}
        title={t('dashboard.all_alerts', 'All Alerts')}
        size="md"
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
              className="text-sm border-gray-200 rounded-lg focus:ring-brand-primary focus:border-brand-primary"
            >
              <option value="newest">{t('dashboard.sort_newest', 'Newest')}</option>
              <option value="oldest">{t('dashboard.sort_oldest', 'Oldest')}</option>
            </select>
            {alerts.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleMarkAllAsRead} 
                disabled={!alerts.some(a => !a.is_read)}
                className="text-brand-primary border-brand-primary/20 hover:text-brand-primary hover:bg-brand-primary/5 text-sm h-8 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {t('dashboard.mark_all_read', 'Mark all as read')}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-brand-text-main font-medium mb-1">{t('dashboard.no_alerts_title', 'All caught up!')}</p>
                <p className="text-sm text-brand-text-muted">{t('dashboard.no_alerts_desc', 'You have no alerts at the moment.')}</p>
              </div>
            ) : (
              <>
                {sort === 'newest' ? (
                  <>
                    {renderAlertGroup(t('dashboard.today', 'Today'), groupedAlerts.today)}
                    {renderAlertGroup(t('dashboard.yesterday', 'Yesterday'), groupedAlerts.yesterday)}
                    {renderAlertGroup(t('dashboard.older', 'Older'), groupedAlerts.older)}
                  </>
                ) : (
                  <>
                    {renderAlertGroup(t('dashboard.older', 'Older'), groupedAlerts.older)}
                    {renderAlertGroup(t('dashboard.yesterday', 'Yesterday'), groupedAlerts.yesterday)}
                    {renderAlertGroup(t('dashboard.today', 'Today'), groupedAlerts.today)}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </SlideOver>
    </>
  );
};
