import express from 'express';
import { 
  getAllAdmins, 
  createAdmin, 
  updateAdmin, 
  deleteAdmin,
  getDashboardStats 
} from '../controllers/AdminControllers.js';
import { protect, adminOnly } from '../middleware/auth-middleware.js';

const router = express.Router();

router.use(protect, adminOnly); // All routes require admin authentication

router.get('/admins', getAllAdmins);
router.post('/admins', createAdmin);
router.put('/admins/:id', updateAdmin);
router.delete('/admins/:id', deleteAdmin);
router.get('/stats', getDashboardStats);

export default router;