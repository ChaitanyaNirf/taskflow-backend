const { prisma } = require('../lib/prisma');

const addComment = async (req, res) => {
  try {
    const { taskId, content } = req.body;
    const userId = req.user.id;

    if (!taskId || !content) {
      return res.status(400).json({ error: 'Task ID and content are required' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } }
    });

    if (!task || task.deletedAt) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const isMember = task.project.members.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const comment = await prisma.comment.create({
      data: { content, taskId, userId },
      include: { user: { select: { name: true } } }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCommentsForTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } }
    });

    if (!task || task.deletedAt) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const isMember = task.project.members.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const existingComment = await prisma.comment.findUnique({ where: { id } });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existingComment.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own comments' });
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: { user: { select: { name: true } } }
    });

    res.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingComment = await prisma.comment.findUnique({ where: { id } });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existingComment.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own comments' });
    }

    await prisma.comment.delete({ where: { id } });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { addComment, getCommentsForTask, updateComment, deleteComment };
