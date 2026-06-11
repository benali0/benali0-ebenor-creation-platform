'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { productsService, categoryService } from '@/lib/api';
import { LoadingSpinner, SkeletonTable } from '@/components/ui';
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal';
import { toast } from '@/lib/toast';
import { triggerDashboardRefresh } from '@/lib/dashboardRefresh';
import type { Product } from '@/types';
import './products-admin.css';

interface Category {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

type ViewMode = 'grid' | 'list';

export default function ProductsListPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    product: Product | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    product: null,
    isDeleting: false,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 12;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');

  // Fix hydration by only rendering on client
  useEffect(() => {
    setMounted(true);

    // Check for success parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const successParam = urlParams.get('success');
    const productName = urlParams.get('name') || 'Produit';

    if (successParam === 'created') {
      const primaryImage = products.find(p => p.name === productName)?.images?.find(img => img.isPrimary);
      toast.productCreated({
        name: productName,
        imageUrl: primaryImage?.url,
      });
      window.history.replaceState({}, '', '/admin/products');
    } else if (successParam === 'updated') {
      const primaryImage = products.find(p => p.name === productName)?.images?.find(img => img.isPrimary);
      toast.productUpdated({
        name: productName,
        imageUrl: primaryImage?.url,
      });
      window.history.replaceState({}, '', '/admin/products');
    }
  }, [products]);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch categories
  useEffect(() => {
    if (!isAuthenticated || !mounted) return;

    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await categoryService.getAll({ isActive: 'true', limit: 100 });
        if (response.success && response.data) {
          setCategories(response.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [isAuthenticated, mounted]);

  // Fetch products
  useEffect(() => {
    if (!isAuthenticated || !mounted) return;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: Record<string, string> = {
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          _t: Date.now().toString(),
        };

        const trimmedSearch = searchQuery.trim();
        if (trimmedSearch.length >= 2) {
          params.search = trimmedSearch;
        }

        if (categoryFilter) params.category = categoryFilter;
        if (availabilityFilter) params.availability = availabilityFilter;
        if (featuredFilter) params.featured = featuredFilter;

        const response = await productsService.getAll(params);

        if (response.success && response.data) {
          setProducts(response.data as Product[]);

          if ('pagination' in response && response.pagination) {
            const pagination = response.pagination as any;
            setTotalPages(pagination.pages || 1);
            setTotalProducts(pagination.total || 0);
          }
        }
      } catch (err) {
        setError('Erreur lors du chargement des produits');
      } finally {
        setLoading(false);
      }
    };

    const trimmedSearch = searchQuery.trim();
    if (trimmedSearch.length === 0 || trimmedSearch.length >= 2) {
      const timeoutId = setTimeout(() => {
        fetchProducts();
      }, 400);

      return () => clearTimeout(timeoutId);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, mounted, currentPage, searchQuery, categoryFilter, availabilityFilter, featuredFilter, refreshTrigger]);

  // Format price
  const formatPrice = (price?: { amount: number; currency: string; unit?: string }) => {
    if (!price) return 'Prix sur demande';
    return `${price.amount.toLocaleString()} ${price.currency}${price.unit ? `/${price.unit}` : ''}`;
  };

  // Get availability badge
  const getAvailabilityBadge = (availability: string) => {
    const badges = {
      in_stock: { label: 'En stock', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '✓' },
      made_to_order: { label: 'Sur commande', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '⏱' },
      out_of_stock: { label: 'Rupture', color: 'bg-red-100 text-red-800 border-red-200', icon: '✕' },
    };
    return badges[availability as keyof typeof badges] || badges.made_to_order;
  };

  // Handle delete product
  const handleDeleteClick = (product: Product) => {
    setDeleteModal({
      isOpen: true,
      product,
      isDeleting: false,
    });
  };

  const handleDeleteConfirm = async () => {
    const { product } = deleteModal;
    if (!product) return;

    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      const response = await productsService.delete(product._id!);

      if (response.success) {
        setProducts(products.filter(p => p._id !== product._id));
        setTotalProducts(prev => prev - 1);
        setDeleteModal({ isOpen: false, product: null, isDeleting: false });

        toast.productDeleted({
          name: product.name,
          imageUrl: product.images?.find(img => img.isPrimary)?.url || product.images?.[0]?.url,
        });

        triggerDashboardRefresh();
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(response.message || 'Erreur lors de la suppression');
      }
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast.error(err.message || 'Erreur lors de la suppression du produit');
      setDeleteModal({ isOpen: false, product: null, isDeleting: false });
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, product: null, isDeleting: false });
  };

