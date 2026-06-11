import { APP_CONFIG } from './constants';
import type { ApiResponse } from '@/types';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private csrfToken: string | null = null;

  constructor(baseURL: string = APP_CONFIG.apiUrl) {
    this.baseURL = baseURL;
    
    // Récupérer le token depuis localStorage si disponible
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      this.csrfToken = sessionStorage.getItem('csrf_token');
    }
  }

  setAuthToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  /**
   * Récupère un token CSRF depuis le serveur
   */
  private async fetchCsrfToken(): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/csrf-token`, {
        method: 'GET',
        credentials: 'include', // Important pour recevoir les cookies
      });

      if (!response.ok) {
        throw new Error('Impossible de récupérer le token CSRF');
      }

      const data = await response.json();
      const csrfToken = data.data?.csrfToken;

      if (!csrfToken) {
        throw new Error('Token CSRF manquant dans la réponse');
      }

      // Stocker le token en session
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('csrf_token', csrfToken);
      }
      this.csrfToken = csrfToken;

      return csrfToken;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtient le token CSRF (depuis le cache ou le serveur)
   */
  private async getCsrfToken(): Promise<string> {
    // Si on a déjà un token en cache, le retourner
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // Sinon, en récupérer un nouveau
    return await this.fetchCsrfToken();
  }

  /**
   * Réinitialise le token CSRF (utile après une erreur CSRF)
   */
  public async refreshCsrfToken(): Promise<void> {
    this.csrfToken = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('csrf_token');
    }
    await this.fetchCsrfToken();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Pour les requêtes qui modifient l'état, ajouter le token CSRF
    const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
      options.method?.toUpperCase() || 'GET'
    );

    let csrfToken: string | undefined;
    if (needsCsrf) {
      try {
        csrfToken = await this.getCsrfToken();
      } catch (error) {
        // Continuer sans token CSRF - le serveur renverra une erreur appropriée
      }
    }

    const config: RequestInit = {
      credentials: 'include', // Important pour envoyer/recevoir les cookies
      cache: 'no-store', // Disable Next.js and browser caching
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Le serveur a retourné une réponse invalide. Veuillez réessayer plus tard.`);
      }

      const data = await response.json();

      // Si erreur CSRF, rafraîchir le token et réessayer une fois
      if (!response.ok && (data.code === 'CSRF_TOKEN_INVALID' || data.code === 'CSRF_TOKEN_MISSING')) {
        await this.refreshCsrfToken();
        
        // Réessayer la requête avec le nouveau token
        return this.request<T>(endpoint, options);
      }

      if (!response.ok) {
        // Create error with details preserved
        const error: any = new Error(data.message || `HTTP error! status: ${response.status}`);
        error.response = { data }; // Preserve the full response data
        error.status = response.status;
        throw error;
      }

      return data;
    } catch (error: any) {
      // Re-throw to preserve error details
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Upload de fichiers
  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Obtenir le token CSRF pour l'upload
    let csrfToken: string | undefined;
    try {
      csrfToken = await this.getCsrfToken();
    } catch (error) {
      // Continue without CSRF token - server will return appropriate error
    }

    const config: RequestInit = {
      method: 'POST',
      credentials: 'include', // Important pour les cookies
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
      },
      body: formData,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Si erreur CSRF, rafraîchir le token et réessayer
      if (!response.ok && (data.code === 'CSRF_TOKEN_INVALID' || data.code === 'CSRF_TOKEN_MISSING')) {
        await this.refreshCsrfToken();
        
        // Réessayer l'upload avec le nouveau token
        return this.upload<T>(endpoint, formData);
      }

      if (!response.ok) {
        // Create error with details preserved
        const error: any = new Error(data.message || `HTTP error! status: ${response.status}`);
        error.response = { data }; // Preserve the full response data
        error.status = response.status;
        throw error;
      }

      return data;
    } catch (error: any) {
      // Re-throw to preserve error details
      throw error;
    }
  }
}

// Instance globale de l'API client
export const apiClient = new ApiClient();

// Services spécifiques
export const homeService = {
  getContent: () => apiClient.get('/home'),
  updateContent: (data: any) => apiClient.put('/admin/home', data),
  updateHero: (data: any) => apiClient.put('/admin/home/hero', data),
  updateAbout: (data: any) => apiClient.put('/admin/home/about', data),
  updateServices: (data: any) => apiClient.put('/admin/home/services', data),
  updateProcess: (data: any) => apiClient.put('/admin/home/process', data),
  updateTestimonials: (data: any) => apiClient.put('/admin/home/testimonials', data),
  updateContact: (data: any) => apiClient.put('/admin/home/contact', data),
  togglePublish: (section: string, published: boolean) => 
    apiClient.post('/admin/home/publish', { section, published }),
};

