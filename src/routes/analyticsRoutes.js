const { Router } = require('express');
const { getProjectOverview, getUserPerformanceMetrics, exportTasks, getTaskTrends } = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticateToken);

router.get('/:projectId/overview', getProjectOverview);
router.get('/:projectId/performance', getUserPerformanceMetrics);
router.get('/:projectId/export', exportTasks);
router.get('/:projectId/trends', getTaskTrends);

module.exports = router;
