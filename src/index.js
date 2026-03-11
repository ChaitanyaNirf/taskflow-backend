require('dotenv').config();
const app = require('./app');
const { prisma } = require('./lib/prisma');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('📦 Connected to PostgreSQL database via Prisma');

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start the server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();
