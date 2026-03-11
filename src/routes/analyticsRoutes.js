const { Router } = require('express');
const { getProjectOverview, getUserPerformanceMetrics, exportTasks } = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticateToken);

router.get('/:projectId/overview', getProjectOverview);
router.get('/:projectId/performance', getUserPerformanceMetrics);
router.get('/:projectId/export', exportTasks);

module.exports = router;
