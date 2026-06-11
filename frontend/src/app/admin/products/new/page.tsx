'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProductForm, useProductTags, useProductMaterials, useProductFinishes } from '@/hooks/useProductForm';
import { productsService, galleryService, categoryService } from '@/lib/api';
import { Breadcrumb, ProductImageManager, ProductVideoManager } from '@/components/admin';
import type { ProductImage, ProductVideo } from '@/components/admin';
import type { ProductFormData } from '@/lib/validations/product';
import { LoadingSpinner, LoadingButton } from '@/components/ui';

interface Category {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export default function NewProductPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Initialize form
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    generateSlugFromName,
    generateSeoFromContent,
  } = useProductForm({
    onSubmit: async (data: ProductFormData) => {
      // This will be handled by our custom submit handler
    },
  });

  // Initialize helper hooks for dynamic arrays
  const { tags, addTag, removeTag } = useProductTags({ watch, setValue, formState: { errors } } as any);
  const { materials, addMaterial, removeMaterial } = useProductMaterials({ watch, setValue, formState: { errors } } as any);
  const { finishes, addFinish, removeFinish } = useProductFinishes({ watch, setValue, formState: { errors } } as any);

  // State for dynamic inputs
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [materialInput, setMaterialInput] = useState('');
  const [finishInput, setFinishInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [specError, setSpecError] = useState('');
  const [materialError, setMaterialError] = useState('');
  const [finishError, setFinishError] = useState('');
  const [tagError, setTagError] = useState('');
  
  // State for images
  const [images, setImages] = useState<ProductImage[]>([]);
  
  // State for video
  const [video, setVideo] = useState<ProductVideo | null>(null);

  // Watch name field for character count
  const nameValue = watch('name') || '';
  const slugValue = watch('slug') || '';
  const shortDescriptionValue = watch('shortDescription') || '';
  const descriptionValue = watch('description') || '';
  const specifications = watch('specifications') || {};
  const seoTitleValue = watch('seoTitle') || '';
  const seoDescriptionValue = watch('seoDescription') || '';
  const availabilityValue = watch('availability') || 'made_to_order';

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch categories
  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [isAuthenticated]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await categoryService.getAll({ limit: 100 });
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Handler functions for dynamic arrays
  const handleAddSpecification = () => {
    setSpecError('');
    
    if (!specKey.trim() || !specValue.trim()) {
      setSpecError('La clé et la valeur sont requises');
      return;
    }
    
    if (specKey.length > 100) {
      setSpecError('La clé ne peut pas dépasser 100 caractères');
      return;
    }
    
    if (specValue.length > 100) {
      setSpecError('La valeur ne peut pas dépasser 100 caractères');
      return;
    }
    
    if (specifications[specKey]) {
      setSpecError('Cette clé existe déjà');
      return;
    }
    
    setValue('specifications', { ...specifications, [specKey]: specValue }, { shouldValidate: true });
    setSpecKey('');
    setSpecValue('');
  };

  const handleRemoveSpecification = (key: string) => {
    const newSpecs = { ...specifications };
    delete newSpecs[key];
    setValue('specifications', newSpecs, { shouldValidate: true });
  };

  const handleAddMaterial = () => {
    setMaterialError('');
    
    if (!materialInput.trim()) {
      setMaterialError('Le nom du matériau est requis');
      return;
    }
    
    if (materialInput.length > 100) {
      setMaterialError('Le nom ne peut pas dépasser 100 caractères');
      return;
    }
    
    if (materials.includes(materialInput.trim())) {
      setMaterialError('Ce matériau existe déjà');
      return;
    }
    
    addMaterial(materialInput);
    setMaterialInput('');
  };

  const handleAddFinish = () => {
    setFinishError('');
    
    if (!finishInput.trim()) {
      setFinishError('Le nom de la finition est requis');
      return;
    }
    
    if (finishInput.length > 100) {
      setFinishError('Le nom ne peut pas dépasser 100 caractères');
      return;
    }
    
    if (finishes.includes(finishInput.trim())) {
      setFinishError('Cette finition existe déjà');
      return;
    }
    
    addFinish(finishInput);
    setFinishInput('');
  };

  const handleAddTag = () => {
    setTagError('');
    
    if (!tagInput.trim()) {
      setTagError('Le tag est requis');
      return;
    }
    
    if (tagInput.length > 50) {
      setTagError('Le tag ne peut pas dépasser 50 caractères');
      return;
    }
    
    const normalizedTag = tagInput.toLowerCase().trim();
    
    if (tags.includes(normalizedTag)) {
      setTagError('Ce tag existe déjà');
      return;
    }
    
    addTag(tagInput);
    setTagInput('');
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // STEP 1: Upload all images that haven't been uploaded yet
      const uploadedImages = [];
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // Only process images that need uploading (have file property)
        if (image.file) {
          try {
            const formData = new FormData();
            formData.append('image', image.file);
            formData.append('title', image.alt || image.file.name.replace(/\.[^/.]+$/, ''));
            formData.append('alt', image.alt || image.file.name.replace(/\.[^/.]+$/, ''));
            formData.append('category', 'product');
            
            const uploadResponse = await galleryService.uploadImage(formData);
            
            if (uploadResponse.success && uploadResponse.data) {
              uploadedImages.push({
                url: uploadResponse.data.url,
                alt: image.alt || uploadResponse.data.alt,
                isPrimary: image.isPrimary,
              });
            } else {
              throw new Error(`Échec du téléchargement de l'image ${i + 1}`);
            }
          } catch (uploadError: any) {
            throw new Error(`Erreur lors du téléchargement de l'image ${i + 1}: ${uploadError.message || 'Erreur inconnue'}`);
          }
        } else if (image.url) {
          // Image already has URL (already uploaded)
          uploadedImages.push({
            url: image.url,
            alt: image.alt || '',
            isPrimary: image.isPrimary,
          });
        }
        // Skip images without file AND without url
      }
      
      // STEP 2: Prepare payload - ONLY include valid data
      const payload: any = {
        name: data.name.trim(),
        category: data.category,
        shortDescription: data.shortDescription.trim(),
        description: data.description.trim(),
        availability: data.availability || 'made_to_order',
        featured: data.featured || false,
      };
      
      // Add optional fields ONLY if they have valid values
      if (data.slug?.trim()) {
        payload.slug = data.slug.trim();
      }
      
      // Subcategory removed from form; not included in payload
      
      // CRITICAL: Only add images if we have valid uploaded images with URLs
      if (uploadedImages.length > 0) {
        payload.images = uploadedImages;
      }
      
      // Add video only if it exists and has required fields
      if (video && video.url) {
        payload.video = {
          url: video.url,
          publicId: video.publicId,
          thumbnail: video.thumbnail,
        };
      }
      
      // Add specifications only if not empty
      if (data.specifications && Object.keys(data.specifications).length > 0) {
        payload.specifications = data.specifications;
      }
      
      // Add dimensions only if at least one dimension is provided
      if (data.dimensions?.length || data.dimensions?.width || data.dimensions?.height) {
        payload.dimensions = {
          length: data.dimensions.length || undefined,
          width: data.dimensions.width || undefined,
          height: data.dimensions.height || undefined,
          unit: data.dimensions.unit || 'cm',
        };
      }
      
      // Add materials only if array is not empty
      if (data.materials && data.materials.length > 0) {
        payload.materials = data.materials;
      }
      
      // Add finishes only if array is not empty
      if (data.finishes && data.finishes.length > 0) {
        payload.finishes = data.finishes;
      }
      
      // Add price only if amount is provided
      if (data.price?.amount && data.price.amount > 0) {
        payload.price = {
          amount: data.price.amount,
          currency: data.price.currency || 'TND',
          unit: data.price.unit?.trim() || undefined,
        };
      }
      
      // Add SEO fields only if provided
      if (data.seoTitle?.trim()) {
        payload.seoTitle = data.seoTitle.trim();
      }
      
      if (data.seoDescription?.trim()) {
        payload.seoDescription = data.seoDescription.trim();
      }
      
      // Add tags only if array is not empty
      if (data.tags && data.tags.length > 0) {
        payload.tags = data.tags;
      }

      const response = await productsService.create(payload);

      if (response.success && response.data?._id) {
        // Redirect with success parameter for popup and table refresh
        router.push(`/admin/products?success=true&name=${encodeURIComponent(response.data.name)}&refresh=${Date.now()}`);
      } else {
        throw new Error(response.message || 'Erreur: Le produit n\'a pas été créé');
      }
    } catch (error: any) {
      let errorMessage = 'Une erreur est survenue lors de la création du produit';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Display validation errors if available
      if (error.response?.data?.details) {
        const details = error.response.data.details;
        const errorList = details.map((d: any) => `• ${d.field}: ${d.message}`).join('\n');
        errorMessage = `Erreurs de validation:\n\n${errorList}`;
      }
      
      setSubmitError(errorMessage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle auto-generate slug
  const handleGenerateSlug = () => {
    generateSlugFromName();
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <LoadingSpinner size="xl" variant="primary" text="Chargement..." centered />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Breadcrumb */}
            <div className="mb-4">
              <Breadcrumb />
            </div>

            {/* Title and Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">
                  Créer un nouveau produit
                </h1>
                <p className="mt-2 text-neutral-600">
                  Remplissez les informations ci-dessous pour créer un nouveau produit
                </p>
              </div>

              <Link
                href="/admin/products"
                className="inline-flex items-center px-4 py-2 text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Annuler
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Error Message */}
          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                  <p className="mt-1 text-sm text-red-700">{submitError}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Basic Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
          >
            <h2 className="text-xl font-semibold text-neutral-900 mb-6">
              Informations de base
            </h2>

            <div className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                  Nom du produit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  {...register('name')}
                  placeholder="Ex: Cuisine moderne en chêne massif"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors ${
                    errors.name ? 'border-red-500' : 'border-neutral-300'
                  }`}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                  <p className="text-xs text-neutral-500 ml-auto">
                    {nameValue.length}/200 caractères
                  </p>
                </div>
              </div>

              {/* Slug */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-neutral-700 mb-2">
                  Slug (URL) <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="slug"
                    {...register('slug')}
                    placeholder="cuisine-moderne-chene-massif"
                    className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors ${
                      errors.slug ? 'border-red-500' : 'border-neutral-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateSlug}
                    className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    title="Générer depuis le nom"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1">
                  {errors.slug && (
                    <p className="text-sm text-red-600">{errors.slug.message}</p>
                  )}
                  {!errors.slug && slugValue && (
                    <p className="text-xs text-neutral-500">
                      URL: /produits/{slugValue}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500 ml-auto">
                    {slugValue.length}/200 caractères
                  </p>
                </div>
              </div>

              {/* Category and Subcategory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-2">
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    {...register('category')}
                    disabled={loadingCategories}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors ${
                      errors.category ? 'border-red-500' : 'border-neutral-300'
                    } ${loadingCategories ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {loadingCategories ? (
                      <option disabled>Chargement des catégories...</option>
                    ) : (
                      categories.map((category) => (
                        <option key={category._id} value={category.slug}>
                          {category.name}
                        </option>
                      ))
                    )}
                  </select>
                  {errors.category && (
                    <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
                  )}
                  {categories.length === 0 && !loadingCategories && (
                    <p className="text-xs text-amber-600 mt-1">
                      Aucune catégorie disponible. <Link href="/admin/categories" className="underline">Créer des catégories</Link>
                    </p>
                  )}
                </div>

                {/* Subcategory removed */}
              </div>
            </div>
          </motion.div>

          {/* Description Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
          >
            <h2 className="text-xl font-semibold text-neutral-900 mb-6">
              Descriptions
            </h2>

            <div className="space-y-6">
              {/* Short Description */}
              <div>
                <label htmlFor="shortDescription" className="block text-sm font-medium text-neutral-700 mb-2">
                  Description courte <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="shortDescription"
                  {...register('shortDescription')}
                  rows={3}
                  placeholder="Résumé court du produit (affiché dans les listes et les aperçus)"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors resize-none ${
                    errors.shortDescription ? 'border-red-500' : 'border-neutral-300'
                  }`}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.shortDescription && (
                    <p className="text-sm text-red-600">{errors.shortDescription.message}</p>
                  )}
                  <p className="text-xs text-neutral-500 ml-auto">
                    {shortDescriptionValue.length}/300 caractères
                  </p>
                </div>
              </div>

              {/* Full Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
                  Description complète <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={8}
                  placeholder="Description détaillée du produit (affichée sur la page du produit)"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors resize-none ${
                    errors.description ? 'border-red-500' : 'border-neutral-300'
                  }`}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description.message}</p>
                  )}
                  <p className="text-xs text-neutral-500 ml-auto">
                    {descriptionValue.length}/5000 caractères
                  </p>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  L'éditeur de texte enrichi sera ajouté dans une prochaine version
                </p>
              </div>
            </div>
          </motion.div>

          {/* Product Images Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-xl font-semibold text-neutral-900">
                Images du produit
              </h2>
            </div>

            <ProductImageManager
              images={images}
              onChange={setImages}
              maxImages={10}
              maxFileSize={10}
              acceptedFormats={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
            />
          </motion.div>

          {/* Product Video Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.27 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h2 className="text-xl font-semibold text-neutral-900">
                Vidéo du produit
              </h2>
              <span className="text-xs text-neutral-500 ml-2">(optionnel)</span>
            </div>

            <ProductVideoManager
              video={video}
              onChange={setVideo}
              maxFileSize={100}
              acceptedFormats={['video/mp4', 'video/webm']}
            />
          </motion.div>

          {/* Specifications Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
          >
            <h2 className="text-xl font-semibold text-neutral-900 mb-6">
              Spécifications techniques
            </h2>

            {/* Input area */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="specKey" className="block text-sm font-medium text-neutral-700 mb-2">
                    Clé
                  </label>
                  <input
                    type="text"
                    id="specKey"
                    value={specKey}
                    onChange={(e) => setSpecKey(e.target.value)}
                    placeholder="Ex: Dimensions"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label htmlFor="specValue" className="block text-sm font-medium text-neutral-700 mb-2">
                    Valeur
                  </label>
                  <input
                    type="text"
                    id="specValue"
                    value={specValue}
                    onChange={(e) => setSpecValue(e.target.value)}
                    placeholder="Ex: 200x100x80 cm"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                    maxLength={100}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddSpecification}
                  className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter une spécification
                </button>
                {specError && (
                  <p className="text-sm text-red-600">{specError}</p>
                )}
              </div>
            </div>

            {/* List of specifications */}
            <div className="space-y-2">
              <AnimatePresence>
                {Object.entries(specifications).map(([key, value], index) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-neutral-900">{key}:</span>{' '}
                      <span className="text-neutral-700">{value}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecification(key)}
                      className="ml-4 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="Supprimer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Empty state */}
            {Object.keys(specifications).length === 0 && (
              <div className="text-center py-8 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200">
                <svg className="w-12 h-12 mx-auto text-neutral-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-neutral-500">
                  Aucune spécification ajoutée
                </p>
              </div>
            )}
          </motion.div>

          {/* Materials Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
          >
            <h2 className="text-xl font-semibold text-neutral-900 mb-6">
              Matériaux
            </h2>

            {/* Input area */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={materialInput}
                  onChange={(e) => setMaterialInput(e.target.value)}
                  placeholder="Ex: Chêne massif"
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                  maxLength={100}
                />
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter
                </button>
              </div>
              {materialError && (
                <p className="text-sm text-red-600">{materialError}</p>
              )}
            </div>

            {/* List of materials */}
            <div className="space-y-2">
              <AnimatePresence>
                {materials.map((material, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    <span className="text-neutral-900">{material}</span>
                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      className="ml-4 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="Supprimer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Empty state */}
            {materials.length === 0 && (
              <div className="text-center py-8 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200">
                <svg className="w-12 h-12 mx-auto text-neutral-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm text-neutral-500">
                  Aucun matériau ajouté
                </p>
              </div>
            )}
          </motion.div>

          {/* Finishes Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
          >
            <h2 className="text-xl font-semibold text-neutral-900 mb-6">
              Finitions
            </h2>

            {/* Input area */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={finishInput}
                  onChange={(e) => setFinishInput(e.target.value)}
                  placeholder="Ex: Vernis mat"
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                  maxLength={100}
                />
                <button
                  type="button"
                  onClick={handleAddFinish}
                  className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter
                </button>
              </div>
              {finishError && (
                <p className="text-sm text-red-600">{finishError}</p>
              )}
            </div>

            {/* List of finishes */}
            <div className="space-y-2">
              <AnimatePresence>
                {finishes.map((finish, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    <span className="text-neutral-900">{finish}</span>
                    <button
                      type="button"
                      onClick={() => removeFinish(index)}
                      className="ml-4 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="Supprimer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Empty state */}
            {finishes.length === 0 && (
              <div className="text-center py-8 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200">
                <svg className="w-12 h-12 mx-auto text-neutral-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <p className="text-sm text-neutral-500">
                  Aucune finition ajoutée
                </p>
              </div>
            )}
          </motion.div>

          {/* Tags Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
          >
            <h2 className="text-xl font-semibold text-neutral-900 mb-6">
              Tags
            </h2>

            {/* Input area */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  placeholder="Ex: moderne, luxe, sur-mesure"
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                  maxLength={50}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter
                </button>
              </div>
              {tagError && (
                <p className="text-sm text-red-600">{tagError}</p>
              )}
              <p className="text-xs text-neutral-500">
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Appuyez sur Entrée pour ajouter rapidement un tag
              </p>
            </div>

            {/* Tags display as pills */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <AnimatePresence>
                  {tags.map((tag, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium hover:bg-amber-200 transition-colors"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="p-0.5 hover:bg-amber-300 rounded-full transition-colors"
                        title="Supprimer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Empty state */}
            {tags.length === 0 && (
              <div className="text-center py-8 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200">
                <svg className="w-12 h-12 mx-auto text-neutral-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="text-sm text-neutral-500">
                  Aucun tag ajouté
                </p>
              </div>
            )}
          </motion.div>

          {/* Dimensions & Price Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.7 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <h2 className="text-xl font-semibold text-neutral-900">
                Dimensions & Prix
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dimensions */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-neutral-700 mb-4">Dimensions (optionnel)</h3>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="dimensions.length" className="block text-xs font-medium text-neutral-600 mb-1">
                      Longueur
                    </label>
                    <input
                      type="number"
                      id="dimensions.length"
                      {...register('dimensions.length', { valueAsNumber: true })}
                      placeholder="200"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="dimensions.width" className="block text-xs font-medium text-neutral-600 mb-1">
                      Largeur
                    </label>
                    <input
                      type="number"
                      id="dimensions.width"
                      {...register('dimensions.width', { valueAsNumber: true })}
                      placeholder="100"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="dimensions.height" className="block text-xs font-medium text-neutral-600 mb-1">
                      Hauteur
                    </label>
                    <input
                      type="number"
                      id="dimensions.height"
                      {...register('dimensions.height', { valueAsNumber: true })}
                      placeholder="80"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="dimensions.unit" className="block text-xs font-medium text-neutral-600 mb-1">
                    Unité
                  </label>
                  <select
                    id="dimensions.unit"
                    {...register('dimensions.unit')}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                  >
                    <option value="cm">Centimètres (cm)</option>
                    <option value="m">Mètres (m)</option>
                  </select>
                </div>

                {(errors.dimensions?.length || errors.dimensions?.width || errors.dimensions?.height) && (
                  <p className="text-sm text-red-600">
                    {errors.dimensions?.length?.message || errors.dimensions?.width?.message || errors.dimensions?.height?.message}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-neutral-700 mb-4">Prix (optionnel)</h3>
                
                <div>
                  <label htmlFor="price.amount" className="block text-xs font-medium text-neutral-600 mb-1">
                    Montant
                  </label>
                  <input
                    type="number"
                    id="price.amount"
                    {...register('price.amount', { valueAsNumber: true })}
                    placeholder="1500.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                  />
                  {errors.price?.amount && (
                    <p className="text-sm text-red-600 mt-1">{errors.price.amount.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="price.currency" className="block text-xs font-medium text-neutral-600 mb-1">
                    Devise
                  </label>
                  <select
                    id="price.currency"
                    {...register('price.currency')}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                  >
                    <option value="TND">Dinar Tunisien (TND)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="USD">Dollar US (USD)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="price.unit" className="block text-xs font-medium text-neutral-600 mb-1">
                    Unité (optionnel)
                  </label>
                  <input
                    type="text"
                    id="price.unit"
                    {...register('price.unit')}
                    placeholder="Ex: par mètre linéaire"
                    maxLength={20}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Précisez si le prix est par unité, mètre, etc.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Product Settings Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.8 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h2 className="text-xl font-semibold text-neutral-900">
                Paramètres du produit
              </h2>
            </div>

            <div className="space-y-6">
              {/* Availability */}
              <div>
                <label htmlFor="availability" className="block text-sm font-medium text-neutral-700 mb-2">
                  Disponibilité
                </label>
                <select
                  id="availability"
                  {...register('availability')}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                >
                  <option value="in_stock">En stock</option>
                  <option value="made_to_order">Sur commande</option>
                  <option value="out_of_stock">Rupture de stock</option>
                </select>
                
                {/* Availability Badge Preview */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-neutral-600">Aperçu:</span>
                  {availabilityValue === 'in_stock' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      En stock
                    </span>
                  )}
                  {availabilityValue === 'made_to_order' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      Sur commande
                    </span>
                  )}
                  {availabilityValue === 'out_of_stock' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Rupture de stock
                    </span>
                  )}
                </div>
                
                {errors.availability && (
                  <p className="text-sm text-red-600 mt-1">{errors.availability.message}</p>
                )}
              </div>

              {/* Featured */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    {...register('featured')}
                    className="w-5 h-5 text-amber-600 border-neutral-300 rounded focus:ring-2 focus:ring-amber-500 transition-colors cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">
                      Produit en vedette
                    </span>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Les produits en vedette sont mis en avant sur la page d'accueil
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </motion.div>

          {/* SEO Optimization Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.9 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h2 className="text-xl font-semibold text-neutral-900">
                Optimisation SEO
              </h2>
            </div>

            <div className="space-y-6">
              {/* SEO Title */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="seoTitle" className="block text-sm font-medium text-neutral-700">
                    Titre SEO
                  </label>
                  <button
                    type="button"
                    onClick={generateSeoFromContent}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                    title="Générer automatiquement"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Auto-générer
                  </button>
                </div>
                <input
                  type="text"
                  id="seoTitle"
                  {...register('seoTitle')}
                  placeholder="Titre optimisé pour les moteurs de recherche"
                  maxLength={60}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.seoTitle && (
                    <p className="text-sm text-red-600">{errors.seoTitle.message}</p>
                  )}
                  <p className={`text-xs ml-auto ${seoTitleValue.length > 60 ? 'text-red-600' : seoTitleValue.length > 50 ? 'text-amber-600' : 'text-neutral-500'}`}>
                    {seoTitleValue.length}/60 caractères
                  </p>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Idéal: 50-60 caractères. Apparaît dans les résultats de recherche Google.
                </p>
              </div>

              {/* SEO Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="seoDescription" className="block text-sm font-medium text-neutral-700">
                    Description SEO
                  </label>
                  <button
                    type="button"
                    onClick={generateSeoFromContent}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                    title="Générer automatiquement"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Auto-générer
                  </button>
                </div>
                <textarea
                  id="seoDescription"
                  {...register('seoDescription')}
                  rows={3}
                  placeholder="Description optimisée pour les moteurs de recherche"
                  maxLength={160}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors resize-none"
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.seoDescription && (
                    <p className="text-sm text-red-600">{errors.seoDescription.message}</p>
                  )}
                  <p className={`text-xs ml-auto ${seoDescriptionValue.length > 160 ? 'text-red-600' : seoDescriptionValue.length > 150 ? 'text-amber-600' : 'text-neutral-500'}`}>
                    {seoDescriptionValue.length}/160 caractères
                  </p>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Idéal: 150-160 caractères. Apparaît sous le titre dans les résultats Google.
                </p>
              </div>

              {/* SEO Preview */}
              {(seoTitleValue || seoDescriptionValue) && (
                <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <p className="text-xs font-medium text-neutral-600 mb-3">Aperçu dans les résultats de recherche:</p>
                  <div className="space-y-1">
                    <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                      {seoTitleValue || nameValue || 'Titre du produit'}
                    </div>
                    <div className="text-green-700 text-sm">
                      ebenor-creation.com › produits › {slugValue || 'slug-du-produit'}
                    </div>
                    <div className="text-neutral-600 text-sm">
                      {seoDescriptionValue || shortDescriptionValue || 'Description du produit qui apparaîtra dans les résultats de recherche...'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Form Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 1.0 }}
            className="flex items-center justify-end gap-4"
          >
            <Link
              href="/admin/products"
              className="inline-flex items-center px-6 py-3 text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Annuler
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <LoadingButton variant="white" />}
              {isSubmitting ? 'Création en cours...' : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Créer le produit
                </>
              )}
            </button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
