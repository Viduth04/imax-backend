import express from 'express';
import { protect } from '../middleware/auth-middleware.js';
import {
  getTechnicians,
  getTechnician,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  getTechnicianStats,
  getMyAppointments,
  updateAppointmentStatus,
  getMyProfile,
  updatePassword
} from '../controllers/TechnicianController.js';

const router = express.Router();

// Admin routes
router.get('/stats', protect, getTechnicianStats);
router.get('/', protect, getTechnicians);
router.post('/', protect, createTechnician);
router.get('/:id', protect, getTechnician);
router.put('/:id', protect, updateTechnician);
router.delete('/:id', protect, deleteTechnician);

// Technician routes
router.get('/me/profile', protect,  getMyProfile);
router.get('/me/appointments', protect,  getMyAppointments);
router.put('/me/password', protect,  updatePassword);
router.put('/appointments/:appointmentId/status', protect,  updateAppointmentStatus);

export default router;