import { Router } from 'express';
import { getProducts, addProduct } from '../controllers/marketplaceController';

const router = Router();

// GET /api/v1/marketplace - Get all second-hand products
router.get('/', getProducts);

// POST /api/v1/marketplace - Add a new product
router.post('/', addProduct);

export default router;
