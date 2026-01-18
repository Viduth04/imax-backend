import express from 'express';
import { 
  updateProfile, 
  updatePassword, 
  deleteAccount,
  searchUsers 
} from '../controllers/UserController.js';
import { protect } from '../middleware/auth-middleware.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.put('/profile', updateProfile);
router.put('/password', updatePassword);
router.delete('/account', deleteAccount);
router.get('/search', searchUsers);

export default router;