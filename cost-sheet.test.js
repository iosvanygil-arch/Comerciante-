import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCostSheet, createCostSheet } from './cost-sheet.js';

test('calcula costo unitario y precio con margen sobre venta', () => {
  const r = calculateCostSheet({purchaseTotal:1000,transport:50,handling:20,packaging:30,otherCosts:0,yieldUnits:10,targetMargin:25});
  assert.equal(r.totalCost,1100);
  assert.equal(r.unitCost,110);
  assert.equal(r.salePrice,146.67);
  assert.ok(r.actualMargin >= 25);
  assert.equal(r.unitProfit,36.67);
});

test('margen cero recomienda precio igual al costo unitario', () => {
  const r = calculateCostSheet({purchaseTotal:80,yieldUnits:4,targetMargin:0});
  assert.equal(r.unitCost,20);
  assert.equal(r.salePrice,20);
  assert.equal(r.unitProfit,0);
});

test('rechaza rendimiento cero, costos negativos y margen de 100%', () => {
  assert.throws(() => calculateCostSheet({purchaseTotal:10,yieldUnits:0,targetMargin:20}), /mayor que cero/);
  assert.throws(() => calculateCostSheet({purchaseTotal:-1,yieldUnits:1,targetMargin:20}), /no negativos/);
  assert.throws(() => calculateCostSheet({purchaseTotal:10,yieldUnits:1,targetMargin:100}), /menor que 100/);
});

test('guarda ficha con nombre y resultados sin requerir libro contable', () => {
  const f = createCostSheet({name:'Jugo natural',purchaseTotal:60,yieldUnits:6,targetMargin:30},'2026-11-27T12:00:00.000Z');
  assert.equal(f.name,'Jugo natural');
  assert.equal(f.unitCost,10);
  assert.equal(f.createdAt,'2026-11-27T12:00:00.000Z');
  assert.equal('book' in f,false);
});
