import { useState, useEffect, useCallback } from 'react';
import { onDashboardRefresh } from '@/lib/dashboardRefresh';
import { useDashboardRefresh } from '@/contexts/DashboardContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Product statistics interface
 */
export interface ProductStats {
  totalProducts: number;
  featuredProducts: number;
  categoriesCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

/**
 * Gallery statistics interface
 */
export interface GalleryStats {
  totalImages: number;
  featuredImages: number;
  categoriesCount: number;
  totalSize: number;
  avgSize: number;
  formatsCount: number;
}

/**
 * Media library statistics interface
 */
export interface MediaStats {
  totalMedia: number;
  totalImages: number;
  totalVideos: number;
  totalSize: number;
  bySource: {
    product: number;
    gallery: number;
    homepage: number;
  };
  byCategory: Record<string, number>;
}

/**
 * Recent upload item interface
 */
export interface RecentUpload {
  id: string;
  type: 'product' | 'gallery';
  name: string;
  imageUrl?: string;
  createdAt: string;
  category?: string;
}

/**
 * Products breakdown by category
 */
export interface CategoryBreakdown {
  category: string;
  count: number;
  subcategories: string[];
}

/**
 * Hook to fetch product statistics
 */
export function useProductStats() {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { refreshKey } = useDashboardRefresh();

  // Fetch on mount and when refreshKey changes
  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('🔄 Fetching product stats (refreshKey:', refreshKey, ')');
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/products/stats?_t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch product stats');
        }

        const data = await response.json();
        console.log('📊 Product stats updated:', data.data);
        setStats(data.data);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching product stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [refreshKey]); // Only depend on refreshKey

  return { stats, loading, error };
}

/**
 * Hook to fetch gallery statistics
 */
export function useGalleryStats() {
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { refreshKey } = useDashboardRefresh();

  // Fetch on mount and when refreshKey changes
  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('🔄 Fetching gallery stats (refreshKey:', refreshKey, ')');
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/gallery/stats?_t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch gallery stats');
        }

        const data = await response.json();
        console.log('📊 Gallery stats updated:', data.data);
        setStats(data.data);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching gallery stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [refreshKey]); // Only depend on refreshKey

  return { stats, loading, error };
}

/**
 * Hook to fetch media library statistics (requires authentication)
 */
export function useMediaStats() {
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { refreshKey } = useDashboardRefresh();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Import mediaService from api.ts for consistent auth/CSRF handling
        const { mediaService } = await import('@/lib/api');
        
        setLoading(true);
        console.log('🔄 Fetching media stats (refreshKey:', refreshKey, ')');
        
        const response = await mediaService.getStats();
        
        if (response.success && response.data) {
          console.log('📊 Media stats updated:', response.data);
          setStats(response.data);
          setError(null);
        } else {
          throw new Error('Failed to fetch media stats');
        }
      } catch (err: any) {
        // Handle auth errors gracefully
        if (err.response?.status === 401) {
          console.log('⚠️ Media stats: Unauthorized (401) - token may be invalid or expired');
          setError(null); // Clear error for auth issues (user not logged in)
        } else {
          setError(err as Error);
          console.error('Error fetching media stats:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [refreshKey]); // Re-fetch when refreshKey changes

  return { stats, loading, error };
}

/**
 * Hook to fetch products breakdown by category
 */
export function useProductCategories() {
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { refreshKey } = useDashboardRefresh();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        console.log('🔄 Fetching product categories breakdown (refreshKey:', refreshKey, ')');
        const response = await fetch(`${API_BASE_URL}/products/categories/breakdown?_t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch product categories');
        }

        const data = await response.json();
        console.log('📊 Product categories updated:', data.data);
        setCategories(data.data);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching product categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [refreshKey]); // Re-fetch when refreshKey changes

  return { categories, loading, error };
}

/**
 * Hook to fetch recent uploads (last 10 items)
 */
export function useRecentUploads() {
  const [uploads, setUploads] = useState<RecentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { refreshKey } = useDashboardRefresh();

  useEffect(() => {
    const fetchRecentUploads = async () => {
      try {
        setLoading(true);
        
        // Fetch recent products and gallery images in parallel
        const [productsResponse, galleryResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/products?limit=5&sort=-createdAt&_t=${Date.now()}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          }),
          fetch(`${API_BASE_URL}/gallery?limit=5&sort=-uploadedAt&_t=${Date.now()}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          }),
        ]);

        // Check responses - don't throw if one fails, just use what works
        const productsData = productsResponse.ok ? await productsResponse.json() : { data: [] };
        const galleryData = galleryResponse.ok ? await galleryResponse.json() : { data: [] };

        // Combine and format the data
        const recentProducts: RecentUpload[] = (productsData.data || []).map((product: any) => ({
          id: product._id,
          type: 'product' as const,
          name: product.name,
          imageUrl: product.images?.[0]?.url,
          createdAt: product.createdAt,
          category: product.category,
        }));

        const recentGallery: RecentUpload[] = (galleryData.data || []).map((image: any) => ({
          id: image._id,
          type: 'gallery' as const,
          name: image.title,
          imageUrl: image.url,
          createdAt: image.uploadedAt,
          category: image.category,
        }));

        // Combine and sort by date
        const combined = [...recentProducts, ...recentGallery]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);

        setUploads(combined);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching recent uploads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentUploads();
  }, [refreshKey]); // Re-fetch when refreshKey changes

  return { uploads, loading, error };
}

/**
 * Combined hook for all dashboard analytics
 */
export function useDashboardAnalytics() {
  const productStats = useProductStats();
  const galleryStats = useGalleryStats();
  const mediaStats = useMediaStats();
  const categories = useProductCategories();
  const recentUploads = useRecentUploads();

  const loading = 
    productStats.loading || 
    galleryStats.loading || 
    mediaStats.loading || 
    categories.loading || 
    recentUploads.loading;

  const error = 
    productStats.error || 
    galleryStats.error || 
    mediaStats.error || 
    categories.error || 
    recentUploads.error;

  return {
    productStats: productStats.stats,
    galleryStats: galleryStats.stats,
    mediaStats: mediaStats.stats,
    categories: categories.categories,
    recentUploads: recentUploads.uploads,
    loading,
    error,
  };
}
