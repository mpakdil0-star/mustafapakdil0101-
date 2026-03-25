import { Router } from 'express';
import { getLegalDocuments, recordConsent, viewKvkkHtml, viewTermsHtml } from '../controllers/legalController';
import { authenticate } from '../middleware/auth';

const router = Router();
console.log('⚖️ Legal Routes Loaded');

// Public JSON route for App
router.get('/texts', getLegalDocuments);

// Public HTML routes for Google Play / Web
router.get('/kvkk', viewKvkkHtml);
router.get('/terms', viewTermsHtml);

// Optional auth (can be guest during registration, but safer to protect for updates)
router.post('/consent', (req, res, next) => {
    // If token exists, use protect, otherwise allow guest
    if (req.headers.authorization) {
        return authenticate(req, res, next);
    }
    next();
}, recordConsent);

export default router;
