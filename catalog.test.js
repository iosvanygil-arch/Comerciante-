import test from 'node:test';
import assert from 'node:assert/strict';
import { createProduct, upsertProduct, findProductByScan, nextInternalSku, validateImageFile } from './catalog.js';

test('alta de artículo con foto opcional y edición conserva el identificador', () => {
  let items = upsertProduct([], { id:'p1', name:'Arrocera EKO', sku:'ESH-000001', cost:20, price:30, stock:4 });
  items = upsertProduct(items, { ...items[0], name:'Arrocera EKO 1.5L', price:32 });
  assert.equal(items.length, 1);
  assert.equal(items[0].name, 'Arrocera EKO 1.5L');
  assert.equal(items[0].id, 'p1');
});

test('rechaza SKU o código de barras duplicado', () => {
  const items = [createProduct({ id:'1', name:'Producto A', sku:'ESH-1', barcode:'7501234567890' })];
  assert.throws(() => upsertProduct(items, { id:'2', name:'Producto B', sku:'ESH-2', barcode:'7501234567890' }), /ya pertenece/);
});

test('localiza un artículo por código de barras, SKU o contenido QR', () => {
  const items = [createProduct({ id:'1', name:'Producto A', sku:'ESH-1', barcode:'7501234567890', qrValue:'COMERCIANTE:1' })];
  assert.equal(findProductByScan(items, '7501234567890').id, '1');
  assert.equal(findProductByScan(items, 'ESH-1').id, '1');
  assert.equal(findProductByScan(items, 'COMERCIANTE:1').id, '1');
  assert.equal(findProductByScan(items, 'no-existe'), null);
});

test('genera SKU interno secuencial', () => {
  assert.equal(nextInternalSku([{sku:'ESH-000001'}, {sku:'ESH-000009'}]), 'ESH-000010');
});

test('valida formato y tamaño de imagen', () => {
  assert.equal(validateImageFile({type:'image/jpeg', size:100}), true);
  assert.throws(() => validateImageFile({type:'application/pdf', size:100}), /Formato/);
  assert.throws(() => validateImageFile({type:'image/png', size:9*1024*1024}), /8 MB/);
});
