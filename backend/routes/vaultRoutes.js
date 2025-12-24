import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getData, updateData } from '../controllers/dataController.js';

const router = express.Router();

router.use(verifyToken);
router.get('/', getData);   // GET /api/vault
router.put('/', updateData); // PUT /api/vault

export default router;