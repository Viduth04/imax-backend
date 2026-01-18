import express from 'express';
import {
  checkAvailability,
  createAppointment,
  getUserAppointments,
  getAllAppointments,
  getAppointment,
  updateAppointment,
  assignTechnician,
  updateAppointmentStatus,
  cancelAppointment,
  deleteAppointment,
  getAppointmentStats
} from '../controllers/AppointmentController.js';
import { protect, admin } from '../middleware/auth-middleware.js';

const router = express.Router();

router.use(protect);

// User routes
router.get('/check-availability', checkAvailability);
router.post('/', createAppointment);
router.get('/my-appointments', getUserAppointments);
router.get('/:id', getAppointment);
router.put('/:id', updateAppointment);
router.put('/:id/cancel', cancelAppointment);

// Admin routes
router.get('/', admin, getAllAppointments);
router.get('/stats/overview', admin, getAppointmentStats);
router.put('/:id/assign-technician', admin, assignTechnician);
router.put('/:id/status', admin, updateAppointmentStatus);
router.delete('/:id', admin, deleteAppointment);

export default router;