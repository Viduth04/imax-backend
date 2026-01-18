import express from 'express';
import { protect } from '../middleware/auth-middleware.js';
import {
  createPaymentIntent,
  confirmPaymentAndMarkPaid,
} from '../controllers/PaymentController.js';

const router = express.Router();

router.post('/create-intent', protect, createPaymentIntent);
router.post('/confirm', protect, confirmPaymentAndMarkPaid);

export default router; // ✅ default export
