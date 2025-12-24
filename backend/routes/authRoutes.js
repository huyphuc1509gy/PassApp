import express from 'express';
import { register, login , changePassword} from '../controllers/authController.js';
import { sendOtp, verifyOtpAndGetBackup, resetPassword } from '../controllers/recoveryController.js';
import { verifyToken  } from '../middleware/authMiddleware.js';
const router = express.Router();

// Authoriztion 
router.post('/register', register);
router.post('/login', login);


// Recovery
router.post('/recovery/send-otp', sendOtp);
router.post('/recovery/verify', verifyOtpAndGetBackup);
router.post('/recovery/reset', resetPassword);

router.post('/change-password', verifyToken, changePassword);
export default router;