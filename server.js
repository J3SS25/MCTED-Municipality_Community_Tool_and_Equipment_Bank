const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { authMiddleware } = require('./server/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and parsers
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Global auth session context
app.use(authMiddleware);

// Static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Mount API Routes
app.use('/api/auth', require('./server/routes/authRoutes'));
app.use('/api/tools', require('./server/routes/toolRoutes'));
app.use('/api/reservations', require('./server/routes/reservationRoutes'));
app.use('/api/rentals', require('./server/routes/rentalRoutes'));
app.use('/api/payments', require('./server/routes/paymentRoutes'));
app.use('/api/maintenance', require('./server/routes/maintenanceRoutes'));
app.use('/api/feedback', require('./server/routes/feedbackRoutes'));
app.use('/api/notifications', require('./server/routes/notificationRoutes'));
app.use('/api/dashboard', require('./server/routes/dashboardRoutes'));

// Fallback to index.html for SPA routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  if (req.method === 'GET') {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` MUNICIPAL COMMUNITY TOOL & EQUIPMENT BANK (MCTEB) `);
    console.log(` Municipality of Basco, Batanes                     `);
    console.log(` Server running at: http://localhost:${PORT}        `);
    console.log(` Low-Bandwidth Optimized Mode: Enabled              `);
    console.log(`====================================================`);
  });
}

module.exports = app;
