const assert = require('node:assert/strict');
const http = require('node:http');
const { app } = require('../server');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path,
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          server.close();
          resolve({ statusCode: res.statusCode, body, headers: res.headers });
        });
      });

      req.on('error', (error) => {
        server.close();
        reject(error);
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  });
}

(async () => {
  const invalid = await request('/api/admin/session');
  assert.equal(invalid.statusCode, 401, 'Unauthenticated sessions should be rejected.');

  const login = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'manager@cihoshelounge.co.za', password: 'cihoshe123' })
  });

  assert.equal(login.statusCode, 200, 'Manager login should succeed with the configured credentials.');
  const cookies = login.headers['set-cookie'] || [];
  assert.ok(cookies.some((cookie) => cookie.startsWith('manager_session=')), 'Session cookie should be set on successful login.');

  console.log('Manager login tests passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
