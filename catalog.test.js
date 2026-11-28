import test from 'node:test';
import assert from 'node:assert/strict';
import { createProduct, upsertProduct, findProductByScan, nextInternalSku, validateImageFile, expiryStatus, consumeExpiryLots } from './catalog.js';

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


test('identifica lotes próximos a vencer y vencidos',()=>{
 const p=createProduct({id:'p1',name:'Leche',stock:8,perishable:true,expiryLots:[
  {batch:'L1',expiry:'2026-12-05',qty:3},{batch:'L2',expiry:'2026-10-01',qty:2},{batch:'L3',expiry:'2027-02-01',qty:3}
 ]});
 const s=expiryStatus(p,'2026-11-28',30);
 assert.equal(s.lots.find(x=>x.batch==='L1').status,'POR VENCER');
 assert.equal(s.lots.find(x=>x.batch==='L2').status,'VENCIDO');
 assert.equal(s.availableTracked,6);
 assert.equal(s.tracked,8);
});

test('consume primero lote vigente más próximo y bloquea lotes vencidos',()=>{
 const p=createProduct({id:'p2',name:'Yogur',stock:5,perishable:true,expiryLots:[
  {batch:'Vencido',expiry:'2026-11-01',qty:2},{batch:'Próximo',expiry:'2026-12-01',qty:2},{batch:'Posterior',expiry:'2027-01-01',qty:1}
 ]});
 consumeExpiryLots(p,2,'2026-11-28');
 assert.equal(p.expiryLots.find(x=>x.batch==='Vencido').qty,2);
 assert.equal(p.expiryLots.find(x=>x.batch==='Próximo').qty,0);
 assert.throws(()=>consumeExpiryLots(p,4,'2026-11-28'),/existencias vigentes suficientes/);
});

test('rechaza fechas de vencimiento inválidas',()=>{
 const p=createProduct({id:'p3',name:'Producto',stock:2,expiryLots:[{expiry:'fecha-mal',qty:2}]});
 assert.equal(p.expiryLots.length,0);
});
