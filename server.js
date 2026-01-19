import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Route Imports
import authRoutes from './routes/AuthRoutes.js';
import userRoutes from './routes/UserRoutes.js';
import adminRoutes from './routes/AdminRoutes.js';
import productRoutes from './routes/ProductRoutes.js';
import orderRoutes from './routes/OrderRoutes.js';
import paymentRoutes from './routes/payment-routes.js';
import appointmentRoutes from './routes/AppointmentRoutes.js';
import cartRoutes from './routes/CartRoutes.js';
import technicianRoutes from './routes/TechnicianRoutes.js';
import deletionRequestRoutes from './routes/deletionRequest.js';
import feedbackRoutes from './routes/feedback.js';
import supportTicketRoutes from './routes/supportTickets.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();

const app = express();

// 1. TRUST PROXY
// Required for Render/Vercel to handle secure cookies over HTTPS
app.set("trust proxy", 1);

// 2. DYNAMIC CORS SETUP
// Allow localhost during dev, and Vercel deployments for this project.
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    const isAllowedExplicit = allowedOrigins.includes(origin);
    const isVercelDeployment = /\.vercel\.app$/.test(origin);

    if (!isAllowedExplicit && !isVercelDeployment) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(cookieParser());

// 3. HEALTH CHECK ROUTE (Important for Render Deployment)
app.get('/', (req, res) => {
  res.status(200).send('IMAX API is running successfully');
});

// 4. API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/deletion-requests', deletionRequestRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/support-tickets', supportTicketRoutes);
// Serve static files from uploads directory
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  fs.mkdirSync(path.join(uploadsPath, 'products'), { recursive: true });
}

app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // Set CORS headers for images
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Test endpoint to verify static file serving
app.get('/test-uploads', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads', 'products');
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.json({ 
        success: false, 
        message: 'Cannot read uploads directory', 
        error: err.message,
        path: uploadsDir 
      });
    }
    res.json({ 
      success: true, 
      count: files.length, 
      files: files.slice(0, 10),
      uploadsPath: uploadsDir 
    });
  });
});

// 5. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  console.error(`[Error] ${statusCode}: ${message}`);
  res.status(statusCode).json({ 
    success: false, 
    statusCode, 
    message 
  });
});

// 6. DATABASE CONNECTION & SERVER START
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("FATAL ERROR: MONGODB_URI is not defined.");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
  });