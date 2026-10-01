const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server-core');

// A port nobody uses yet
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

const health = async (port) => {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    return { status: res.status, body: await res.json() };
  } catch {
    return null;
  }
};

const waitFor = async (check, seconds) => {
  for (let i = 0; i < seconds * 4; i++) {
    const result = await check();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return null;
};

// The server started while the database is down (after a reboot, MongoDB
// may start later): it must connect once the database is there
describe('starting the server', () => {
  let server;
  let mongod;
  after(async () => {
    server?.kill();
    await mongod?.stop();
  });

  it('waits for the database instead of running without it', async () => {
    const [dbPort, apiPort] = [await freePort(), await freePort()];
    server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
      env: { ...process.env, MONGODB_URI: `mongodb://127.0.0.1:${dbPort}/stes-start`, PORT: String(apiPort), JWT_SECRET: 'test-jwt-secret', SERVE_FRONTEND: 'false' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    server.stdout.on('data', chunk => { output += chunk; });
    server.stderr.on('data', chunk => { output += chunk; });

    const down = await waitFor(async () => {
      const h = await health(apiPort);
      return h && h.status === 503 ? h : null;
    }, 20);
    assert.deepEqual([down.status, down.body.database], [503, 'disconnected']);

    // The database only starts once the server's first try has failed
    const failed = await waitFor(async () => output.includes('MongoDB connection error'), 45);
    assert.ok(failed, 'the first connection attempt never failed');
    mongod = await MongoMemoryServer.create({ instance: { port: dbPort } });
    const up = await waitFor(async () => {
      const h = await health(apiPort);
      return h && h.status === 200 ? h : null;
    }, 30);
    assert.ok(up, 'the server never connected to the database');
    assert.equal(up.body.database, 'connected');
  });
});
