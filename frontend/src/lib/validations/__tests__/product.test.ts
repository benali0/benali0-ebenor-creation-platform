import {
  productFormSchema,
  generateSlug,
  generateSeoTitle,
  generateSeoDescription,
  prepareProductFormData,
  ProductFormData,
} from '../product';

describe('Product Validation Schema', () => {
  describe('generateSlug', () => {
    it('should generate URL-friendly slug from text', () => {
      expect(generateSlug('Table en Bois Massif')).toBe('table-en-bois-massif');
      expect(generateSlug('Cuisine Équipée')).toBe('cuisine-equipee');
      expect(generateSlug('  Armoire   Moderne  ')).toBe('armoire-moderne');
      expect(generateSlug('Chaise #1 - Édition Spéciale')).toBe('chaise-1-edition-speciale');
    });

    it('should handle special characters and accents', () => {
      expect(generateSlug('Étagère à Livres')).toBe('etagere-a-livres');
      expect(generateSlug('Canapé d\'angle')).toBe('canape-dangle');
    });

    it('should remove multiple consecutive hyphens', () => {
      expect(generateSlug('Table --- Basse')).toBe('table-basse');
    });
  });

  describe('generateSeoTitle', () => {
    it('should generate SEO title from name', () => {
      const title = generateSeoTitle('Table en Bois Massif');
      expect(title).toBe('Table en Bois Massif');
      expect(title.length).toBeLessThanOrEqual(60);
    });

    it('should include category when provided', () => {
      const title = generateSeoTitle('Table en Bois', 'mobilier');
      expect(title).toContain('Mobilier');
      expect(title.length).toBeLessThanOrEqual(60);
    });

    it('should truncate long names to 60 characters', () => {
      const longName = 'A'.repeat(100);
      const title = generateSeoTitle(longName);
      expect(title.length).toBeLessThanOrEqual(60);
    });
  });

  describe('generateSeoDescription', () => {
    it('should generate SEO description from short description', () => {
      const desc = generateSeoDescription('Belle table en bois massif');
      expect(desc).toBe('Belle table en bois massif');
      expect(desc.length).toBeLessThanOrEqual(160);
    });

    it('should include brand when category provided', () => {
      const desc = generateSeoDescription('Belle table en bois', 'mobilier');
      expect(desc).toContain('ÉBENOR CRÉATION');
      expect(desc.length).toBeLessThanOrEqual(160);
    });

    it('should truncate long descriptions to 160 characters', () => {
      const longDesc = 'A'.repeat(200);
      const desc = generateSeoDescription(longDesc);
      expect(desc.length).toBeLessThanOrEqual(160);
    });
  });

  describe('productFormSchema', () => {
    const validProduct: ProductFormData = {
      name: 'Table en Bois',
      slug: 'table-en-bois',
      category: 'mobilier',
      shortDescription: 'Belle table en bois massif',
      description: 'Description détaillée de la table en bois massif avec finitions de qualité',
      images: [],
      specifications: {},
      materials: [],
      finishes: [],
      availability: 'made_to_order',
      featured: false,
      tags: [],
    };

    it('should validate a valid product', () => {
      const result = productFormSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const invalid = { ...validProduct, name: '' };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should enforce name max length of 200 characters', () => {
      const invalid = { ...validProduct, name: 'A'.repeat(201) };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require slug', () => {
      const invalid = { ...validProduct, slug: '' };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should enforce slug format (lowercase, alphanumeric, hyphens)', () => {
      const invalidSlug = { ...validProduct, slug: 'Invalid Slug!' };
      const result = productFormSchema.safeParse(invalidSlug);
      expect(result.success).toBe(false);

      const validSlug = { ...validProduct, slug: 'valid-slug-123' };
      const result2 = productFormSchema.safeParse(validSlug);
      expect(result2.success).toBe(true);
    });

    it('should require valid category (non-empty string)', () => {
      const invalid = { ...validProduct, category: '' };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept any valid category name as a string', () => {
      const categories = ['cuisine', 'dressing', 'mobilier', 'amenagement', 'autre', 'salon', 'chambre-a-coucher'];
      categories.forEach((category) => {
        const product = { ...validProduct, category: category };
        const result = productFormSchema.safeParse(product);
        expect(result.success).toBe(true);
      });
    });

    it('should enforce subcategory max length of 100 characters', () => {
      const invalid = { ...validProduct, subcategory: 'A'.repeat(101) };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require shortDescription', () => {
      const invalid = { ...validProduct, shortDescription: '' };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should enforce shortDescription max length of 300 characters', () => {
      const invalid = { ...validProduct, shortDescription: 'A'.repeat(301) };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require description', () => {
      const invalid = { ...validProduct, description: '' };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should enforce description max length of 5000 characters', () => {
      const invalid = { ...validProduct, description: 'A'.repeat(5001) };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate dimensions with positive numbers', () => {
      const withDimensions = {
        ...validProduct,
        dimensions: {
          length: 100,
          width: 50,
          height: 75,
          unit: 'cm' as const,
        },
      };
      const result = productFormSchema.safeParse(withDimensions);
      expect(result.success).toBe(true);
    });

    it('should reject negative dimensions', () => {
      const invalid = {
        ...validProduct,
        dimensions: {
          length: -100,
          width: 50,
          height: 75,
          unit: 'cm' as const,
        },
      };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate materials array with max 100 chars each', () => {
      const withMaterials = {
        ...validProduct,
        materials: ['Bois de chêne', 'Acier inoxydable'],
      };
      const result = productFormSchema.safeParse(withMaterials);
      expect(result.success).toBe(true);

      const invalid = {
        ...validProduct,
        materials: ['A'.repeat(101)],
      };
      const result2 = productFormSchema.safeParse(invalid);
      expect(result2.success).toBe(false);
    });

    it('should validate finishes array with max 100 chars each', () => {
      const withFinishes = {
        ...validProduct,
        finishes: ['Vernis mat', 'Peinture blanche'],
      };
      const result = productFormSchema.safeParse(withFinishes);
      expect(result.success).toBe(true);
    });

    it('should validate price with positive amount', () => {
      const withPrice = {
        ...validProduct,
        price: {
          amount: 1500,
          currency: 'TND',
          unit: 'pièce',
        },
      };
      const result = productFormSchema.safeParse(withPrice);
      expect(result.success).toBe(true);
    });

    it('should reject negative price', () => {
      const invalid = {
        ...validProduct,
        price: {
          amount: -100,
          currency: 'TND',
        },
      };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate availability enum', () => {
      const statuses = ['in_stock', 'made_to_order', 'out_of_stock'];
      statuses.forEach((status) => {
        const product = { ...validProduct, availability: status as any };
        const result = productFormSchema.safeParse(product);
        expect(result.success).toBe(true);
      });
    });

    it('should enforce seoTitle max length of 60 characters', () => {
      const invalid = { ...validProduct, seoTitle: 'A'.repeat(61) };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should enforce seoDescription max length of 160 characters', () => {
      const invalid = { ...validProduct, seoDescription: 'A'.repeat(161) };
      const result = productFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate tags array with max 50 chars each', () => {
      const withTags = {
        ...validProduct,
        tags: ['moderne', 'bois', 'qualité'],
      };
      const result = productFormSchema.safeParse(withTags);
      expect(result.success).toBe(true);

      const invalid = {
        ...validProduct,
        tags: ['A'.repeat(51)],
      };
      const result2 = productFormSchema.safeParse(invalid);
      expect(result2.success).toBe(false);
    });

    it('should set default values', () => {
      const minimal = {
        name: 'Test Product',
        slug: 'test-product',
        category: 'mobilier' as const,
        shortDescription: 'Short desc',
        description: 'Full description',
      };
      const result = productFormSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.availability).toBe('made_to_order');
        expect(result.data.featured).toBe(false);
        expect(result.data.images).toEqual([]);
        expect(result.data.tags).toEqual([]);
      }
    });
  });

  describe('prepareProductFormData', () => {
    it('should auto-generate slug from name', () => {
      const data = {
        name: 'Table en Bois',
        category: 'mobilier' as const,
        shortDescription: 'Belle table',
        description: 'Description complète',
      };
      const prepared = prepareProductFormData(data as any);
      expect(prepared.slug).toBe('table-en-bois');
    });

    it('should auto-generate SEO title from name', () => {
      const data = {
        name: 'Table en Bois',
        slug: 'table-en-bois',
        category: 'mobilier' as const,
        shortDescription: 'Belle table',
        description: 'Description complète',
      };
      const prepared = prepareProductFormData(data as any);
      expect(prepared.seoTitle).toContain('Table en Bois');
    });

    it('should auto-generate SEO description from shortDescription', () => {
      const data = {
        name: 'Table en Bois',
        slug: 'table-en-bois',
        category: 'mobilier' as const,
        shortDescription: 'Belle table en bois massif',
        description: 'Description complète',
      };
      const prepared = prepareProductFormData(data as any);
      expect(prepared.seoDescription).toContain('Belle table');
    });

    it('should mark first image as primary if none marked', () => {
      const data = {
        name: 'Table',
        slug: 'table',
        category: 'mobilier' as const,
        shortDescription: 'Belle table',
        description: 'Description',
        images: [
          { url: 'http://example.com/1.jpg', alt: 'Image 1', isPrimary: false },
          { url: 'http://example.com/2.jpg', alt: 'Image 2', isPrimary: false },
        ],
      };
      const prepared = prepareProductFormData(data as any);
      expect(prepared.images[0].isPrimary).toBe(true);
      expect(prepared.images[1].isPrimary).toBe(false);
    });

    it('should not override existing slug', () => {
      const data = {
        name: 'Table en Bois',
        slug: 'custom-slug',
        category: 'mobilier' as const,
        shortDescription: 'Belle table',
        description: 'Description',
      };
      const prepared = prepareProductFormData(data as any);
      expect(prepared.slug).toBe('custom-slug');
    });
  });
});
