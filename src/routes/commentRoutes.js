const { Router } = require('express');
const { addComment, getCommentsForTask, updateComment, deleteComment } = require('../controllers/commentController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticateToken);

router.post('/', addComment);
router.get('/task/:taskId', getCommentsForTask);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

module.exports = router;
