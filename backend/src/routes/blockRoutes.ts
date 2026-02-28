import { Router } from 'express';
import { toggleBlockUser, getBlockedUsers } from '../controllers/blockController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes are protected
router.use(authenticate);

router.post('/', toggleBlockUser);
router.post('/toggle', toggleBlockUser); // alias kullanılan endpoint
router.get('/', getBlockedUsers);

export default router;
