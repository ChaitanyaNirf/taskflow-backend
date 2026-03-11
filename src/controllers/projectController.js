const { prisma } = require('../lib/prisma');

const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        creatorId: userId,
        members: {
          create: {
            userId,
            role: 'ADMIN'
          }
        }
      },
      include: { members: true }
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId } }
      },
      include: {
        _count: { select: { tasks: true, members: true } }
      }
    });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        },
        tasks: {
          where: { deletedAt: null },
          include: {
            assignee: { select: { name: true } },
            tags: { include: { tag: true } }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const isMember = project.members.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this project' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project by id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } }
    });

    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only Project Admins can edit the project' });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: { name, description }
    });

    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } }
    });

    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only Project Admins can delete the project' });
    }

    await prisma.project.delete({ where: { id } });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addProjectMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, role } = req.body;
    const adminId = req.user.id;

    const adminMembership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: adminId } }
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only Admins can add members' });
    }

    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) {
      return res.status(404).json({ error: 'User with that email not found' });
    }

    const membership = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: userToAdd.id } },
      update: { role: role || 'MEMBER' },
      create: { projectId, userId: userToAdd.id, role: role || 'MEMBER' }
    });

    res.json(membership);
  } catch (error) {
    console.error('Error adding project member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const removeProjectMember = async (req, res) => {
  try {
    const { projectId, userId } = req.params;
    const adminId = req.user.id;

    const adminMembership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: adminId } }
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only Admins can remove members' });
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing project member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember
};
