import { apiFetch, BASE_URL } from '../../../api/apiClient';

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  category?: string;
  my_current_price?: number;
  cost_price: number;
  is_active: boolean;
  rule_id?: string;
  competitors_count: number;
  created_at: string;
  updated_at: string;
  analysis?: {
    cheapest_price: number | null;
    avg_price: number | null;
    highest_price: number | null;
  };
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ProductCreate {
  sku?: string;
  name: string;
  brand?: string;
  category?: string;
  my_current_price?: number;
  cost_price: number;
  is_active?: boolean;
}

export const getProducts = async (page: number = 1, size: number = 10, search?: string): Promise<PaginatedProducts> => {
  const queryParams = new URLSearchParams({ page: page.toString(), size: size.toString() });
  if (search) {
    queryParams.append('search', search);
  }
  return apiFetch<PaginatedProducts>(`/api/products?${queryParams.toString()}`);
};

export const getProduct = async (id: string): Promise<Product> => {
  return apiFetch<Product>(`/api/products/${id}`);
};

export const createProduct = async (data: ProductCreate): Promise<Product> => {
  return apiFetch<Product>('/api/products/', {
    method: 'POST',
    data
  });
};

export const updateProduct = async (id: string, data: Partial<ProductCreate>): Promise<Product> => {
  return apiFetch<Product>(`/api/products/${id}`, {
    method: 'PUT',
    data
  });
};

export const getProductHistory = async (id: string): Promise<{ history: any[] }> => {
  return apiFetch<{ history: any[] }>(`/api/products/${id}/history`);
};

export const getProductAnalysis = async (id: string): Promise<{ cheapest_price: number | null, avg_price: number | null, highest_price: number | null }> => {
  return apiFetch<{ cheapest_price: number | null, avg_price: number | null, highest_price: number | null }>(`/api/products/${id}/analysis`);
};

export const deleteProduct = async (id: string): Promise<void> => {
  return apiFetch<void>(`/api/products/${id}`, {
    method: 'DELETE'
  });
};

export const importProducts = async (file: File): Promise<{imported: number, updated: number}> => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<{imported: number, updated: number}>('/api/products/import', {
    method: 'POST',
    data: formData,
  });
};

export const exportProducts = async (format: 'csv' | 'excel', search?: string): Promise<void> => {
  const token = localStorage.getItem('token');
  const queryParams = new URLSearchParams({ format });
  if (search) {
    queryParams.append('search', search);
  }
  
  const response = await fetch(`${BASE_URL}/api/products/export?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Erreur lors de l\'exportation');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const ext = format === 'excel' ? 'xlsx' : 'csv';
  link.download = `products_export.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
