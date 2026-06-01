import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './utils/appError';
import authRoutes from './routes/auth.routes';
import walletRoutes from './routes/wallet.routes';
import transactionRoutes from './routes/transaction.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(apiLimiter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/auth', authRoutes);
app.use('/wallet', walletRoutes);
app.use('/transactions', transactionRoutes);
app.use('/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

if (env.NODE_ENV !== 'production') {
  app.listen(env.PORT, () => {
    console.log(`🚀 Server running at http://localhost:${env.PORT}`);
    console.log(`📖 Swagger Docs at http://localhost:${env.PORT}/api-docs`);
  });
} else {
  app.listen(env.PORT, () => {
    console.log(`✅ Production server listening on port ${env.PORT}`);
  });
}

export default app;
