import { apiFetch } from '../../../api/apiClient';

export interface Competitor {
  id: string;
  name: string;
  domain_url: string;
}

export interface CompetitorProduct {
  id: string;
  product_id: string;
  competitor_id: string;
  product_url: string;
  current_price?: number;
  is_in_stock: boolean;
  last_scraped_at?: string;
  competitor: Competitor;
}

export interface PriceHistoryPoint {
  recorded_at: string;
  price: number;
}

export interface PriceHistoryResponse {
  competitor_product_id: string;
  history: PriceHistoryPoint[];
}

export const fetchCompetitors = async (productId: string): Promise<CompetitorProduct[]> => {
  return apiFetch<CompetitorProduct[]>(`/api/products/${productId}/competitors`);
};

export const addCompetitor = async (productId: string, productUrl: string): Promise<CompetitorProduct> => {
  return apiFetch<CompetitorProduct>(`/api/products/${productId}/competitors`, {
    data: { product_url: productUrl }
  });
};

export const deleteCompetitor = async (productId: string, competitorId: string): Promise<void> => {
  return apiFetch<void>(`/api/products/${productId}/competitors/${competitorId}`, {
    method: 'DELETE',
  });
};

export const updateCompetitor = async (productId: string, competitorId: string, url: string): Promise<CompetitorProduct> => {
  return apiFetch<CompetitorProduct>(`/api/products/${productId}/competitors/${competitorId}`, {
    method: 'PUT',
    data: { product_url: url },
  });
};

export const getCompetitorPriceHistory = async (productId: string, competitorId: string): Promise<PriceHistoryResponse> => {
  return apiFetch<PriceHistoryResponse>(`/api/products/${productId}/competitors/${competitorId}/history`);
};

export const fetchCompetitorHistory = async (productId: string, competitorProductId: string): Promise<PriceHistoryResponse> => {
  return apiFetch<PriceHistoryResponse>(`/api/products/${productId}/competitors/${competitorProductId}/history`);
};
