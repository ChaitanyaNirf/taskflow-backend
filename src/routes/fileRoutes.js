const { Router } = require('express');
const { uploadFiles, downloadFile, deleteFile } = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = Router();
router.use(authenticateToken);

router.post('/upload', upload.array('files', 5), uploadFiles);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);

module.exports = router;
