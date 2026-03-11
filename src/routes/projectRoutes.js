const { Router } = require('express');
const {
  createProject, getProjects, getProjectById, updateProject, deleteProject,
  addProjectMember, removeProjectMember
} = require('../controllers/projectController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticateToken);

router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

router.post('/:projectId/members', addProjectMember);
router.delete('/:projectId/members/:userId', removeProjectMember);

module.exports = router;
