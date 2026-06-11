import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { ApiError, ERROR_CODES } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export class ProductController {
  /**
   * Obtenir tous les produits avec pagination et filtres
   */
  public async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = 1,
        limit = 12,
        category,
        subcategory,
        availability,
        featured,
        search,
        sort = '-createdAt',
        minPrice,
        maxPrice,
        materials,
        tags,
      } = req.query;

      // Construire le filtre
      const filter: any = {};

      if (category) {
        filter.category = category;
      }

      if (subcategory) {
        filter.subcategory = subcategory;
      }

      if (availability) {
        filter.availability = availability;
      }

      if (featured !== undefined) {
        filter.featured = featured === 'true';
      }

      // Filtre de prix
      if (minPrice || maxPrice) {
        filter['price.amount'] = {};
        if (minPrice) filter['price.amount'].$gte = Number(minPrice);
        if (maxPrice) filter['price.amount'].$lte = Number(maxPrice);
      }

      // Filtre de matériaux
      if (materials) {
        const materialsArray = (materials as string).split(',');
        filter.materials = { $in: materialsArray };
      }

      // Filtre de tags
      if (tags) {
        const tagsArray = (tags as string).split(',');
        filter.tags = { $in: tagsArray };
      }

      // Recherche textuelle
      if (search) {
        filter.$text = { $search: search as string };
      }

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;

      // Exécuter la requête avec pagination
      const [products, total] = await Promise.all([
        Product.find(filter)
          .sort(sort as string)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Product.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      const response: ApiResponse = {
        success: true,
        data: products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: totalPages,
          hasMore: pageNum < totalPages,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir un produit par son slug
   */
  public async getProductBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;

      const product = await Product.findOne({ slug }).lean();

      if (!product) {
        throw new ApiError(
          'Produit non trouvé',
          404,
          ERROR_CODES.NOT_FOUND
        );
      }

      const response: ApiResponse = {
        success: true,
        data: product,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir un produit par son ID
   */
  public async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(
          'ID de produit invalide',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const product = await Product.findById(id).lean();

      if (!product) {
        throw new ApiError(
          'Produit non trouvé',
          404,
          ERROR_CODES.NOT_FOUND
        );
      }

      const response: ApiResponse = {
        success: true,
        data: product,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir les produits en vedette
   */
  public async getFeaturedProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 6 } = req.query;
      const limitNum = Math.min(20, Math.max(1, Number(limit)));

      const products = await Product.find({ featured: true })
        .sort('-createdAt')
        .limit(limitNum)
        .lean();

      const response: ApiResponse = {
        success: true,
        data: products,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir les catégories de produits disponibles
   */
  public async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Obtenir les catégories depuis la collection Category
      const categories = await Category.find({ isActive: true })
        .sort('name')
        .lean();

      // Si aucune catégorie n'existe, utiliser les catégories distinctes des produits
      if (categories.length === 0) {
        const distinctCategories = await Product.distinct('category');
        
        const categoriesData = distinctCategories.map(cat => ({
          name: cat,
          slug: cat.toLowerCase().replace(/\s+/g, '-'),
          isActive: true,
        }));

        const response: ApiResponse = {
          success: true,
          data: categoriesData,
        };

        res.status(200).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: categories,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rechercher des produits
   */
  public async searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, page = 1, limit = 12 } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        throw new ApiError(
          'Requête de recherche requise',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;

      // Recherche textuelle avec score
      const [products, total] = await Promise.all([
        Product.find(
          { $text: { $search: q as string } },
          { score: { $meta: 'textScore' } }
        )
          .sort({ score: { $meta: 'textScore' } })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Product.countDocuments({ $text: { $search: q as string } }),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      const response: ApiResponse = {
        success: true,
        data: products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: totalPages,
          hasMore: pageNum < totalPages,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir des produits similaires
   */
  public async getSimilarProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 4 } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(
          'ID de produit invalide',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const product = await Product.findById(id);

      if (!product) {
        throw new ApiError(
          'Produit non trouvé',
          404,
          ERROR_CODES.NOT_FOUND
        );
      }

      const limitNum = Math.min(20, Math.max(1, Number(limit)));

      // Trouver des produits similaires basés sur la catégorie et les tags
      const similarProducts = await Product.find({
        _id: { $ne: id },
        $or: [
          { category: product.category },
          { tags: { $in: product.tags } },
        ],
      })
        .sort('-featured -createdAt')
        .limit(limitNum)
        .lean();

      const response: ApiResponse = {
        success: true,
        data: similarProducts,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir les statistiques des produits
   */
  public async getProductStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalProducts,
        featuredCount,
        categoryStats,
        priceStats,
      ] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ featured: true }),
        Product.aggregate([
          {
            $group: {
              _id: null,
              categoriesCount: { $addToSet: '$category' },
            },
          },
        ]),
        Product.aggregate([
          {
            $group: {
              _id: null,
              avgPrice: { $avg: '$price' },
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' },
            },
          },
        ]),
      ]);

      const categoriesCount = categoryStats[0]?.categoriesCount?.length || 0;
      const priceData = priceStats[0] || { avgPrice: 0, minPrice: 0, maxPrice: 0 };

      const stats = {
        totalProducts: totalProducts,
        featuredProducts: featuredCount,
        categoriesCount: categoriesCount,
        avgPrice: Math.round(priceData.avgPrice || 0),
        minPrice: Math.round(priceData.minPrice || 0),
        maxPrice: Math.round(priceData.maxPrice || 0),
      };

      const response: ApiResponse = {
        success: true,
        data: stats,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir la répartition des produits par catégorie
   */
  public async getProductCategoriesBreakdown(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryBreakdown = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            subcategories: { $addToSet: '$subcategory' },
          },
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            count: 1,
            subcategories: {
              $filter: {
                input: '$subcategories',
                as: 'sub',
                cond: { $ne: ['$$sub', null] },
              },
            },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      const response: ApiResponse = {
        success: true,
        data: categoryBreakdown,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Créer un nouveau produit (Admin only)
   */
  public async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productData = req.body;

      // Ajouter l'utilisateur qui crée le produit
      if (req.user) {
        productData.createdBy = req.user.email || req.user.id;
      }

      const product = new Product(productData);
      await product.save();

      logger.info('Product created', {
        productId: product._id,
        name: product.name,
        createdBy: productData.createdBy,
      });

      const response: ApiResponse = {
        success: true,
        data: product,
        message: 'Produit créé avec succès',
      };

      res.status(201).json(response);
    } catch (error: any) {
      if (error.code === 11000) {
        next(new ApiError(
          'Un produit avec ce slug existe déjà',
          409,
          ERROR_CODES.DUPLICATE_ENTRY
        ));
      } else {
        next(error);
      }
    }
  }

  /**
   * Mettre à jour un produit (Admin only)
   */
  public async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(
          'ID de produit invalide',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Ajouter l'utilisateur qui modifie le produit
      if (req.user) {
        updateData.updatedBy = req.user.email || req.user.id;
      }

      const product = await Product.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!product) {
        throw new ApiError(
          'Produit non trouvé',
          404,
          ERROR_CODES.NOT_FOUND
        );
      }

      logger.info('Product updated', {
        productId: product._id,
        name: product.name,
        updatedBy: updateData.updatedBy,
      });

      const response: ApiResponse = {
        success: true,
        data: product,
        message: 'Produit mis à jour avec succès',
      };

      res.status(200).json(response);
    } catch (error: any) {
      if (error.code === 11000) {
        next(new ApiError(
          'Un produit avec ce slug existe déjà',
          409,
          ERROR_CODES.DUPLICATE_ENTRY
        ));
      } else {
        next(error);
      }
    }
  }

  /**
   * Supprimer un produit (Admin only)
   */
  public async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(
          'ID de produit invalide',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Find the product first to get its images
      const product = await Product.findById(id);

      if (!product) {
        throw new ApiError(
          'Produit non trouvé',
          404,
          ERROR_CODES.NOT_FOUND
        );
      }

      // Extract all image URLs from the product
      const imageUrls = product.images?.map((img: { url: string }) => img.url) || [];

      // Delete the product
      await Product.findByIdAndDelete(id);

      // Delete associated gallery images that match the product's image URLs
      let deletedGalleryImagesCount = 0;
      if (imageUrls.length > 0) {
        const { GalleryImage } = await import('../models/GalleryImage');
        const { cloudinaryService } = await import('../services/cloudinaryService');
        
        // Find gallery images to delete
        const galleryImages = await GalleryImage.find({
          url: { $in: imageUrls }
        });

        // Delete from database
        const deleteResult = await GalleryImage.deleteMany({
          url: { $in: imageUrls }
        });
        deletedGalleryImagesCount = deleteResult.deletedCount || 0;

        // Delete from Cloudinary if available
        for (const galleryImage of galleryImages) {
          try {
            // Extract public_id from URL
            const urlMatch = galleryImage.url.match(/\/([^/]+)\.(jpg|jpeg|png|webp|mp4|mov)$/i);
            if (urlMatch && urlMatch[1]) {
              const publicId = `ebenor-creation/products/${urlMatch[1]}`;
              await cloudinaryService.deleteFile(publicId, 'image');
              logger.info('Deleted image from Cloudinary', {
                publicId,
                url: galleryImage.url
              });
            }
          } catch (cloudError) {
            logger.warn('Failed to delete image from Cloudinary', {
              url: galleryImage.url,
              error: cloudError
            });
            // Continue even if Cloudinary deletion fails
          }
        }

        if (deletedGalleryImagesCount > 0) {
          logger.info('Deleted associated gallery images', {
            productId: id,
            productName: product.name,
            imagesDeleted: deletedGalleryImagesCount,
            urls: imageUrls,
          });
        }
      }

      logger.info('Product deleted', {
        productId: id,
        name: product.name,
        deletedBy: req.user?.email || req.user?.id,
        imagesCount: imageUrls.length,
        galleryImagesDeleted: deletedGalleryImagesCount,
      });

      const response: ApiResponse = {
        success: true,
        data: { 
          id,
          deletedImagesCount: imageUrls.length,
          deletedGalleryImagesCount
        },
        message: `Produit supprimé avec succès${deletedGalleryImagesCount > 0 ? ` (${deletedGalleryImagesCount} image(s) de galerie supprimée(s))` : ''}`,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Opérations en masse (Admin only)
   */
  public async bulkOperations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { operation, ids, data } = req.body;

      if (!operation || !ids || !Array.isArray(ids) || ids.length === 0) {
        throw new ApiError(
          'Opération et IDs requis',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Valider tous les IDs
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length !== ids.length) {
        throw new ApiError(
          'Un ou plusieurs IDs sont invalides',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      let result;
      let deletedImagesCount = 0;

      switch (operation) {
        case 'delete':
          // Find products first to get their image URLs
          const productsToDelete = await Product.find({ _id: { $in: validIds } });
          const allImageUrls: string[] = [];
          
          productsToDelete.forEach(product => {
            if (product.images && product.images.length > 0) {
              product.images.forEach((img: { url: string }) => allImageUrls.push(img.url));
            }
          });

          // Delete the products
          result = await Product.deleteMany({ _id: { $in: validIds } });
          
          // Delete associated gallery images
          if (allImageUrls.length > 0) {
            const { GalleryImage } = await import('../models/GalleryImage');
            const { cloudinaryService } = await import('../services/cloudinaryService');
            
            // Find gallery images to delete
            const galleryImages = await GalleryImage.find({
              url: { $in: allImageUrls }
            });

            // Delete from database
            const deleteImagesResult = await GalleryImage.deleteMany({
              url: { $in: allImageUrls }
            });
            deletedImagesCount = deleteImagesResult.deletedCount || 0;

            // Delete from Cloudinary
            for (const galleryImage of galleryImages) {
              try {
                const urlMatch = galleryImage.url.match(/\/([^/]+)\.(jpg|jpeg|png|webp|mp4|mov)$/i);
                if (urlMatch && urlMatch[1]) {
                  const publicId = `ebenor-creation/products/${urlMatch[1]}`;
                  await cloudinaryService.deleteFile(publicId, 'image');
                }
              } catch (cloudError) {
                logger.warn('Failed to delete image from Cloudinary during bulk delete', {
                  url: galleryImage.url,
                  error: cloudError
                });
              }
            }
          }

          logger.info('Bulk delete products', {
            productsDeleted: result.deletedCount,
            imagesDeleted: deletedImagesCount,
            deletedBy: req.user?.email || req.user?.id,
          });
          break;

        case 'update':
          if (!data) {
            throw new ApiError(
              'Données de mise à jour requises',
              400,
              ERROR_CODES.VALIDATION_ERROR
            );
          }
          const updateData = { ...data };
          if (req.user) {
            updateData.updatedBy = req.user.email || req.user.id;
          }
          result = await Product.updateMany(
            { _id: { $in: validIds } },
            { $set: updateData }
          );
          logger.info('Bulk update products', {
            count: result.modifiedCount,
            updatedBy: req.user?.email || req.user?.id,
          });
          break;

        case 'toggleFeatured':
          // Toggle featured status
          const products = await Product.find({ _id: { $in: validIds } });
          await Promise.all(
            products.map(async (product) => {
              product.featured = !product.featured;
              if (req.user) {
                product.updatedBy = req.user.email || req.user.id;
              }
              return product.save();
            })
          );
          result = { modifiedCount: products.length };
          logger.info('Bulk toggle featured products', {
            count: products.length,
            updatedBy: req.user?.email || req.user?.id,
          });
          break;

        default:
          throw new ApiError(
            'Opération invalide',
            400,
            ERROR_CODES.VALIDATION_ERROR
          );
      }

      const responseData = operation === 'delete' 
        ? { ...result, deletedImagesCount }
        : result;

      const response: ApiResponse = {
        success: true,
        data: responseData,
        message: operation === 'delete'
          ? `${validIds.length} produit(s) et ${deletedImagesCount} image(s) supprimé(s) avec succès`
          : `Opération "${operation}" effectuée avec succès sur ${validIds.length} produit(s)`,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

// Instance du contrôleur de produits
export const productController = new ProductController();
