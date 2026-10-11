const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const dist = path.join(__dirname, 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(path.join(__dirname, 'public'), dist, { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'src/main.jsx')],
  outfile: path.join(dist, 'app.js'),
  bundle: true,
  minify: true,
  target: 'es2020',
  define: { 'process.env.NODE_ENV': '"production"' }
});
console.log('Đã biên dịch ứng dụng vào thư mục dist.');
