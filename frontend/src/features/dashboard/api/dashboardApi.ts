import { apiFetch } from '../../../api/apiClient';

export interface Alert {
  id: string;
  message: string;
  created_at: string;
  alert_type: string;
  is_read: boolean;
  product_name: string;
}

export interface DashboardStats {
  total_tracked_products: number;
  price_changes: {
    decreased: number;
    increased: number;
  };
  recent_alerts: Alert[];
  price_positions: {
    cheapest: number;
    cheaper_than_avg: number;
    avg: number;
    higher_than_avg: number;
    highest: number;
    all_equal: number;
  };
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  return apiFetch<DashboardStats>('/api/dashboard/stats');
};

export const getAlerts = async (sort: 'newest' | 'oldest' = 'newest'): Promise<Alert[]> => {
  return apiFetch<Alert[]>(`/api/alerts?sort=${sort}`);
};

export const markAlertAsRead = async (id: string): Promise<void> => {
  await apiFetch(`/api/alerts/${id}/read`, { method: 'PUT' });
};

export const markAllAlertsAsRead = async (): Promise<void> => {
  await apiFetch('/api/alerts/read-all', { method: 'PUT' });
};
