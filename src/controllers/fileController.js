const { prisma } = require('../lib/prisma');
const path = require('path');
const fs = require('fs');

const uploadFiles = async (req, res) => {
  try {
    const files = req.files;
    const { taskId } = req.body;
    const userId = req.user.id;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
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

    const createdFiles = await Promise.all(
      files.map((file) =>
        prisma.file.create({
          data: {
            fileName: file.originalname,
            filePath: file.filename,
            fileType: file.mimetype,
            fileSize: file.size,
            taskId,
            uploaderId: userId
          }
        })
      )
    );

    res.status(201).json(createdFiles);
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const fileMeta = await prisma.file.findUnique({
      where: { id },
      include: { task: { include: { project: { include: { members: true } } } } }
    });

    if (!fileMeta) {
      return res.status(404).json({ error: 'File not found' });
    }

    const isMember = fileMeta.task.project.members.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const absolutePath = path.join(process.cwd(), 'uploads', fileMeta.filePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(absolutePath, fileMeta.fileName);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const fileMeta = await prisma.file.findUnique({ where: { id } });

    if (!fileMeta) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (fileMeta.uploaderId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own uploads' });
    }

    const absolutePath = path.join(process.cwd(), 'uploads', fileMeta.filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await prisma.file.delete({ where: { id } });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { uploadFiles, downloadFile, deleteFile };