export const productsService = {
  getAll: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/products?${searchParams}`);
  },
  getAllAdmin: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/admin/products?${searchParams}`);
  },
  getById: (id: string) => apiClient.get(`/admin/products/${id}`), // Admin endpoint for ID lookup
  getBySlug: (slug: string) => apiClient.get(`/products/slug/${slug}`), // Public endpoint for slug lookup
  create: (data: any) => apiClient.post('/admin/products', data),
  update: (id: string, data: any) => apiClient.put(`/admin/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/admin/products/${id}`),
  bulkOperations: (data: { action: string; productIds: string[]; data?: any }) =>
    apiClient.post('/admin/products/bulk', data),
};

export const galleryService = {
  getImages: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/gallery?${searchParams}`);
  },
  uploadImage: (formData: FormData) => apiClient.upload('/admin/gallery/upload', formData),
  updateImage: (id: string, data: any) => apiClient.put(`/admin/gallery/${id}`, data),
  deleteImage: (id: string) => apiClient.delete(`/admin/gallery/${id}`),
  bulkOperations: (data: { action: string; imageIds: string[]; data?: any }) =>
    apiClient.post('/admin/gallery/bulk', data),
  updateSortOrder: (imageOrders: Array<{ id: string; sortOrder: number }>) =>
    apiClient.put('/admin/gallery/sort-order', { imageOrders }),
  cleanupOrphanedImages: () => apiClient.post('/admin/gallery/cleanup-orphaned', {}),
};

export const messagesService = {
  getAll: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/admin/messages?${searchParams}`);
  },
  send: (data: any) => apiClient.post('/messages', data),
  markAsRead: (id: string) => apiClient.patch(`/admin/messages/${id}/read`),
  reply: (id: string, data: any) => apiClient.post(`/admin/messages/${id}/reply`, data),
  delete: (id: string) => apiClient.delete(`/admin/messages/${id}`),
};

export const mediaService = {
  getAll: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/admin/media?${searchParams}`);
  },
  getStats: () => apiClient.get('/admin/media/stats'),
  getReferences: (url: string) => apiClient.get(`/admin/media/references?url=${encodeURIComponent(url)}`),
  delete: (url: string) => apiClient.delete('/admin/media', { url }),
  deleteAll: () => apiClient.delete('/admin/media/all'),
  replace: (oldUrl: string, newUrl: string) => 
    apiClient.put('/admin/media/replace', { oldUrl, newUrl }),
  uploadAndReplace: (oldUrl: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('oldUrl', oldUrl);
    return apiClient.upload('/admin/media/upload-replace', formData);
  },
  search: (query: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams({ q: query, ...params });
    return apiClient.get(`/admin/media/search?${searchParams}`);
  },
  getByCategory: (category: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/admin/media/by-category/${category}?${searchParams}`);
  },
  getBySource: (source: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/admin/media/by-source/${source}?${searchParams}`);
  },
  getStorageUsage: () => apiClient.get('/admin/media/storage'),
};

export const categoryService = {
  getAll: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/admin/categories?${searchParams}`);
  },
  getById: (id: string) => apiClient.get(`/admin/categories/${id}`),
  create: (data: any) => apiClient.post('/admin/categories', data),
  update: (id: string, data: any) => apiClient.put(`/admin/categories/${id}`, data),
  delete: (id: string) => apiClient.delete(`/admin/categories/${id}`),
  initialize: () => apiClient.post('/admin/categories/initialize', {}),
};

export const authService = {
  login: (email: string, password: string) => 
    apiClient.post('/auth/login', { email, password }),
  logout: () => {
    apiClient.setAuthToken(null);
    return Promise.resolve();
  },
  getProfile: () => apiClient.get('/auth/profile'),
};

export const auditService = {
  getAll: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/admin/audit?${searchParams}`);
  },
  getById: (id: string) => apiClient.get(`/admin/audit/${id}`),
  getByResource: (resource: string, id: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/admin/audit/resource/${resource}/${id}?${searchParams}`);
  },
  getByUser: (userId: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/admin/audit/user/${userId}?${searchParams}`);
  },
  getRecent: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/admin/audit/recent?${searchParams}`);
  },
  getDestructive: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/admin/audit/destructive?${searchParams}`);
  },
  getStatistics: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/admin/audit/statistics?${searchParams}`);
  },
};