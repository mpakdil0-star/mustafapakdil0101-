import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getProducts, addProduct, deleteProduct, markAsSold } from '../controllers/marketplaceController';

const router = Router();

// GET /api/v1/marketplace - Get all second-hand products (public browsing)
router.get('/', getProducts);

// POST /api/v1/marketplace - Add a new product (authenticated)
router.post('/', authenticate, addProduct);

// DELETE /api/v1/marketplace/:id - Delete a product (authenticated & owner check)
router.delete('/:id', authenticate, deleteProduct);

// PUT /api/v1/marketplace/:id - Mark product as sold (authenticated)
router.put('/:id', authenticate, markAsSold);

export default router;
