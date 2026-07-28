export const BASE_URL = 'http://localhost:8000';

interface FetchOptions extends RequestInit {
  data?: any; // Objet JSON ou URLSearchParams (pour le login)
}

/**
 * Fonction "Wrapper" native autour de fetch.
 * - Ajoute automatiquement le token JWT
 * - Gère le JSON et URLSearchParams
 * - Lève des erreurs propres si le backend renvoie 400 ou 500
 */
export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { data, headers: customHeaders, ...customConfig } = options;
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body: BodyInit | undefined = undefined;

  if (data) {
    if (data instanceof URLSearchParams) {
      body = data;
      delete headers['Content-Type'];
    } else if (data instanceof FormData) {
      body = data;
      delete headers['Content-Type'];
    } else {
      body = JSON.stringify(data);
    }
  }

  const config: RequestInit = {
    method: data ? 'POST' : 'GET',
    ...customConfig,
    headers,
    body,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    let errorMessage: string;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || JSON.stringify(errorData);
    } catch {
      errorMessage = response.statusText || 'Une erreur réseau est survenue.';
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
