// modules/ojtHours/routes.js - ADMIN only: manage required OJT hours per course
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import { fetchOjtHours, setOjtHours } from './controller.js';

const router = express.Router();

router.get('/', verifyRole(['ADMIN']), fetchOjtHours);
router.put('/:course', verifyRole(['ADMIN']), setOjtHours);

export default router;
