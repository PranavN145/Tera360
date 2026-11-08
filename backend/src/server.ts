import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';

async function bootstrap() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start HTTP server (Explicitly bind 0.0.0.0 for Render/container routing)
    const server = app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`\n==================================================`);
      console.log(`🚀 Terra360 Backend API running on port ${env.PORT}`);
      console.log(`📡 Environment: ${env.NODE_ENV}`);
      console.log(`🩺 Health check: http://localhost:${env.PORT}/health`);
      console.log(`🔍 Readiness check: http://localhost:${env.PORT}/ready`);
      console.log(`==================================================\n`);
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');
        await disconnectDB();
        console.log('Graceful shutdown complete. Exiting.');
        process.exit(0);
      });

      // Force close if graceful shutdown takes too long
      setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start Terra360 backend:', error);
    process.exit(1);
  }
}

bootstrap();

