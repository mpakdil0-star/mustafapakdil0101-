import { Router } from 'express';
import { getProducts, addProduct, deleteProduct, markAsSold } from '../controllers/marketplaceController';

const router = Router();

// GET /api/v1/marketplace - Get all second-hand products
router.get('/', getProducts);

// POST /api/v1/marketplace - Add a new product
router.post('/', addProduct);

// DELETE /api/v1/marketplace/:id - Delete a product
router.delete('/:id', deleteProduct);

// PUT /api/v1/marketplace/:id - Mark product as sold
router.put('/:id', markAsSold);

export default router;
