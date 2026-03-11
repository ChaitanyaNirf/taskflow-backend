const { prisma } = require('../lib/prisma');

const getProjectOverview = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [statusCountsList, priorityCountsList, totalTasks] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId, deletedAt: null },
        _count: { _all: true }
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: { projectId, deletedAt: null },
        _count: { _all: true }
      }),
      prisma.task.count({ where: { projectId, deletedAt: null } })
    ]);

    const statusCounts = statusCountsList.reduce((acc, curr) => {
      acc[curr.status] = curr._count._all;
      return acc;
    }, {});

    const priorityCounts = priorityCountsList.reduce((acc, curr) => {
      acc[curr.priority] = curr._count._all;
      return acc;
    }, {});

    res.json({ totalTasks, statusCounts, priorityCounts });
  } catch (error) {
    console.error('Error fetching project overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserPerformanceMetrics = async (req, res) => {
  try {
    const { projectId } = req.params;
    const targetUserId = req.query.userId ? String(req.query.userId) : req.user.id;
    const currentUserId = req.user.id;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: currentUserId } }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [assignedTasks, completedTasks, delayedTasks] = await Promise.all([
      prisma.task.count({ where: { projectId, assigneeId: targetUserId, deletedAt: null } }),
      prisma.task.count({ where: { projectId, assigneeId: targetUserId, status: 'CLOSED', deletedAt: null } }),
      prisma.task.count({
        where: {
          projectId,
          assigneeId: targetUserId,
          status: { notIn: ['RESOLVED', 'CLOSED'] },
          dueDate: { lt: new Date() },
          deletedAt: null
        }
      })
    ]);

    res.json({
      assignedTasks,
      completedTasks,
      delayedTasks,
      completionRate: assignedTasks === 0 ? 0 : Math.round((completedTasks / assignedTasks) * 100)
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const exportTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: {
        assignee: { select: { name: true, email: true } },
        creator: { select: { name: true, email: true } },
        tags: { include: { tag: true } }
      }
    });

    const headers = ['ID', 'Title', 'Status', 'Priority', 'Due Date', 'Assignee', 'Creator', 'Created At'];
    const csvRows = tasks.map(t => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.dueDate ? t.dueDate.toISOString() : 'None',
      t.assignee ? `"${t.assignee.name} (${t.assignee.email})"` : 'Unassigned',
      `"${t.creator.name} (${t.creator.email})"`,
      t.createdAt.toISOString()
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=project-${projectId}-tasks.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTaskTrends = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get tasks from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        createdAt: { gte: thirtyDaysAgo },
        deletedAt: null
      },
      select: { createdAt: true, status: true, updatedAt: true }
    });

    const trends = {};

    tasks.forEach(t => {
      const createdDate = t.createdAt.toISOString().split('T')[0];
      if (!trends[createdDate]) trends[createdDate] = { created: 0, resolved: 0 };
      trends[createdDate].created++;

      if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        const resolvedDate = t.updatedAt.toISOString().split('T')[0];
        if (!trends[resolvedDate]) trends[resolvedDate] = { created: 0, resolved: 0 };
        trends[resolvedDate].resolved++;
      }
    });

    res.json(trends);
  } catch (error) {
    console.error('Error fetching task trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getProjectOverview, getUserPerformanceMetrics, exportTasks, getTaskTrends };
