const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function moduleFor(file, context = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText;

  vm.runInNewContext(code, {
    exports,
    require: context.require || require,
    crypto: require('node:crypto'),
    Date,
    JSON,
    Object,
    Array,
    Set,
    String,
    Boolean,
    console,
    ...context
  });
  return exports;
}

const values = new Map();
const fakeLocalStorage = {
  getItem: (k) => values.get(k) || null,
  setItem: (k, v) => values.set(k, v),
  removeItem: (k) => values.delete(k)
};

const userService = moduleFor('lib/userService.ts', {
  window: { dispatchEvent: () => {} },
  CustomEvent: class {},
  localStorage: fakeLocalStorage
});

test('getUsers returns default users when empty', () => {
  const users = userService.getUsers();
  assert.equal(JSON.stringify(users), JSON.stringify(['royan', 'ryan', 'ami', 'hanami', 'cynara']));
});

test('addUser adds a new user and normalizes', () => {
  const res = userService.addUser('Budi');
  assert.ok(res.success);
  assert.ok(res.users.includes('budi'));
  assert.equal(userService.getUsers().includes('budi'), true);
});

test('addUser rejects duplicate user', () => {
  const res = userService.addUser('budi');
  assert.equal(res.success, false);
  assert.ok(res.error.includes('sudah terdaftar'));
});

test('removeUser deletes user', () => {
  const res = userService.removeUser('budi');
  assert.ok(res.success);
  assert.equal(userService.getUsers().includes('budi'), false);
});

test('removeUser prevents deleting last user', () => {
  const current = userService.getUsers();
  // Remove all except 1
  for (let i = 0; i < current.length - 1; i++) {
    userService.removeUser(current[i]);
  }
  const remaining = userService.getUsers();
  assert.equal(remaining.length, 1);
  const res = userService.removeUser(remaining[0]);
  assert.equal(res.success, false);
  assert.ok(res.error.includes('Minimal'));
});
