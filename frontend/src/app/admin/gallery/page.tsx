'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useAuth } from '@/hooks/useAuth';
import { galleryService } from '@/lib/api';
import SortableGalleryItem from '@/components/admin/SortableGalleryItem';
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal';
import { DeleteConfirmModalItem } from '@/components/admin/DeleteConfirmModalItem';
import GalleryBulkActions from '@/components/admin/GalleryBulkActions';
import type { GalleryImage } from '@/types';

export default function GalleryListPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // State management
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalImages, setTotalImages] = useState(0);
  const itemsPerPage = 24;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');

  // Bulk selection
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Drag and drop state
  const [savingOrder, setSavingOrder] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Cleanup state
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevents accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch images
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchImages = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: Record<string, string> = {
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        };

        if (searchQuery) params.search = searchQuery;
        if (categoryFilter) params.category = categoryFilter;
        if (featuredFilter) params.featured = featuredFilter;

        const response = await galleryService.getImages(params);

        if (response.success && response.data) {
          setImages(response.data as GalleryImage[]);

          if ('pagination' in response && response.pagination) {
            const pagination = response.pagination as any;
            setTotalPages(pagination.pages || 1);
            setTotalImages(pagination.total || 0);
          }
        }
      } catch (err) {
        console.error('Error fetching images:', err);
        setError('Erreur lors du chargement des images');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [isAuthenticated, currentPage, searchQuery, categoryFilter, featuredFilter]);

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map((img) => img._id!)));
    }
  };

  const handleSelectImage = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  useEffect(() => {
    setShowBulkActions(selectedImages.size > 0);
  }, [selectedImages]);

  // Handle bulk operations success
  const handleBulkComplete = () => {
    setSelectedImages(new Set());
    setCurrentPage(1);
  };

  // Handle delete (use modal)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; imageId: string | null; isDeleting: boolean; image?: GalleryImage | null }>({ isOpen: false, imageId: null, isDeleting: false, image: null });

  const handleDelete = (imageId: string) => {
    const image = images.find((img) => img._id === imageId) || null;
    setDeleteModal({ isOpen: true, imageId, isDeleting: false, image });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.imageId) return;
    setDeleteModal((s) => ({ ...s, isDeleting: true }));
    try {
      const response = await galleryService.deleteImage(deleteModal.imageId);
      if (response && response.success) {
        // remove from UI
        setImages((prev) => prev.filter((img) => img._id !== deleteModal.imageId));
        setTotalImages((t) => Math.max(0, t - 1));
      } else {
        throw new Error(response?.message || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('Erreur lors de la suppression');
    } finally {
      setDeleteModal({ isOpen: false, imageId: null, isDeleting: false, image: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, imageId: null, isDeleting: false, image: null });
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setIsDragging(false);

    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img._id === active.id);
    const newIndex = images.findIndex((img) => img._id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistically update UI
    const newImages = arrayMove(images, oldIndex, newIndex);
    setImages(newImages);

    // Save to backend
    try {
      setSavingOrder(true);
      const imageOrders = newImages.map((img, index) => ({
        id: img._id!,
        sortOrder: index,
      }));

      await galleryService.updateSortOrder(imageOrders);
    } catch (err) {
      console.error('Error saving order:', err);
      // Revert on error
      setImages(images);
      alert('Erreur lors de la sauvegarde de l\'ordre');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setIsDragging(false);
  };

  // Cleanup orphaned images handler
  const handleCleanupOrphaned = async () => {
    try {
      setIsCleaningUp(true);
      setShowCleanupConfirm(false);

      const response = await galleryService.cleanupOrphanedImages();

      if (response.success && response.data) {
        const { deletedCount, cloudinaryDeletedCount } = response.data;
        
        // Show success message
        alert(`✅ Nettoyage terminé!\n\n${deletedCount} image(s) orpheline(s) supprimée(s)\n${cloudinaryDeletedCount} fichier(s) Cloudinary supprimé(s)`);
        
        // Refresh the gallery
        setCurrentPage(1);
        const params: Record<string, string> = {
          page: '1',
          limit: itemsPerPage.toString(),
        };
        const refreshResponse = await galleryService.getImages(params);
        if (refreshResponse.success && refreshResponse.data) {
          setImages(refreshResponse.data);
          setTotalPages(refreshResponse.pagination?.pages || 1);
          setTotalImages(refreshResponse.pagination?.total || 0);
        }
      }
    } catch (error) {
      console.error('Error cleaning up orphaned images:', error);
      alert('❌ Erreur lors du nettoyage des images orphelines');
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Get active image for drag overlay
  const activeImage = activeId ? images.find((img) => img._id === activeId) : null;

  // Loading state
  if (authLoading || (loading && images.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Delete Confirmation Modal for gallery images */}
      <DeleteConfirmModalItem
        isOpen={deleteModal.isOpen}
        image={deleteModal.image}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={deleteModal.isDeleting}
      />
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl font-bold text-neutral-900">
                Gestion de la galerie
              </h1>
              <p className="mt-2 text-neutral-600">
                {totalImages} image{totalImages > 1 ? 's' : ''} au total
                {savingOrder && (
                  <span className="ml-2 text-amber-600">
                    • Enregistrement en cours...
                  </span>
                )}
              </p>
            </motion.div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCleanupConfirm(true)}
                disabled={isCleaningUp}
                className="inline-flex items-center px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Supprimer les images qui n'appartiennent à aucun produit"
              >
                {isCleaningUp ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Nettoyage...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Nettoyer
                  </>
                )}
              </button>

              <Link
                href="/admin/gallery/upload"
                className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
              >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Télécharger des images
            </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Cleanup Confirmation Modal */}
      {showCleanupConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  Nettoyer les images orphelines
                </h3>
              </div>
            </div>

            <p className="text-neutral-600 mb-6">
              Cette action va supprimer toutes les images de la galerie qui n'appartiennent à aucun produit existant. 
              Les fichiers seront également supprimés de Cloudinary. Cette action est irréversible.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCleanupConfirm(false)}
                className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCleanupOrphaned}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Nettoyer maintenant
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Rechercher
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Titre, description, tags..."
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Catégorie
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Toutes</option>
                <option value="realisations">Réalisations</option>
                <option value="atelier">Atelier</option>
                <option value="materiaux">Matériaux</option>
                <option value="inspiration">Inspiration</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            {/* Featured Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                En vedette
              </label>
              <select
                value={featuredFilter}
                onChange={(e) => {
                  setFeaturedFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Toutes</option>
                <option value="true">En vedette uniquement</option>
                <option value="false">Non en vedette</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(searchQuery || categoryFilter || featuredFilter) && (
              <div className="md:col-span-3">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('');
                    setFeaturedFilter('');
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag-and-Drop Info Banner */}
      {images.length > 0 && !searchQuery && !categoryFilter && !featuredFilter && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-amber-800">
                <strong>Réorganiser les images :</strong> Glissez-déposez les images
                pour modifier leur ordre d'affichage. Les modifications sont
                enregistrées automatiquement.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {showBulkActions && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
            <GalleryBulkActions
              selectedImageIds={Array.from(selectedImages)}
              onComplete={handleBulkComplete}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Select All Checkbox */}
      {images.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selectedImages.size === images.length && images.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 text-amber-600 border-neutral-300 rounded focus:ring-amber-500"
            />
            <span className="ml-2 text-sm text-neutral-700 font-medium">
              Tout sélectionner
            </span>
          </label>
        </div>
      )}

      {/* Images Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-neutral-600">Chargement des images...</p>
          </div>
        ) : images.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-12 text-center"
          >
            <svg
              className="w-20 h-20 text-neutral-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">
              Aucune image trouvée
            </h3>
            <p className="text-neutral-600 mb-6">
              {searchQuery || categoryFilter || featuredFilter
                ? 'Essayez de modifier vos filtres'
                : 'Commencez par télécharger vos premières images'}
            </p>
            {!searchQuery && !categoryFilter && !featuredFilter && (
              <Link
                href="/admin/gallery/upload"
                className="inline-flex items-center px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Télécharger des images
              </Link>
            )}
          </motion.div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={images.map((img) => img._id!)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {images.map((image, index) => (
                  <SortableGalleryItem
                    key={image._id}
                    image={image}
                    index={index}
                    isSelected={selectedImages.has(image._id!)}
                    onSelect={handleSelectImage}
                    onDelete={handleDelete}
                    isDragging={isDragging}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeImage ? (
                <div className="bg-white rounded-lg shadow-2xl border-2 border-amber-500 overflow-hidden opacity-90 transform rotate-3 scale-105">
                  <div className="relative aspect-square w-64 bg-neutral-100">
                    <img
                      src={activeImage.thumbnailUrl || activeImage.url}
                      alt={activeImage.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-neutral-700">
              Page {currentPage} sur {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Précédent
              </button>

              {/* Page numbers */}
              <div className="hidden sm:flex items-center space-x-1">
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
                className="px-3 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
