const { prisma } = require('../lib/prisma');
const { sendTaskAssignmentEmail } = require('../services/emailService');

const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, projectId, assigneeId, tags } = req.body;
    const userId = req.user.id;

    if (!title || !description || !projectId) {
      return res.status(400).json({ error: 'Title, description, and project ID are required' });
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Forbidden: You must be a project member to create tasks' });
    }

    const tagConnectOrCreate = tags ? tags.map(t => ({
      tag: {
        connectOrCreate: {
          where: { name: t },
          create: { name: t }
        }
      }
    })) : [];

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'OPEN',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        creatorId: userId,
        assigneeId,
        tags: { create: tagConnectOrCreate }
      },
      include: { tags: { include: { tag: true } } }
    });

    if (assigneeId) {
      const newAssignee = await prisma.user.findUnique({ where: { id: assigneeId } });
      const assigner = await prisma.user.findUnique({ where: { id: userId } });
      if (newAssignee) {
        sendTaskAssignmentEmail(newAssignee.email, newAssignee.name, task.title, assigner?.name);
      }
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTasks = async (req, res) => {
  try {
    const { projectId, status, priority, search, page = '1', limit = '10', sort = 'createdAt', order = 'desc' } = req.query;
    const userId = req.user.id;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required as a query parameter' });
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: String(projectId), userId } }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const where = {
      projectId: String(projectId),
      deletedAt: null
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [String(sort)]: order },
        include: {
          assignee: { select: { name: true, email: true } },
          tags: { include: { tag: true } }
        }
      }),
      prisma.task.count({ where })
    ]);

    res.json({
      data: tasks,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { members: true } },
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: true } },
        comments: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
        files: true
      }
    });

    if (!task || task.deletedAt) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const isMember = task.project.members.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { project, ...taskData } = task;
    res.json(taskData);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, assigneeId, version } = req.body;
    const userId = req.user.id;

    if (version == null) {
      return res.status(400).json({ error: 'Version is required for Optimistic Concurrency Control' });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { project: { include: { members: true } } }
    });

    if (!existingTask || existingTask.deletedAt) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (existingTask.version !== version) {
      return res.status(409).json({ error: 'Conflict: Task has been modified by someone else. Please refresh and try again.' });
    }

    const membership = existingTask.project.members.find(m => m.userId === userId);
    if (!membership) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (membership.role !== 'ADMIN' && existingTask.creatorId !== userId && existingTask.assigneeId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only edit tasks you created or are assigned to' });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assigneeId,
        version: { increment: 1 }
      }
    });

    // Check if assignee changed and an email should be sent
    if (assigneeId && assigneeId !== existingTask.assigneeId) {
      const newAssignee = await prisma.user.findUnique({ where: { id: assigneeId } });
      const assigner = await prisma.user.findUnique({ where: { id: userId } });
      if (newAssignee) {
        sendTaskAssignmentEmail(newAssignee.email, newAssignee.name, updatedTask.title, assigner?.name);
      }
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { project: { include: { members: true } } }
    });

    if (!existingTask || existingTask.deletedAt) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const membership = existingTask.project.members.find(m => m.userId === userId);

    if (!membership || (membership.role !== 'ADMIN' && existingTask.creatorId !== userId)) {
      return res.status(403).json({ error: 'Forbidden: Only Admins or Task Creators can delete tasks' });
    }

    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Task soft deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const bulkCreateTasks = async (req, res) => {
  try {
    const { projectId, tasks } = req.body;
    const userId = req.user.id;

    if (!projectId || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'projectId and non-empty tasks array are required' });
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const createdTasks = await prisma.task.createMany({
      data: tasks.map(t => ({
        title: t.title,
        description: t.description,
        status: t.status || 'OPEN',
        priority: t.priority || 'MEDIUM',
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        projectId,
        creatorId: userId,
        assigneeId: t.assigneeId
      }))
    });

    res.status(201).json({ message: `Successfully created ${createdTasks.count} tasks` });
  } catch (error) {
    console.error('Error bulk creating tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask, bulkCreateTasks };
