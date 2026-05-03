import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { getUploadUrl, getDownloadUrl, getDownloadUrls, serveImage } from './files.controller.js';

const router = Router();

router.post('/upload-url', authMiddleware, getUploadUrl);
router.post('/download-url', authMiddleware, getDownloadUrl);
router.post('/download-urls', authMiddleware, getDownloadUrls);
router.get('/image/:encodedKey', serveImage);

export default router;
