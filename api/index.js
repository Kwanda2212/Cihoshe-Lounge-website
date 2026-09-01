const { app } = require('../server.js');

// Initialize database connection
const { initDb } = require('../server.js');
initDb().catch(err => console.error('Failed to initialize database:', err));

module.exports = app;
