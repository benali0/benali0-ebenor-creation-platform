# 🚀 Quick Backend Reference - Ébenor Création

## ⚡ Start Backend

```bash
cd backend
bun run dev
```

**Expected Output:**
```
✅ Connexion MongoDB établie avec succès
🚀 Serveur ÉBENOR CRÉATION démarré sur le port 5000
```

---

## 🔗 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Health Check
```bash
GET /api/health
```

### Products (Public)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/products` | GET | Get all products (paginated) |
| `/products/featured` | GET | Get featured products |
| `/products/categories` | GET | Get categories |
| `/products/search?q=keyword` | GET | Search products |
| `/products/slug/:slug` | GET | Get by slug |
| `/products/:id` | GET | Get by ID |
| `/products/:id/similar` | GET | Get similar products |
| `/products/stats` | GET | Get statistics |

### Products (Admin - Requires Auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/products` | GET | Admin product list |
| `/admin/products` | POST | Create product |
| `/admin/products/:id` | PUT | Update product |
| `/admin/products/:id` | DELETE | Delete product |
| `/admin/products/bulk` | POST | Bulk operations |

---

## 🔍 Query Parameters

### Pagination
```
?page=1&limit=12
```

### Filters
```
?category=mobilier
?subcategory=table
?availability=in_stock
?featured=true
?minPrice=100
?maxPrice=1000
?materials=bois,metal
?tags=moderne,luxe
```

### Search
```
?search=cuisine
```

### Sort
```
?sort=-createdAt        // Newest first
?sort=price.amount      // Cheapest first
?sort=-price.amount     // Most expensive first
```

---

## 🧪 Test Commands

```bash
# Health check
curl http://localhost:5000/api/health

# Get all products
curl http://localhost:5000/api/products

# Get featured products
curl http://localhost:5000/api/products/featured

# Search
curl "http://localhost:5000/api/products/search?q=mobilier"

# Filter by category
curl "http://localhost:5000/api/products?category=mobilier"

# Pagination
curl "http://localhost:5000/api/products?page=2&limit=10"
```

---

## 🗄️ Database Models

### Product Schema
```typescript
{
  name: string;              // Required
  slug: string;              // Auto-generated, unique
  description: string;       // Required
  shortDescription: string;  // Required
  category: string;          // Required
  subcategory?: string;
  images: Array<{
    url: string;
    alt: string;
    isPrimary: boolean;
  }>;
  specifications: Record<string, string>;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit: 'cm' | 'm';
  };
  materials: string[];
  finishes: string[];
  price?: {
    amount: number;
    currency: string;        // Default: 'TND'
    unit?: string;
  };
  availability: 'in_stock' | 'made_to_order' | 'out_of_stock';
  featured: boolean;         // Default: false
  seoTitle?: string;
  seoDescription?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Check MongoDB:**
```bash
mongosh
```

**Check Port 5000:**
```bash
netstat -ano | findstr :5000
```

**Reinstall Dependencies:**
```bash
cd backend
bun install
```

### API Returns 404

**Verify server is running:**
```bash
curl http://localhost:5000/api/health
```

### Frontend Can't Connect

**Check frontend .env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 📦 Dependencies

- **Runtime**: Bun
- **Framework**: Express
- **Database**: MongoDB
- **Language**: TypeScript
- **Process Manager**: tsx watch

---

## 🔐 Environment Variables

**File**: `backend/.env`

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ebenor-creation
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

---

## 📊 Recent Fixes

- ✅ Created missing `productController.ts`
- ✅ Fixed all path aliases (`@/` → relative paths)
- ✅ 50+ files updated
- ✅ All endpoints operational

---

## 🎯 Quick Testing

```bash
# Test full workflow
curl http://localhost:5000/api/health && \
curl http://localhost:5000/api/products && \
curl http://localhost:5000/api/products/featured && \
echo "✅ All endpoints working!"
```

---

**Last Updated**: 2026-06-11  
**Status**: ✅ Operational
