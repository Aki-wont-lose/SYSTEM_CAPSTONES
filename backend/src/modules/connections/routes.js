// modules/connections/routes.js — any authenticated user can request, accept, and remove connections
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import { fetchConnections, searchConnections, createRequest, answerRequest, deleteConnection } from './controller.js';

const router = express.Router();

const ALL_ROLES = ['ADMIN', 'COORDINATOR', 'SUPERVISOR', 'STUDENT'];

router.get('/', verifyRole(ALL_ROLES), fetchConnections);
router.get('/search', verifyRole(ALL_ROLES), searchConnections);
router.post('/', verifyRole(ALL_ROLES), createRequest);
router.put('/:id/respond', verifyRole(ALL_ROLES), answerRequest);
router.delete('/:id', verifyRole(ALL_ROLES), deleteConnection);

export default router;
