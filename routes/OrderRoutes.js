import express from 'express';
import {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderAddress,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  getOrderStats
} from '../controllers/OrderController.js';
import { protect, admin } from '../middleware/auth-middleware.js';

const router = express.Router();

router.use(protect);

// User routes
router.post('/', createOrder);
router.get('/my-orders', getUserOrders);
router.get('/:id', getOrder);
router.put('/:id/address', updateOrderAddress);
router.put('/:id/cancel', cancelOrder);

// Admin routes
router.get('/', admin, getAllOrders);
router.get('/stats/overview', admin, getOrderStats);
router.put('/:id/status', admin, updateOrderStatus);
router.delete('/:id', admin, deleteOrder);

export default router;