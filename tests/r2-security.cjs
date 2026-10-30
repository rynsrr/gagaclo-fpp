const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load() {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('lib/r2.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require, Buffer, Date, process: { env: { R2_SECRET_ACCESS_KEY: 'test-only-secret' } } });
  return exports;
}
test('read capability cannot be reused for a different object or session', () => {
  const api = load();
  const signature = api.sign('read:one.jpg');
  assert.equal(api.validSignature('read:one.jpg', signature), true);
  assert.equal(api.validSignature('read:two.jpg', signature), false);
  assert.equal(api.validSignature('edit:one.jpg', signature), false);
  assert.equal(api.validSignature('read:one.jpg', 'bad'), false);
});
test('upload sessions reject missing, forged, and expired cookies', () => {
  const api = load();
  const expiry = String(Date.now() + 60000);
  assert.equal(api.validSession(`${expiry}.${api.sign(`edit:${expiry}`)}`), true);
  assert.equal(api.validSession(), false);
  assert.equal(api.validSession(`${expiry}.${'a'.repeat(64)}`), false);
  const expired = String(Date.now() - 1);
  assert.equal(api.validSession(`${expired}.${api.sign(`edit:${expired}`)}`), false);
});
