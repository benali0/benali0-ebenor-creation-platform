import { z } from 'zod';

/**
 * Product Categories
 */
export const PRODUCT_CATEGORIES = [
  'cuisine',
  'dressing',
  'mobilier',
  'amenagement',
  'autre',
] as const;

/**
 * Product Availability Status
 */
export const PRODUCT_AVAILABILITY = [
  'in_stock',
  'made_to_order',
  'out_of_stock',
] as const;

/**
 * Dimension Units
 */
export const DIMENSION_UNITS = ['cm', 'm'] as const;

/**
 * Currency Codes
 */
export const CURRENCIES = ['TND', 'EUR', 'USD'] as const;

/**
 * Helper function to generate URL-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD') // Normalize unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Helper function to auto-generate SEO title from product name
 */
export function generateSeoTitle(name: string, category?: string): string {
  const baseTitle = name.substring(0, 50);
  if (category) {
    const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
    return `${baseTitle} - ${categoryLabel}`.substring(0, 60);
  }
  return baseTitle;
}

/**
 * Helper function to auto-generate SEO description from short description
 */
export function generateSeoDescription(
  shortDescription: string,
  category?: string
): string {
  const baseDescription = shortDescription.substring(0, 140);
  if (category) {
    return `${baseDescription} | ÉBENOR CRÉATION`.substring(0, 160);
  }
  return baseDescription.substring(0, 160);
}

/**
 * Validation schema for product dimensions
 */
export const productDimensionsSchema = z
  .object({
    length: z
      .number({
        invalid_type_error: 'La longueur doit être un nombre',
      })
      .positive('La longueur doit être positive')
      .optional(),
    width: z
      .number({
        invalid_type_error: 'La largeur doit être un nombre',
      })
      .positive('La largeur doit être positive')
      .optional(),
    height: z
      .number({
        invalid_type_error: 'La hauteur doit être un nombre',
      })
      .positive('La hauteur doit être positive')
      .optional(),
    unit: z.enum(DIMENSION_UNITS, {
      errorMap: () => ({ message: 'Unité invalide (cm ou m)' }),
    }),
  })
  .optional();

/**
 * Validation schema for product price
 */
export const productPriceSchema = z
  .object({
    amount: z
      .number({
        invalid_type_error: 'Le montant doit être un nombre',
      })
      .positive('Le montant doit être positif'),
    currency: z
      .string()
      .length(3, 'Le code devise doit contenir 3 caractères')
      .default('TND'),
    unit: z
      .string()
      .max(20, 'L\'unité ne peut pas dépasser 20 caractères')
      .optional(),
  })
  .optional();

/**
 * Validation schema for product image
 */
export const productImageSchema = z.object({
  url: z.string().url('URL d\'image invalide'),
  alt: z
    .string()
    .min(1, 'Le texte alternatif est requis')
    .max(200, 'Le texte alternatif ne peut pas dépasser 200 caractères'),
  isPrimary: z.boolean().default(false),
});

/**
 * Complete product validation schema
 * Validates all product fields according to requirements 8.5-8.12
 */
