'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navigation } from '@/components/public/Navigation';
import { Footer } from '@/components/public/Footer';
import ProductGrid from '@/components/public/ProductGrid';
import Pagination from '@/components/ui/Pagination';
import { SkeletonGrid } from '@/components/ui/LoadingSkeleton';
import { getProducts, Product, ProductFilters, getCategoryLabel, getCategories } from '@/lib/api/products';

/**
 * Product Catalog Page with SEO optimization
 * Requirements: 23.5, 23.9, 23.10
 */
export default function ProduitsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  // Filters from URL
  const [filters, setFilters] = useState<ProductFilters>({
    category: searchParams.get('category') || undefined,
    search: searchParams.get('search') || undefined,
  });

  const [availableCategories, setAvailableCategories] = useState<Array<{ category: string; name?: string; count: number }>>([]);
  
  // Fetch available categories dynamically
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await getCategories();
        if (response.success && response.data) {
          setAvailableCategories(response.data);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    loadCategories();
  }, []);
  
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Fix SSR hydration by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProducts(currentPage, 12, filters, sortBy);
      
      if (!response.success) {
        setError('Impossible de charger les produits. Veuillez réessayer.');
      }
      
      setProducts(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
      setTotal(response.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors du chargement des produits');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, sortBy]);

  // Fetch products when dependencies change
  useEffect(() => {
    if (!mounted) return; // Only fetch on client side
    fetchProducts();
  }, [fetchProducts, mounted]);

  // Update URL when filters change
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    const queryString = params.toString();
    router.push(`/produits${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [filters, sortBy, currentPage, router]);

  useEffect(() => {
    updateURL();
  }, [updateURL]);

  // Handle category filter
  const handleCategoryChange = (category: string) => {
    setFilters(prev => ({
      ...prev,
      category: category === 'all' ? undefined : category,
    }));
    setCurrentPage(1);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    
    // Only apply search if empty or at least 2 characters
    if (trimmed.length === 0 || trimmed.length >= 2) {
      setFilters(prev => ({
        ...prev,
        search: trimmed || undefined,
      }));
      setCurrentPage(1);
    }
    // If 1 character, do nothing (keep current filters)
  };

  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearchInput('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const hasActiveFilters = filters.category || filters.search;

  // Show loading state during SSR/mounting
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-wood text-white" role="banner">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold mb-6 lg:text-5xl">
              Nos Produits
            </h1>
            <p className="text-xl opacity-90">
              Explorez notre collection de créations en bois d'exception, 
              chaque pièce étant le fruit d'un savoir-faire artisanal unique.
            </p>
          </div>
        </div>
      </section>

      {/* Filters and Search */}
      <section 
        className="py-8 bg-white border-b sticky top-0 z-10 shadow-sm" 
        aria-label="Filtres et recherche de produits"
      >
        <div className="container">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par catégorie">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors focus-visible-enhanced ${
                  !filters.category
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
                aria-pressed={!filters.category}
                aria-label="Afficher tous les produits"
              >
                Tous
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => handleCategoryChange(cat.category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors focus-visible-enhanced ${
                    filters.category === cat.category
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                  aria-pressed={filters.category === cat.category}
                  aria-label={`Filtrer par ${cat.name || getCategoryLabel(cat.category)}`}
                >
                  {cat.name || getCategoryLabel(cat.category)}
                </button>
              ))}
            </div>

            {/* Search and Sort */}
            <div className="flex gap-4 flex-1 lg:flex-initial">
              <form onSubmit={handleSearch} className="flex gap-2 flex-1 lg:w-64" role="search">
                <label htmlFor="product-search" className="sr-only">Rechercher des produits</label>
                <div className="relative flex-1">
                  <input
                    id="product-search"
                    type="search"
                    placeholder="Rechercher... (min 2 car.)"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="input w-full focus-visible-enhanced"
                    aria-label="Rechercher des produits"
                  />
                  {searchInput && searchInput.trim().length === 1 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-600 bg-white px-1">
                      Min 2
                    </div>
                  )}
                </div>
                <button 
                  type="submit" 
                  className="btn-primary px-4 focus-visible-enhanced"
                  aria-label="Lancer la recherche"
                  disabled={searchInput.trim().length === 1}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
              
              <label htmlFor="sort-select" className="sr-only">Trier les produits</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={handleSortChange}
                className="input w-auto focus-visible-enhanced"
                aria-label="Trier les produits"
              >
                <option value="newest">Plus récents</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="featured">En vedette</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-4" role="status" aria-live="polite">
              <span className="text-sm text-neutral-600">Filtres actifs:</span>
              {filters.category && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                  {getCategoryLabel(filters.category)}
                  <button
                    onClick={() => handleCategoryChange('all')}
                    className="hover:text-primary-900 focus-visible-enhanced rounded"
                    aria-label={`Retirer le filtre ${getCategoryLabel(filters.category)}`}
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.search && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                  "{filters.search}"
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setFilters(prev => ({ ...prev, search: undefined }));
                    }}
                    className="hover:text-primary-900 focus-visible-enhanced rounded"
                    aria-label="Retirer le filtre de recherche"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium focus-visible-enhanced rounded px-2 py-1"
                aria-label="Effacer tous les filtres"
              >
                Effacer tout
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Products Grid */}
      <section className="section" aria-label="Liste des produits">
        <div className="container">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 mb-1">Erreur de chargement</h3>
                  <p className="text-sm text-red-700">{error}</p>
                  <p className="text-sm text-red-600 mt-2">
                    Vérifiez que le backend est démarré sur <code className="bg-red-100 px-1 rounded">http://localhost:5000</code>
                  </p>
                  <button
                    onClick={() => fetchProducts()}
                    className="mt-3 text-sm text-red-700 font-medium hover:text-red-800 underline"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Results Count */}
          <div className="mb-6">
            <p className="text-neutral-600" role="status" aria-live="polite" aria-atomic="true">
              {loading ? (
                <span className="inline-block w-32 h-5 bg-neutral-200 animate-pulse rounded" />
              ) : (
                <>
                  <span className="font-semibold text-neutral-900">{total}</span> produit{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}
                </>
              )}
            </p>
          </div>

          {/* Product Grid */}
          {loading ? (
            <SkeletonGrid count={12} type="product" columns={3} />
          ) : (
            <ProductGrid products={products} loading={false} />
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="section bg-primary-50">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-neutral-800 mb-4">
            Vous ne trouvez pas ce que vous cherchez ?
          </h2>
          <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
            Nous créons également des pièces sur mesure selon vos spécifications exactes. 
            Contactez-nous pour discuter de votre projet personnalisé.
          </p>
          <a 
            href="/contact" 
            className="btn-primary focus-visible-enhanced"
            aria-label="Aller à la page de contact pour demander un devis sur mesure"
          >
            Demander un Devis Sur Mesure
          </a>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}