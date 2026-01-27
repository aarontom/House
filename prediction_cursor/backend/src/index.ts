import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDatabase } from './db/database';
import marketsRouter from './routes/markets';
import tradingRouter from './routes/trading';
import usersRouter from './routes/users';
import templatesRouter from './routes/templates';
import resolutionsRouter from './routes/resolutions';
import uploadsRouter from './routes/uploads';
import aiRouter from './routes/ai';
import { startResolutionScheduler } from './jobs/resolver';
import { startSimulator } from './jobs/simulator';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Initialize database
initializeDatabase();

// Routes
app.use('/api/markets', marketsRouter);
app.use('/api/trading', tradingRouter);
app.use('/api/users', usersRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/resolutions', resolutionsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/ai', aiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'InternalError',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🏠 House API running on http://localhost:${PORT}`);
  
  // Start the resolution scheduler
  startResolutionScheduler();
  
  // Start the market simulator for demo
  startSimulator();
});

export default app;
