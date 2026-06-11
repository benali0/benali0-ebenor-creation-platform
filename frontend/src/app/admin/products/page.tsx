'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/lib/toast';
import { productsService, categoryService } from '@/lib/api';
import { triggerDashboardRefresh } from '@/lib/dashboardRefresh';
import type { Product } from '@/types';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  StarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Category {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export default function ProductsListPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 10;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Check for success parameters in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const successParam = urlParams.get('success');
    const productName = urlParams.get('name') || 'Produit';

    if (successParam === 'updated') {
      toast.success(`${productName} a été mis à jour avec succès`);
      // Clean URL
      window.history.replaceState({}, '', '/admin/products');
    } else if (successParam === 'true') {
      toast.success(`${productName} a été créé avec succès`);
      // Clean URL
      window.history.replaceState({}, '', '/admin/products');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
    }
    // Also listen for URL refresh parameter
    const urlParams = new URLSearchParams(window.location.search);
    const refreshParam = urlParams.get('refresh');
    // refreshParam is included to trigger refetch when URL changes
  }, [isAuthenticated, currentPage, searchQuery, categoryFilter, availabilityFilter, featuredFilter]);

  const fetchCategories = async () => {
    try {
      const response = await categoryService.getAll({ isActive: 'true', limit: 100 });
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);

      const params: Record<string, string> = {
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        _t: Date.now().toString(), // Cache buster
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
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;

    try {
      setActionLoading(true);
      const response = await productsService.delete(deletingProduct._id!);

      if (response.success) {
        toast.success('Produit supprimé avec succès');
        fetchProducts();
        triggerDashboardRefresh();
        setShowDeleteModal(false);
        setDeletingProduct(null);
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (price?: { amount: number; currency: string; unit?: string }) => {
    if (!price) return 'Prix sur demande';
    return `${price.amount.toLocaleString()} ${price.currency}${price.unit ? `/${price.unit}` : ''}`;
  };

  const getAvailabilityBadge = (availability: string) => {
    const badges = {
      in_stock: { label: 'En stock', color: 'bg-green-100 text-green-800' },
      made_to_order: { label: 'Sur commande', color: 'bg-blue-100 text-blue-800' },
      out_of_stock: { label: 'Rupture', color: 'bg-red-100 text-red-800' },
    };
    return badges[availability as keyof typeof badges] || badges.made_to_order;
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-3">
                <CubeIcon className="h-8 w-8 text-amber-600" />
                Gestion des Produits
              </h1>
              <p className="mt-2 text-neutral-600">
                Gérez votre catalogue de produits
              </p>
            </div>
            <Link
              href="/admin/products/new"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <PlusIcon className="h-5 w-5" />
              Nouveau Produit
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Total Produits</p>
                <p className="text-3xl font-bold text-neutral-900">{totalProducts}</p>
              </div>
              <CubeIcon className="h-12 w-12 text-amber-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">En Stock</p>
                <p className="text-3xl font-bold text-neutral-900">
                  {products.filter((p) => p.availability === 'in_stock').length}
                </p>
              </div>
              <CheckCircleIcon className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">En Vedette</p>
                <p className="text-3xl font-bold text-neutral-900">
                  {products.filter((p) => p.featured).length}
                </p>
              </div>
              <StarIcon className="h-12 w-12 text-yellow-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher un produit..."
              className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Toutes catégories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={availabilityFilter}
                onChange={(e) => {
                  setAvailabilityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Toute disponibilité</option>
                <option value="in_stock">En stock</option>
                <option value="made_to_order">Sur commande</option>
                <option value="out_of_stock">Rupture</option>
              </select>
            </div>

            <div>
              <select
                value={featuredFilter}
                onChange={(e) => {
                  setFeaturedFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Tous</option>
                <option value="true">En vedette</option>
                <option value="false">Non en vedette</option>
              </select>
            </div>

            <div className="flex items-center">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('');
                  setAvailabilityFilter('');
                  setFeaturedFilter('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <CubeIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Aucun produit</h3>
            <p className="text-neutral-600 mb-6">
              {searchQuery || categoryFilter || availabilityFilter || featuredFilter
                ? 'Aucun produit ne correspond à vos critères'
                : 'Commencez par créer votre premier produit'}
            </p>
            {!searchQuery && !categoryFilter && !availabilityFilter && !featuredFilter && (
              <Link
                href="/admin/products/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Créer un produit
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Prix
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Disponibilité
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Vedette
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {products.map((product) => {
                    const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
                    const badge = getAvailabilityBadge(product.availability);

                    return (
                      <tr key={product._id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-neutral-100">
                            {primaryImage ? (
                              <Image
                                src={primaryImage.url}
                                alt={primaryImage.alt}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <CubeIcon className="h-8 w-8 text-neutral-400" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-neutral-900">{product.name}</div>
                            <div className="text-xs text-neutral-500 truncate max-w-xs">
                              {product.shortDescription}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                            {categories.find(cat => cat.slug === product.category)?.name || product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-amber-600">
                            {formatPrice(product.price)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {product.featured ? (
                            <StarIcon className="h-5 w-5 text-yellow-500 mx-auto fill-current" />
                          ) : (
                            <span className="text-neutral-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/products/${product._id}/edit`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </Link>
                            <button
                              onClick={() => {
                                setDeletingProduct(product);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-neutral-700">
                    Page {currentPage} sur {totalPages} • {totalProducts} produit{totalProducts > 1 ? 's' : ''} au total
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Précédent
                    </button>

                    {/* Page numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === pageNum
                                ? 'bg-amber-600 text-white'
                                : 'text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Suivant →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && deletingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrashIcon className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-neutral-900">Confirmer la suppression</h3>
            </div>
            <p className="text-neutral-600 mb-6">
              Êtes-vous sûr de vouloir supprimer le produit <strong>{deletingProduct.name}</strong> ?
              Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingProduct(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Suppression...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-5 w-5" />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
