/**
 * Product API Client
 * Handles all product-related API calls
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  subcategory?: string;
  images: Array<{
    url: string;
    alt: string;
    isPrimary: boolean;
  }>;
  specifications: Record<string, string>;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit: 'cm' | 'm';
  };
  materials: string[];
  finishes: string[];
  price?: {
    amount: number;
    currency: string;
    unit?: string;
  };
  availability: 'in_stock' | 'made_to_order' | 'out_of_stock';
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  materials?: string[];
  availability?: string;
  tags?: string[];
  search?: string;
  featured?: boolean;
}

export interface ProductsResponse {
  success: boolean;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProductResponse {
  success: boolean;
  data: Product;
}

export interface CategoriesResponse {
  success: boolean;
  data: Array<{
    category: string;
    count: number;
    subcategories: Array<{
      name: string;
      count: number;
    }>;
  }>;
}

/**
 * Fetch products with filters and pagination
 */
export async function getProducts(
  page: number = 1,
  limit: number = 12,
  filters: ProductFilters = {},
  sortBy: string = 'newest'
): Promise<ProductsResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort: sortBy,
    });

    if (filters.category) params.append('category', filters.category);
    if (filters.subcategory) params.append('subcategory', filters.subcategory);
    if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.availability) params.append('availability', filters.availability);
    if (filters.featured !== undefined) params.append('featured', filters.featured.toString());
    
    if (filters.search && filters.search.trim().length >= 2) {
      params.append('search', filters.search.trim());
    }
    
    if (filters.materials && filters.materials.length > 0) {
      filters.materials.forEach(material => params.append('materials', material));
    }
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }

    const url = `${API_BASE_URL}/products?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Server returned non-JSON response`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch products`);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    return {
      success: false,
      data: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        pages: 0,
      },
    };
  }
}

/**
 * Fetch a single product by slug
 */
export async function getProductBySlug(slug: string): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/products/slug/${slug}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch product: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch featured products
 */
export async function getFeaturedProducts(limit: number = 6): Promise<ProductsResponse> {
  const response = await fetch(`${API_BASE_URL}/products/featured?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch featured products: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch product categories
 */
export async function getCategories(): Promise<CategoriesResponse> {
  const response = await fetch(`${API_BASE_URL}/products/categories`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'force-cache', // Cache categories as they don't change often
    next: { revalidate: 3600 }, // Revalidate every hour
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search products
 */
export async function searchProducts(
  query: string,
  page: number = 1,
  limit: number = 12
): Promise<ProductsResponse> {
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/products/search?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to search products: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get similar products
 */
export async function getSimilarProducts(productId: string, limit: number = 4): Promise<ProductsResponse> {
  const response = await fetch(`${API_BASE_URL}/products/${productId}/similar?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch similar products: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Format price for display
 */
export function formatPrice(price?: { amount: number; currency: string; unit?: string }): string {
  if (!price) return 'Prix sur demande';
  
  const formatter = new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: price.currency || 'TND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const formattedAmount = formatter.format(price.amount);
  return price.unit ? `${formattedAmount}/${price.unit}` : formattedAmount;
}

/**
 * Get availability label
 */
export function getAvailabilityLabel(availability: string): string {
  const labels: Record<string, string> = {
    in_stock: 'En stock',
    made_to_order: 'Sur commande',
    out_of_stock: 'Rupture de stock',
  };
  return labels[availability] || availability;
}

/**
 * Get availability color
 */
export function getAvailabilityColor(availability: string): string {
  const colors: Record<string, string> = {
    in_stock: 'text-green-600 bg-green-50',
    made_to_order: 'text-blue-600 bg-blue-50',
    out_of_stock: 'text-red-600 bg-red-50',
  };
  return colors[availability] || 'text-gray-600 bg-gray-50';
}

/**
 * Get category label in French
 */
export function getCategoryLabel(category: string): string {
  if (!category) return '';
  const labels: Record<string, string> = {
    cuisine: 'Cuisine',
    dressing: 'Dressing',
    mobilier: 'Mobilier',
    amenagement: 'Aménagement',
    autre: 'Autre',
  };
  if (labels[category]) return labels[category];
  
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get primary image from product
 */
export function getPrimaryImage(product: Product): string {
  const primaryImage = product.images.find(img => img.isPrimary);
  return primaryImage?.url || product.images[0]?.url || '/placeholder-product.jpg';
}

/**
 * Get primary image alt text
 */
export function getPrimaryImageAlt(product: Product): string {
  const primaryImage = product.images.find(img => img.isPrimary);
  return primaryImage?.alt || product.images[0]?.alt || product.name;
}
