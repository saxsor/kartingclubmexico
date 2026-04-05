import './config/index.js'; // validate env first
import app from './app.js';
import { config } from './config/index.js';
import { prisma } from './lib/prisma.js';

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    const server = app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
    });

    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Shutting down...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Server stopped');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
