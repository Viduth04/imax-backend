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
// ... import your other routes here

dotenv.config();

const app = express();

// 1. TRUST PROXY (Required for Render/Vercel to pass cookies)
app.set("trust proxy", 1);

// 2. CORRECT CORS SETUP
// Middleware in server.js
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://imax-frontend-hygq92yyo-jmadheepa-1636s-projects.vercel.app',
    /\.vercel\.app$/ // This allows ANY vercel.app subdomain to connect
  ],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
// ... attach your other routes

// Error handling
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({ success: false, statusCode, message });
});

// 3. CORRECT PORT FOR RENDER
const PORT = process.env.PORT || 10000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => console.error('MongoDB connection error:', error));