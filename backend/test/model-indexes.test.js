const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// A field marked unique (or index: true) already has its index; declaring
// it again with schema.index() makes Mongoose warn at every start
describe('database indexes', () => {
  it('declares each index once', async () => {
    const warnings = [];
    const listen = (warning) => warnings.push(warning.message);
    process.on('warning', listen);
    const dir = path.join(__dirname, '..', 'models');
    for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.js'))) require(path.join(dir, file));
    // Node reports warnings on the next tick
    await new Promise(resolve => setImmediate(resolve));
    process.off('warning', listen);
    assert.deepEqual(warnings.filter(message => /Duplicate schema index/.test(message)), []);
  });
});
