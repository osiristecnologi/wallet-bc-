import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { initializeRedis } from './config/redis';
import routes from './routes';
import { createRateLimiter } from './middleware/rateLimiter';

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', createRateLimiter());
app.set('trust proxy', 1);

app.use(`/api/${env.API_VERSION}`, routes);

app.get('/', (req: Request, res: Response) => {
  res.json({ name: env.APP_NAME, version: '1.0.0', api: `/api/${env.API_VERSION}` });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

const startServer = async () => {
  try {
    await initializeRedis();
    console.log('✓ Redis connected');

    app.listen(env.PORT, () => {
      console.log(`✓ Server running on port ${env.PORT}`);
      console.log(`✓ Environment: ${env.NODE_ENV}`);
      console.log(`✓ API: http://localhost:${env.PORT}/api/${env.API_VERSION}`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