  // Loading state
  if (authLoading || !mounted || (loading && products.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-amber-50/30">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-neutral-600 font-medium">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-amber-50/30">
      {/* Sonner Toast Container */}
      <Toaster position="top-right" richColors closeButton />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        product={deleteModal.product}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={deleteModal.isDeleting}
      />

      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute w-96 h-96 -top-48 -left-48 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex-1"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                    Gestion des Produits
                  </h1>
                  <p className="text-amber-100 mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm">
                      {totalProducts}
                    </span>
                    produit{totalProducts > 1 ? 's' : ''} au total
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              {/* View Toggle */}
              <div className="inline-flex bg-white/20 backdrop-blur-sm rounded-xl p-1 shadow-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                    viewMode === 'grid'
                      ? 'bg-white text-amber-600 shadow-md'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM13 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                    viewMode === 'list'
                      ? 'bg-white text-amber-600 shadow-md'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <Link
                href="/admin/products/new"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-amber-600 rounded-xl hover:bg-amber-50 transition-all shadow-2xl hover:shadow-xl hover:scale-105 font-semibold gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Créer un produit
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Search & Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200/50 overflow-hidden">
          {/* Search Bar */}
          <div className="p-6 bg-gradient-to-r from-neutral-50 to-white">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className={`w-6 h-6 transition-colors duration-300 ${
                    searchQuery ? 'text-amber-600' : 'text-neutral-400'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Rechercher un produit par nom..."
                className="w-full pl-14 pr-14 py-4 text-base border-2 border-neutral-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all duration-200 placeholder:text-neutral-400"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-red-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-t border-neutral-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Catégorie
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  disabled={loadingCategories}
                  className={`w-full px-4 py-2.5 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all ${
                    categoryFilter ? 'border-amber-300 bg-amber-50' : ''
                  }`}
                >
                  <option value="">Toutes</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Filter */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Disponibilité
                </label>
                <select
                  value={availabilityFilter}
                  onChange={(e) => {
                    setAvailabilityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-4 py-2.5 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all ${
                    availabilityFilter ? 'border-emerald-300 bg-emerald-50' : ''
                  }`}
                >
                  <option value="">Toutes</option>
                  <option value="in_stock">En stock</option>
                  <option value="made_to_order">Sur commande</option>
                  <option value="out_of_stock">Rupture</option>
                </select>
              </div>

              {/* Featured Filter */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  En vedette
                </label>
                <select
                  value={featuredFilter}
                  onChange={(e) => {
                    setFeaturedFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-4 py-2.5 border-2 border-neutral-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all ${
                    featuredFilter ? 'border-yellow-300 bg-yellow-50' : ''
                  }`}
                >
                  <option value="">Tous</option>
                  <option value="true">En vedette</option>
                  <option value="false">Non en vedette</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                {(searchQuery || categoryFilter || availabilityFilter || featuredFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('');
                      setAvailabilityFilter('');
                      setFeaturedFilter('');
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Display */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                <div className="w-full h-48 bg-neutral-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-neutral-200 rounded mb-2"></div>
                <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-2">
              Aucun produit trouvé
            </h3>
            <p className="text-neutral-600 mb-6">
              {searchQuery || categoryFilter || availabilityFilter || featuredFilter
                ? 'Essayez de modifier vos filtres ou votre recherche'
                : 'Commencez par créer votre premier produit'}
            </p>
            {!searchQuery && !categoryFilter && !availabilityFilter && !featuredFilter && (
              <Link
                href="/admin/products/new"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl font-semibold gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Créer votre premier produit
              </Link>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {products.map((product, index) => {
                  const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];
                  const badge = getAvailabilityBadge(product.availability);

                  return (
                    <motion.div
                      key={product._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-neutral-100"
                    >
                      {/* Featured Badge */}
                      {product.featured && (
                        <div className="absolute top-4 left-4 z-10">
                          <div className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Vedette
                          </div>
                        </div>
                      )}

                      {/* Product Image */}
                      <Link href={`/admin/products/${product._id}/edit`} className="block relative h-56 overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200">
                        {primaryImage ? (
                          <Image
                            src={primaryImage.url}
                            alt={primaryImage.alt}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-16 h-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {/* Image Count Badge */}
                        {product.images && product.images.length > 1 && (
                          <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold rounded-lg">
                            +{product.images.length - 1}
                          </div>
                        )}
                      </Link>

                      {/* Product Info */}
                      <div className="p-5">
                        <Link href={`/admin/products/${product._id}/edit`}>
                          <h3 className="text-lg font-bold text-neutral-900 mb-2 group-hover:text-amber-600 transition-colors line-clamp-1">
                            {product.name}
                          </h3>
                        </Link>
                        
                        <p className="text-sm text-neutral-600 mb-3 line-clamp-2 min-h-[2.5rem]">
                          {product.shortDescription}
                        </p>

                        {/* Category & Price */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="inline-flex items-center px-2.5 py-1 bg-neutral-100 text-neutral-700 text-xs font-semibold rounded-lg">
                            {product.category}
                          </span>
                          <span className="text-lg font-bold text-amber-600">
                            {formatPrice(product.price)}
                          </span>
                        </div>

                        {/* Availability Badge */}
                        <div className="mb-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${badge.color}`}>
                            <span>{badge.icon}</span>
                            {badge.label}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-4 border-t border-neutral-100">
                          <Link
                            href={`/admin/products/${product._id}/edit`}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all font-semibold"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Modifier
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(product)}
                            className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {products.map((product, index) => {
                  const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];
                  const badge = getAvailabilityBadge(product.availability);

                  return (
                    <motion.div
                      key={product._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-neutral-100"
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Image */}
                        <Link href={`/admin/products/${product._id}/edit`} className="relative md:w-64 h-48 md:h-auto overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200 flex-shrink-0">
                          {primaryImage ? (
                            <Image
                              src={primaryImage.url}
                              alt={primaryImage.alt}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-16 h-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          {product.images && product.images.length > 1 && (
                            <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold rounded-lg">
                              +{product.images.length - 1}
                            </div>
                          )}
                        </Link>

                        {/* Content */}
                        <div className="flex-1 p-6">
                          <div className="flex flex-col h-full">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Link href={`/admin/products/${product._id}/edit`}>
                                    <h3 className="text-xl font-bold text-neutral-900 group-hover:text-amber-600 transition-colors">
                                      {product.name}
                                    </h3>
                                  </Link>
                                  {product.featured && (
                                    <svg className="w-6 h-6 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  )}
                                </div>
                                <p className="text-neutral-600 line-clamp-2 mb-3">
                                  {product.shortDescription}
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <span className="text-2xl font-bold text-amber-600">
                                  {formatPrice(product.price)}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 mt-auto">
                              <span className="inline-flex items-center px-3 py-1.5 bg-neutral-100 text-neutral-700 text-sm font-semibold rounded-lg">
                                {product.category}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border ${badge.color}`}>
                                <span>{badge.icon}</span>
                                {badge.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex md:flex-col gap-2 p-4 md:p-6 bg-neutral-50 border-t md:border-t-0 md:border-l border-neutral-100">
                          <Link
                            href={`/admin/products/${product._id}/edit`}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all font-semibold shadow-md hover:shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="hidden md:inline">Modifier</span>
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(product)}
                            className="px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all shadow-md hover:shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center">
            <nav className="inline-flex items-center gap-2 bg-white rounded-xl shadow-lg p-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-neutral-700 rounded-lg hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        currentPage === page
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                          : 'text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2 text-neutral-400">...</span>;
                }
                return null;
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-neutral-700 rounded-lg hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
