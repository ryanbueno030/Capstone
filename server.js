require('dotenv').config();
const http = require('http');
const app = require('./index');

const server = http.createServer(app);


server.on('error', (error) => {
  console.error('Server error:', error);
});
