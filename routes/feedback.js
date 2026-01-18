import express from 'express';
const router = express.Router();
import {
  createFeedback,
  getUserFeedback,
  getAllFeedback,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats
} from'../controllers/feedbackController.js';
import { protect } from '../middleware/auth-middleware.js';

// User routes
router.post('/', protect, createFeedback);
router.get('/my-feedback', protect, getUserFeedback);
router.put('/:id', protect, updateFeedback);
router.delete('/:id', protect, deleteFeedback);

// Admin routes
router.get('/', protect, getAllFeedback);
router.delete('/admin/:id', protect, deleteFeedback);
router.get('/stats', protect, getFeedbackStats);

export default router;