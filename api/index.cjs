const path = require('path');
const serverPath = path.join(__dirname, '..', 'dist', 'server.cjs');
const app = require(serverPath);
module.exports = app.default || app;