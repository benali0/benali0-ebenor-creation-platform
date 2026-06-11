import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { productsService } from '@/lib/api';
import EditProductPage from '../page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  productsService: {
    getById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('@/components/admin', () => ({
  Breadcrumb: () => <div>Breadcrumb</div>,
  ProductImageManager: ({ images, onChange }: any) => (
    <div>
      <div>ProductImageManager</div>
      {/* expose a simple input to simulate adding an image in tests if needed */}
      <input
        aria-label="mock-image-input"
        onChange={(e: any) => onChange([{ url: 'http://example.com/img.jpg', alt: 'img', isPrimary: true }])}
      />
    </div>
  ),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock window.alert
global.alert = jest.fn();

// Mock window.scrollTo
global.scrollTo = jest.fn();

describe('EditProductPage - Form Submission', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockProduct = {
    _id: 'test-product-id',
    name: 'Test Product',
    slug: 'test-product',
    category: 'mobilier',
    subcategory: 'Test Subcategory',
    shortDescription: 'Short description',
    description: 'Full description',
    images: [],
    specifications: { key1: 'value1' },
    materials: ['Wood', 'Metal'],
    finishes: ['Matte', 'Glossy'],
    tags: ['modern', 'luxury'],
    availability: 'in_stock',
    featured: true,
    dimensions: {
      length: 200,
      width: 100,
      height: 80,
      unit: 'cm',
    },
    price: {
      amount: 1500,
      currency: 'TND',
      unit: 'per unit',
    },
    seoTitle: 'SEO Title',
    seoDescription: 'SEO Description',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: 'test-product-id' });
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe('Successful Form Submission', () => {
    it('should submit form with valid data and redirect to products list', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      (productsService.update as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockProduct, name: 'Updated Product' },
      });

      render(<EditProductPage />);

      // Wait for product to load
      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      // Update product name
      const nameInput = screen.getByLabelText(/Nom du produit/i) as HTMLInputElement;
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Product');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      // Verify API was called with correct data
      await waitFor(() => {
        expect(productsService.update).toHaveBeenCalledWith(
          'test-product-id',
          expect.objectContaining({
            name: 'Updated Product',
            slug: 'test-product',
            category: 'mobilier',
          })
        );
      });

      // Verify success alert was shown
      expect(global.alert).toHaveBeenCalledWith('Produit mis à jour avec succès !');

      // Verify redirect to products list
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/products');
    });

    it('should show loading state during submission', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      (productsService.update as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByText(/Enregistrement en cours.../i)).toBeInTheDocument();
      });

      // Verify button is disabled during submission
      expect(submitButton).toBeDisabled();
    });

    it('should handle optional fields correctly when empty', async () => {
      const minimalProduct = {
        _id: 'test-product-id',
        name: 'Minimal Product',
        slug: 'minimal-product',
        category: 'mobilier',
        shortDescription: 'Short description',
        description: 'Full description',
        images: [],
        specifications: {},
        materials: [],
        finishes: [],
        tags: [],
        availability: 'made_to_order',
        featured: false,
      };

      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: minimalProduct,
      });

      (productsService.update as jest.Mock).mockResolvedValue({
        success: true,
        data: minimalProduct,
      });

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      // Verify form is populated with minimal data
      const nameInput = screen.getByLabelText(/Nom du produit/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Minimal Product');

      // Verify optional fields are empty or have default values
      const lengthInput = screen.getByLabelText(/Longueur/i) as HTMLInputElement;
      expect(lengthInput.value).toBe('');

      const priceInput = screen.getByLabelText(/Montant/i) as HTMLInputElement;
      expect(priceInput.value).toBe('');

      // SEO fields may be auto-generated, so we just verify they exist
      const seoTitleInput = screen.getByLabelText(/Titre SEO/i) as HTMLInputElement;
      expect(seoTitleInput).toBeInTheDocument();
    });

    it('should include dimensions only when at least one field is filled', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      (productsService.update as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(productsService.update).toHaveBeenCalledWith(
          'test-product-id',
          expect.objectContaining({
            dimensions: {
              length: 200,
              width: 100,
              height: 80,
              unit: 'cm',
            },
          })
        );
      });
    });

    it('should include price only when amount is provided', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      (productsService.update as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(productsService.update).toHaveBeenCalledWith(
          'test-product-id',
          expect.objectContaining({
            price: {
              amount: 1500,
              currency: 'TND',
              unit: 'per unit',
            },
          })
        );
      });
    });

    it('should trim string fields before submission', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      (productsService.update as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      // Update with spaces
      const nameInput = screen.getByLabelText(/Nom du produit/i) as HTMLInputElement;
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, '  Spaced Product  ');

      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(productsService.update).toHaveBeenCalledWith(
          'test-product-id',
          expect.objectContaining({
            name: 'Spaced Product',
          })
        );
      });
    });

    it('should default arrays to empty arrays', async () => {
      const productWithoutArrays = {
        ...mockProduct,
        materials: undefined,
        finishes: undefined,
        tags: undefined,
      };

      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: productWithoutArrays,
      });

      (productsService.update as jest.Mock).mockResolvedValue({
        success: true,
        data: productWithoutArrays,
      });

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(productsService.update).toHaveBeenCalledWith(
          'test-product-id',
          expect.objectContaining({
            materials: [],
            finishes: [],
            tags: [],
          })
        );
      });
    });

    it('should default specifications to empty object', async () => {
      const productWithoutSpecs = {
        ...mockProduct,
        specifications: undefined,
      };

      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: productWithoutSpecs,
      });

      (productsService.update as jest.Mock).mockResolvedValue({
        success: true,
        data: productWithoutSpecs,
      });

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(productsService.update).toHaveBeenCalledWith(
          'test-product-id',
          expect.objectContaining({
            specifications: {},
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when submission fails', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      (productsService.update as jest.Mock).mockRejectedValue(
        new Error('Failed to update product')
      );

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Erreur')).toBeInTheDocument();
        expect(screen.getByText('Failed to update product')).toBeInTheDocument();
      });

      // Verify no redirect occurred
      expect(mockRouter.push).not.toHaveBeenCalled();

      // Verify alert was not shown
      expect(global.alert).not.toHaveBeenCalled();
    });

    it('should scroll to top when error occurs', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      (productsService.update as jest.Mock).mockRejectedValue(
        new Error('Validation error')
      );

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(global.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      });
    });

    it('should handle API response error message', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      (productsService.update as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Slug already exists',
      });

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Slug already exists')).toBeInTheDocument();
      });
    });

    it('should clear error message on successful retry', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      // First call fails, second succeeds
      (productsService.update as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: mockProduct,
        });

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      
      // First submission - fails
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Second submission - succeeds
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      });

      expect(global.alert).toHaveBeenCalledWith('Produit mis à jour avec succès !');
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/products');
    });
  });

  describe('Complete Edit Workflow', () => {
    it('should complete full edit workflow: load → edit → submit → redirect', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      (productsService.update as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockProduct, name: 'Fully Updated Product' },
      });

      render(<EditProductPage />);

      // Step 1: Load product data
      await waitFor(() => {
        expect(productsService.getById).toHaveBeenCalledWith('test-product-id');
      });

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      // Step 2: Verify form is populated
      const nameInput = screen.getByLabelText(/Nom du produit/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Test Product');

      // Step 3: Edit product
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Fully Updated Product');

      // Step 4: Submit form
      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      // Step 5: Verify submission
      await waitFor(() => {
        expect(productsService.update).toHaveBeenCalledWith(
          'test-product-id',
          expect.objectContaining({
            name: 'Fully Updated Product',
          })
        );
      });

      // Step 6: Verify success notification
      expect(global.alert).toHaveBeenCalledWith('Produit mis à jour avec succès !');

      // Step 7: Verify redirect
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/products');
    });

    it('should handle complete workflow with all fields edited', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      (productsService.update as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      // Edit multiple fields
      const nameInput = screen.getByLabelText(/Nom du produit/i) as HTMLInputElement;
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Comprehensive Update');

      const shortDescInput = screen.getByLabelText(/Description courte/i) as HTMLTextAreaElement;
      await userEvent.clear(shortDescInput);
      await userEvent.type(shortDescInput, 'New short description');

      // Submit
      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(productsService.update).toHaveBeenCalledWith(
          'test-product-id',
          expect.objectContaining({
            name: 'Comprehensive Update',
            shortDescription: 'New short description',
          })
        );
      });

      expect(global.alert).toHaveBeenCalledWith('Produit mis à jour avec succès !');
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/products');
    });
  });

  describe('Data Preparation', () => {
    it('should prepare PUT request with correct structure', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      (productsService.update as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(productsService.update).toHaveBeenCalledWith(
          'test-product-id',
          expect.objectContaining({
            name: expect.any(String),
            slug: expect.any(String),
            category: expect.any(String),
            shortDescription: expect.any(String),
            description: expect.any(String),
            images: expect.any(Array),
            specifications: expect.any(Object),
            materials: expect.any(Array),
            finishes: expect.any(Array),
            tags: expect.any(Array),
            availability: expect.any(String),
            featured: expect.any(Boolean),
          })
        );
      });
    });

    it('should make PUT request to correct endpoint', async () => {
      (productsService.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      (productsService.update as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      render(<EditProductPage />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement du produit...')).not.toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Enregistrer les modifications/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(productsService.update).toHaveBeenCalledWith(
          'test-product-id',
          expect.any(Object)
        );
      });
    });
  });
});
