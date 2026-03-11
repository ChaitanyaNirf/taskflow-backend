const { Router } = require('express');
const { createTask, getTasks, getTaskById, updateTask, deleteTask, bulkCreateTasks } = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticateToken);

router.post('/', createTask);
router.post('/bulk', bulkCreateTasks);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
