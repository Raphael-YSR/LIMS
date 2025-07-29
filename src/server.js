// src/server.js
const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const routes = require('./routes'); // Import your routes

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// PostgreSQL database configuration
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Verify database connection
pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL database!');
        client.release();
    })
    .catch(err => {
        console.error('Error connecting to PostgreSQL database:', err.stack);
        process.exit(1); // Exit process if database connection fails
    });

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded bodies

// Session middleware configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey', // Use a strong secret from .env
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));


// Serve static files from specific subdirectories (e.g., docs, auth, fonts)
app.use('/docs', express.static(path.join(__dirname, '..', 'docs')));
app.use('/auth', express.static(path.join(__dirname, '..', 'auth')));
app.use('/fonts', express.static(path.join(__dirname, '..', 'fonts')));

// Pass the database pool to the routes - This handles all your authentication and protected routes
app.use('/', routes(pool));

// Error handling middleware (optional but good practice)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Access dashboard at http://localhost:${port}`);
});