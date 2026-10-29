const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function service({ storageFails = false, cloudFails = true, configured = false } = {}) {
  const values = new Map();
  const exports = {};
  const query = { upsert: async () => ({ error: cloudFails ? { message: 'offline' } : null }) };
  const code = ts.transpileModule(fs.readFileSync('lib/purchaseService.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, {
    exports, require: () => ({ isSupabaseConfigured: () => configured, supabase: { from: () => query } }),
    window: {}, localStorage: { getItem: k => values.get(k) || null, setItem: (k,v) => { if(storageFails) throw Error('quota'); values.set(k,v); } },
    console: { error() {}, warn() {} }, Intl, Date, Set,
  });
  return exports;
}
const doc = { id: 'test', nomor: 'ROYAN-0001', items: [], jenis: 'Rutin' };
test('quantity calculations clear stale amounts and handle decimals', () => {
  const { calculateItemAmount: calc } = service();
  assert.equal(calc('25 pcs', 200), 5000);
  assert.equal(calc('0 pcs', 200), 0);
  assert.equal(calc('', 200), 0);
  assert.equal(calc('25 pcs', 0), 0);
  assert.equal(calc('1,5 kg', 200), 300);
});
test('Jakarta date across UTC midnight boundary', () => {
  assert.equal(service().todayInJakarta(new Date('2026-10-29T18:00:00Z')), '2026-10-30');
});
test('save fails when both local and cloud storage fail', async () => {
  const result = await service({ storageFails: true, configured: true }).savePurchase(doc);
  assert.equal(result.success, false);
});
test('offline local save remains pending for cloud sync', async () => {
  const api = service({ configured: true });
  assert.equal((await api.savePurchase(doc)).success, true);
  assert.equal(api.getLocalPurchases()[0].pendingSync, true);
});
test('cloud save succeeds even if local cache is full', async () => {
  const result = await service({ configured: true, storageFails: true, cloudFails: false }).savePurchase(doc);
  assert.equal(result.success, true);
  assert.equal(result.fromCloud, true);
});
test('cloud success clears pending flag', async () => {
  const api = service({ configured: true, cloudFails: false });
  await api.savePurchase(doc);
  assert.equal(api.getLocalPurchases()[0].pendingSync, false);
});
