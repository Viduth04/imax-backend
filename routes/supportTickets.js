import express from 'express';  
const router = express.Router();
import {
  createSupportTicket,
  getUserTickets,
  getAllTickets,
  updateTicket,
  deleteTicket,
  getTicketStats
}from '../controllers/supportTicketController.js';
import { protect } from '../middleware/auth-middleware.js';

// User routes
router.post('/', protect, createSupportTicket);
router.get('/my-tickets', protect, getUserTickets);

// Admin routes
router.get('/', protect, getAllTickets);
router.put('/:id', protect, updateTicket);
router.delete('/:id', protect, deleteTicket);
router.get('/stats', protect, getTicketStats);

export default router;