const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const { createServer } = require('./server.cjs');

test('API trạng thái trả về JSON của ứng dụng', async (t) => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'hw-backend',
    user: 'CrouAn244'
  });
});
