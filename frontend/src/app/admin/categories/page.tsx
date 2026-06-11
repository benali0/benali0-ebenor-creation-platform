'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { categoryService } from '@/lib/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);
  const itemsPerPage = 10;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#f59e0b',
    isActive: true,
    displayOrder: 0,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [isAuthenticated, currentPage, searchQuery]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await categoryService.getAll(Object.fromEntries(params));
      if (response.success && response.data) {
        setCategories(response.data);
        
        // Update pagination info
        if ('pagination' in response && response.pagination) {
          const pagination = response.pagination as any;
          setTotalPages(pagination.pages || 1);
          setTotalCategories(pagination.total || 0);
        }
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    try {
      setActionLoading(true);
      const response = await categoryService.initialize();
      if (response.success) {
        toast.success(response.message || 'Catégories initialisées avec succès');
        setCurrentPage(1); // Reset to first page
        fetchCategories();
      }
    } catch (error: any) {
      console.error('Error initializing categories:', error);
      toast.error('Erreur lors de l\'initialisation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        color: category.color,
        isActive: category.isActive,
        displayOrder: category.displayOrder,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        color: '#f59e0b',
        isActive: true,
        displayOrder: 0,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      icon: '',
      color: '#f59e0b',
      isActive: true,
      displayOrder: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Le nom de la catégorie est requis');
      return;
    }

    try {
      setActionLoading(true);

      if (editingCategory) {
        const response = await categoryService.update(editingCategory._id, formData);
        if (response.success) {
          toast.success('Catégorie mise à jour avec succès');
          fetchCategories();
          handleCloseModal();
        }
      } else {
        const response = await categoryService.create(formData);
        if (response.success) {
          toast.success('Catégorie créée avec succès');
          fetchCategories();
          handleCloseModal();
        }
      }
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    try {
      setActionLoading(true);
      const response = await categoryService.delete(deletingCategory._id);
      if (response.success) {
        toast.success('Catégorie supprimée avec succès');
        fetchCategories();
        setShowDeleteModal(false);
        setDeletingCategory(null);
      }
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCategories = categories;

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
                <SwatchIcon className="h-8 w-8 text-amber-600" />
                Gestion des Catégories
              </h1>
              <p className="mt-2 text-neutral-600">
                Organisez vos produits par catégories personnalisées
              </p>
            </div>
            <div className="flex gap-3">
              {categories.length === 0 && (
                <button
                  onClick={handleInitialize}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <SparklesIcon className="h-5 w-5" />
                  Initialiser
                </button>
              )}
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <PlusIcon className="h-5 w-5" />
                Nouvelle Catégorie
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Total</p>
                <p className="text-3xl font-bold text-neutral-900">{totalCategories}</p>
              </div>
              <SwatchIcon className="h-12 w-12 text-amber-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Actives</p>
                <p className="text-3xl font-bold text-neutral-900">
                  {categories.filter((c) => c.isActive).length}
                </p>
              </div>
              <CheckCircleIcon className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Inactives</p>
                <p className="text-3xl font-bold text-neutral-900">
                  {categories.filter((c) => !c.isActive).length}
                </p>
              </div>
              <XCircleIcon className="h-12 w-12 text-red-600 opacity-20" />
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
                setCurrentPage(1); // Reset to first page on search
              }}
              placeholder="Rechercher une catégorie..."
              className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>
        </div>

        {/* Categories Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <SwatchIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Aucune catégorie
            </h3>
            <p className="text-neutral-600 mb-6">
              Commencez par créer votre première catégorie
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors inline-flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Créer une catégorie
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Couleur
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Ordre
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {filteredCategories.map((category) => (
                  <tr key={category._id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-neutral-900">
                              {category.name}
                            </div>
                            <div className="text-xs text-neutral-500">{category.slug}</div>
                          </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-neutral-600 max-w-xs truncate">
                        {category.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg shadow-sm border border-neutral-200"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="text-xs text-neutral-600 font-mono">
                          {category.color}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-neutral-900 font-medium">
                        {category.displayOrder}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {category.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-4 w-4" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircleIcon className="h-4 w-4" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(category)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingCategory(category);
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
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-neutral-700">
                    Page {currentPage} sur {totalPages} • {totalCategories} catégorie{totalCategories > 1 ? 's' : ''} au total
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-neutral-900 mb-6">
              {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Icon field removed as requested */}

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Couleur
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-20 rounded-lg border border-neutral-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Ordre d'affichage
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-neutral-700">Catégorie active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={actionLoading}
                  className="px-6 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      {editingCategory ? 'Mettre à jour' : 'Créer'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deletingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrashIcon className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-neutral-900">Confirmer la suppression</h3>
            </div>
            <p className="text-neutral-600 mb-6">
              Êtes-vous sûr de vouloir supprimer la catégorie <strong>{deletingCategory.name}</strong> ?
              Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingCategory(null);
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
