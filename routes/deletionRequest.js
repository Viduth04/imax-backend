import express from 'express';
import { protect } from '../middleware/auth-middleware.js';
import {
  createDeletionRequest,
  getAllDeletionRequests,
  getMyDeletionRequest,
  approveDeletionRequest,
  rejectDeletionRequest,
  cancelDeletionRequest,
  getDeletionRequestStats
} from '../controllers/deletionRequestController.js';

const router = express.Router();

// Technician routes
router.post('/', protect,  createDeletionRequest);
router.get('/me', protect,  getMyDeletionRequest);
router.delete('/me/cancel', protect,  cancelDeletionRequest);

// Admin routes
router.get('/stats', protect,  getDeletionRequestStats);
router.get('/', protect,  getAllDeletionRequests);
router.put('/:id/approve', protect,  approveDeletionRequest);
router.put('/:id/reject', protect,  rejectDeletionRequest);

export default router;