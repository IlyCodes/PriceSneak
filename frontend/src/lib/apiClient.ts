const BASE_URL = 'http://localhost:8000';

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

  // Headers par défaut
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // Ajout du JWT s'il est présent
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body: BodyInit | undefined = undefined;

  // Gestion du body (Data)
  if (data) {
    if (data instanceof URLSearchParams) {
      body = data;
      delete headers['Content-Type'];
    } else {
      body = JSON.stringify(data);
    }
  }

  // Configuration finale de la requête
  const config: RequestInit = {
    method: data ? 'POST' : 'GET',
    ...customConfig,
    headers,
    body,
  };

  // Exécution de la requête native
  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  // Gestion des erreurs
  if (!response.ok) {
    let errorMessage = 'Une erreur réseau est survenue.';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || JSON.stringify(errorData);
    } catch (e) {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
