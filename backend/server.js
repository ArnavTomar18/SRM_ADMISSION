// server.js
const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

// ─── Middleware ────────────────────────────────────────────────
app.use(cors({
    origin: '*',   // In production, set this to your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Serve frontend static files ──────────────────────────────
// Adjust '../frontend' path if your folder structure differs
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Routes ───────────────────────────────────────────────────
const studentRoutes     = require('./routes/student');
const marksRoutes       = require('./routes/marks');
const counsellingRoutes = require('./routes/counselling');
const allocationRoutes  = require('./routes/allocation');
const paymentRoutes     = require('./routes/payment');

app.use('/api', studentRoutes);
app.use('/api', marksRoutes);
app.use('/api', counsellingRoutes);
app.use('/api', allocationRoutes);
app.use('/api', paymentRoutes);

// ─── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'SRM Admission API is running 🚀', timestamp: new Date() });
});

// ─── 404 for API routes ───────────────────────────────────────
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ─── Serve frontend index for all other routes (SPA support) ──
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// ─── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack);
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log(`║  SRM Admission API Running                ║`);
    console.log(`║  http://localhost:${PORT}                    ║`);
    console.log('╚══════════════════════════════════════════╝\n');
    console.log('Available API Endpoints:');
    console.log('  POST  /api/register');
    console.log('  POST  /api/login');
    console.log('  GET   /api/student/:id');
    console.log('  POST  /api/addExam');
    console.log('  POST  /api/addMarks');
    console.log('  GET   /api/campuses');
    console.log('  GET   /api/programs');
    console.log('  POST  /api/counselling');
    console.log('  GET   /api/counselling/:std_id');
    console.log('  POST  /api/allocateSeat');
    console.log('  GET   /api/allocation/:std_id');
    console.log('  POST  /api/payment');
    console.log('  GET   /api/payment/:std_id\n');
});