const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const routes = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'application/javascript; charset=utf-8'],
  '/api/health': ['api/health.json', 'application/json; charset=utf-8']
};

function createServer() {
  return http.createServer((request, response) => {
    const route = routes[new URL(request.url, 'http://localhost').pathname];
    if (!route || !['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Không tìm thấy tài nguyên.');
      return;
    }
    fs.readFile(path.join(__dirname, 'dist', route[0]), (error, data) => {
      response.writeHead(error ? 500 : 200, { 'Content-Type': route[1] });
      response.end(request.method === 'HEAD' ? undefined : (error ? 'Chưa biên dịch ứng dụng.' : data));
    });
  });
}

if (require.main === module) {
  createServer().listen(Number(process.env.PORT || 3000), '0.0.0.0', () => {
    console.log('Ứng dụng đang lắng nghe trên cổng ' + (process.env.PORT || 3000));
  });
}

module.exports = { createServer };
