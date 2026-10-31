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
    Map,
    Set,
    String,
    Number,
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

const storageScope = moduleFor('lib/storageScope.ts');
const purchaseEditing = moduleFor('lib/purchaseEditing.ts', {
  require: (name) => {
    if (name.includes('storageScope')) return storageScope;
    return {};
  },
  localStorage: fakeLocalStorage
});

const itemCatalog = moduleFor('lib/itemCatalogService.ts', {
  require: (name) => {
    if (name.includes('purchaseEditing')) return purchaseEditing;
    return {};
  },
  window: { dispatchEvent: () => {} },
  CustomEvent: class {},
  localStorage: fakeLocalStorage
});

test('findMasterItem retrieves existing item case-insensitively and returns old data', () => {
  const match = itemCatalog.findMasterItem('kain katun combed 30s hitam reaktif');
  assert.ok(match);
  assert.equal(match.satuan, 'Roll');
  assert.equal(match.hargaSatuan, 1250000);
  assert.equal(match.supplier, 'PT Surya Textile Jaya');
});

test('recordMasterItem adds new item if not exists', () => {
  const newItem = {
    namaBarang: 'Topi Bucket Gagaclo Canvas',
    satuan: 'Lusin',
    hargaSatuan: 450000,
    supplier: 'CV Topi Bandung'
  };
  itemCatalog.recordMasterItem(newItem);

  const found = itemCatalog.findMasterItem('topi bucket gagaclo canvas');
  assert.ok(found);
  assert.equal(found.satuan, 'Lusin');
  assert.equal(found.hargaSatuan, 450000);
  assert.equal(found.supplier, 'CV Topi Bandung');
});

test('recordMasterItem updates existing item with newer data', () => {
  itemCatalog.recordMasterItem({
    namaBarang: 'Kain Katun Combed 30s Hitam Reaktif',
    hargaSatuan: 1300000
  });

  const found = itemCatalog.findMasterItem('Kain Katun Combed 30s Hitam Reaktif');
  assert.ok(found);
  assert.equal(found.hargaSatuan, 1300000);
  assert.equal(found.satuan, 'Roll'); // preserved
});

test('syncMasterItemsFromPurchases extracts items from purchases', () => {
  const mockPurchases = [
    {
      id: 'fpp-1',
      items: [
        {
          id: 'i-1',
          namaBarang: 'Zipper Besi Antik',
          banyaknya: '100 Pcs',
          hargaSatuan: 8000,
          supplier: 'YKK Cikarang'
        }
      ]
    }
  ];

  itemCatalog.syncMasterItemsFromPurchases(mockPurchases);
  const found = itemCatalog.findMasterItem('zipper besi antik');
  assert.ok(found);
  assert.equal(found.satuan, 'Pcs');
  assert.equal(found.hargaSatuan, 8000);
  assert.equal(found.supplier, 'YKK Cikarang');
});
