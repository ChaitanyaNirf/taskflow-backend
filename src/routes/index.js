const { Router } = require('express');
const authRoutes = require('./authRoutes');
const projectRoutes = require('./projectRoutes');
const taskRoutes = require('./taskRoutes');
const commentRoutes = require('./commentRoutes');
const fileRoutes = require('./fileRoutes');
const analyticsRoutes = require('./analyticsRoutes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/comments', commentRoutes);
router.use('/files', fileRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
