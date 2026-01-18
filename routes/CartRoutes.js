import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount
} from '../controllers/CartController.js';
import { protect } from '../middleware/auth-middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getCart);
router.get('/count', getCartCount);
router.post('/', addToCart);
router.put('/', updateCartItem);
router.delete('/:productId', removeFromCart);
router.delete('/', clearCart);

export default router;