export const productFormSchema = z.object({
  // Basic Information
  name: z
    .string()
    .min(1, 'Le nom du produit est requis')
    .max(200, 'Le nom ne peut pas dépasser 200 caractères')
    .trim(),

  slug: z
    .string()
    .min(1, 'Le slug est requis')
    .max(200, 'Le slug ne peut pas dépasser 200 caractères')
    .toLowerCase()
    .regex(
      /^[a-z0-9-]+$/,
      'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'
    )
    .trim(),

  category: z.string().min(1, 'La catégorie est requise'),

  subcategory: z
    .string()
    .max(100, 'La sous-catégorie ne peut pas dépasser 100 caractères')
    .trim()
    .optional()
    .or(z.literal('')),

  // Descriptions
  shortDescription: z
    .string()
    .min(1, 'La description courte est requise')
    .max(300, 'La description courte ne peut pas dépasser 300 caractères')
    .trim(),

  description: z
    .string()
    .min(1, 'La description est requise')
    .max(5000, 'La description ne peut pas dépasser 5000 caractères')
    .trim(),

  // Images
  images: z
    .array(productImageSchema)
    .min(0, 'Au moins une image est recommandée')
    .default([]),

  // Specifications
  specifications: z
    .record(z.string(), z.string())
    .optional()
    .default({}),

  // Physical Properties
  dimensions: productDimensionsSchema,

  materials: z
    .array(
      z
        .string()
        .max(100, 'Le nom du matériau ne peut pas dépasser 100 caractères')
        .trim()
    )
    .optional()
    .default([]),

  finishes: z
    .array(
      z
        .string()
        .max(100, 'Le nom de la finition ne peut pas dépasser 100 caractères')
        .trim()
    )
    .optional()
    .default([]),

  // Pricing
  price: productPriceSchema,

  // Availability
  availability: z
    .enum(PRODUCT_AVAILABILITY, {
      errorMap: () => ({ message: 'Statut de disponibilité invalide' }),
    })
    .default('made_to_order'),

  // Featured
  featured: z.boolean().default(false),

  // SEO
  seoTitle: z
    .string()
    .max(60, 'Le titre SEO ne peut pas dépasser 60 caractères')
    .trim()
    .optional()
    .or(z.literal('')),

  seoDescription: z
    .string()
    .max(160, 'La description SEO ne peut pas dépasser 160 caractères')
    .trim()
    .optional()
    .or(z.literal('')),

  // Tags
  tags: z
    .array(
      z
        .string()
        .max(50, 'Un tag ne peut pas dépasser 50 caractères')
        .trim()
        .toLowerCase()
    )
    .optional()
    .default([]),
});

/**
 * Type inference for product form data
 */
export type ProductFormData = z.infer<typeof productFormSchema>;

/**
 * Partial schema for product updates (all fields optional except ID)
 */
export const productUpdateSchema = productFormSchema.partial();

export type ProductUpdateData = z.infer<typeof productUpdateSchema>;

/**
 * Helper function to prepare form data with auto-generated fields
 */
export function prepareProductFormData(
  data: Partial<ProductFormData>
): ProductFormData {
  const prepared = { ...data } as ProductFormData;

  // Auto-generate slug if not provided
  if (!prepared.slug && prepared.name) {
    prepared.slug = generateSlug(prepared.name);
  }

  // Auto-generate SEO title if not provided
  if (!prepared.seoTitle && prepared.name) {
    prepared.seoTitle = generateSeoTitle(prepared.name, prepared.category);
  }

  // Auto-generate SEO description if not provided
  if (!prepared.seoDescription && prepared.shortDescription) {
    prepared.seoDescription = generateSeoDescription(
      prepared.shortDescription,
      prepared.category
    );
  }

  // Ensure at least one image is marked as primary
  if (prepared.images && prepared.images.length > 0) {
    const hasPrimary = prepared.images.some((img) => img.isPrimary);
    if (!hasPrimary) {
      prepared.images[0].isPrimary = true;
    }
  }

  return prepared;
}

/**
 * Helper function to validate slug uniqueness (to be used with API call)
 */
export async function validateSlugUniqueness(
  _slug: string,
  _productId?: string
): Promise<boolean> {
  // This would typically make an API call to check if slug exists
  // For now, return true (implement API call in the component)
  return true;
}

/**
 * Helper to convert form data to API payload
 */
export function productFormToApiPayload(
  formData: ProductFormData
): Record<string, any> {
  return {
    ...formData,
    // Convert empty strings to undefined for optional fields
    subcategory: formData.subcategory || undefined,
    seoTitle: formData.seoTitle || undefined,
    seoDescription: formData.seoDescription || undefined,
    // Ensure proper structure for nested objects
    specifications: formData.specifications || {},
    dimensions: formData.dimensions || undefined,
    price: formData.price || undefined,
  };
}
