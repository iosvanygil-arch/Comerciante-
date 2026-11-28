import test from 'node:test';
import assert from 'node:assert/strict';
import { createBook, addProduct, purchase, sale, expense, collectReceivable, paySupplier, payExpensePayable, dailyIPV, trialBalance, inventoryValuation, saveDailyClosing, receivables, payables, saleCart } from './accounting.js';
const D='2026-11-13', D2='2026-11-14';

test('flujo positivo: compra pagada, venta efectivo, gasto y cierre cuadrado',()=>{
 const b=createBook({openingCash:20,date:D}); addProduct(b,{sku:'A',name:'Producto A'});
 purchase(b,{date:D,sku:'A',qty:10,unitCost:5,paid:15});
 sale(b,{date:D,sku:'A',qty:2,total:16,received:16});
 expense(b,{date:D,description:'Transporte',value:2,paid:2});
 const r=dailyIPV(b,D,20,19);
 assert.equal(r.sales,16); assert.equal(r.costOfSales,10); assert.equal(r.grossProfit,6);
 assert.equal(r.expectedCash,19); assert.equal(r.difference,0); assert.equal(r.cashStatus,'CUADRADO'); assert.equal(b.products.A.qty,8);
 assert.equal(trialBalance(b).balanced,true);
});

test('venta a crédito: el cobro en fecha posterior no altera IPV del día de venta',()=>{
 const b=createBook({openingCash:50,date:D}); addProduct(b,{sku:'B',name:'Producto B'}); purchase(b,{date:D,sku:'B',qty:4,unitCost:10,paid:0});
 const sid=sale(b,{date:D,sku:'B',qty:1,total:18,received:0,method:'Crédito'});
 assert.equal(dailyIPV(b,D,50).expectedCash,50);
 collectReceivable(b,{date:D2,saleId:sid,value:8});
 const saleDay=dailyIPV(b,D,50), collectionDay=dailyIPV(b,D2,0,8);
 assert.equal(saleDay.collections,0); assert.equal(saleDay.creditSales,18);
 assert.equal(collectionDay.sales,0); assert.equal(collectionDay.collections,8); assert.equal(collectionDay.expectedCash,8);
 assert.equal(trialBalance(b).balanced,true);
});

test('resultado negativo: gastos superiores al margen registran pérdida',()=>{
 const b=createBook({openingCash:100,date:D}); addProduct(b,{sku:'C',name:'Producto C'}); purchase(b,{date:D,sku:'C',qty:2,unitCost:20,paid:40});
 sale(b,{date:D,sku:'C',qty:1,total:25,received:25}); expense(b,{date:D,description:'Reparación',value:12,paid:12});
 const r=dailyIPV(b,D,100,73); assert.equal(r.grossProfit,5); assert.equal(r.expectedCash,73); assert.equal(r.difference,0);
 assert.equal(r.grossProfit-r.expenses,-7); assert.equal(trialBalance(b).balanced,true);
});

test('diferencia de caja negativa y positiva se etiqueta correctamente',()=>{
 const b=createBook({openingCash:30,date:D}); addProduct(b,{sku:'D',name:'Producto D'});
 assert.equal(dailyIPV(b,D,30,27).difference,-3); assert.equal(dailyIPV(b,D,30,27).cashStatus,'FALTANTE');
 assert.equal(dailyIPV(b,D,30,34).difference,4); assert.equal(dailyIPV(b,D,30,34).cashStatus,'SOBRANTE');
});

test('impide vender más de lo disponible y pagar más de la deuda',()=>{
 const b=createBook({date:D}); addProduct(b,{sku:'E',name:'Producto E'}); purchase(b,{date:D,sku:'E',qty:1,unitCost:10,paid:0});
 assert.throws(()=>sale(b,{date:D,sku:'E',qty:2,total:20,received:20}),/Existencia insuficiente/);
 const pid=b.purchases[0].id; assert.throws(()=>paySupplier(b,{date:D,purchaseId:pid,value:11}),/supera saldo/);
});

test('transferencias bancarias no modifican el efectivo físico de caja',()=>{
 const b=createBook({openingCash:100,date:D}); addProduct(b,{sku:'F',name:'Producto F'}); purchase(b,{date:D,sku:'F',qty:2,unitCost:10,paid:20,method:'Transferencia'});
 sale(b,{date:D,sku:'F',qty:1,total:30,received:30,method:'Transferencia'});
 const r=dailyIPV(b,D,100,100);
 assert.equal(r.expectedCash,100); assert.equal(r.cashIn,0); assert.equal(r.cashOut,0);
 assert.equal(r.collections,30); assert.equal(trialBalance(b).balanced,true);
});

test('saldo de proveedor y gasto pendiente se reducen al pagar',()=>{
 const b=createBook({openingCash:50,date:D}); addProduct(b,{sku:'G',name:'Producto G'});
 const pid=purchase(b,{date:D,sku:'G',qty:2,unitCost:10,paid:5});
 const eid= (expense(b,{date:D,description:'Luz',value:8,paid:3}), b.expenses[0].id);
 assert.equal(payables(b).length,2); paySupplier(b,{date:D2,purchaseId:pid,value:15}); payExpensePayable(b,{date:D2,expenseId:eid,value:5});
 assert.equal(payables(b).length,0); assert.equal(trialBalance(b).balanced,true);
});

test('IPV guarda cierre y valoración de inventario',()=>{
 const b=createBook({openingCash:25,date:D}); addProduct(b,{sku:'H',name:'Producto H',qty:3,unitCost:4,salePrice:7});
 const close=saveDailyClosing(b,{date:D,openingCash:25,countedCash:25,notes:'Prueba inicial'});
 assert.equal(close.cashStatus,'CUADRADO'); assert.equal(b.closings.length,1);
 const inv=inventoryValuation(b); assert.equal(inv.units,3); assert.equal(inv.costValue,12); assert.equal(inv.potentialSales,21);
});

test('saldos por cobrar visibles y bloquea cobro mayor al saldo',()=>{
 const b=createBook({date:D}); addProduct(b,{sku:'I',name:'Producto I'}); purchase(b,{date:D,sku:'I',qty:2,unitCost:3});
 const sid=sale(b,{date:D,sku:'I',qty:1,total:10,received:2}); assert.equal(receivables(b)[0].balance,8);
 assert.throws(()=>collectReceivable(b,{date:D,saleId:sid,value:9}),/supera el saldo/);
});

test('editar ficha de artículo registra ajuste de inventario y conserva equilibrio', async () => {
  const { updateProductMaster, trialBalance } = await import('./accounting.js');
  const b = createBook({date:'2026-11-13'});
  addProduct(b,{sku:'ESH-000001',name:'Producto',qty:10,unitCost:5,salePrice:8});
  updateProductMaster(b,{sku:'ESH-000001',name:'Producto actualizado',qty:8,unitCost:5,salePrice:9,date:'2026-11-13'});
  assert.equal(b.products['ESH-000001'].qty,8);
  assert.equal(b.products['ESH-000001'].salePrice,900);
  assert.equal(trialBalance(b).balanced,true);
  assert.ok(b.journal.some(x=>x.doc==='AJUSTE-INVENTARIO-ESH-000001'));
});

test('crear ficha nueva con inventario inicial genera asiento de apertura', async () => {
  const { updateProductMaster, trialBalance } = await import('./accounting.js');
  const b=createBook({date:'2026-11-13'});
  updateProductMaster(b,{sku:'ESH-000002',name:'Nuevo',qty:3,unitCost:4,salePrice:7});
  assert.equal(b.products['ESH-000002'].qty,3);
  assert.equal(trialBalance(b).balanced,true);
});

test('el cobro posterior no duplica la venta en el desglose del método original',()=>{
 const b=createBook({date:D}); addProduct(b,{sku:'J',name:'Producto J'});
 purchase(b,{date:D,sku:'J',qty:3,unitCost:2});
 const sid=sale(b,{date:D,sku:'J',qty:1,total:10,received:4,method:'Efectivo'});
 collectReceivable(b,{date:D2,saleId:sid,value:6,method:'Efectivo'});
 assert.equal(dailyIPV(b,D).salesByMethod.Efectivo,4);
 assert.equal(dailyIPV(b,D2).salesByMethod.Efectivo,undefined);
 assert.equal(dailyIPV(b,D2).collectionsByMethod.Efectivo,6);
});


test('factura de varios artículos comparte número y registra cliente y garantía',()=>{
 const b=createBook({date:D}); addProduct(b,{sku:'K',name:'Artículo K'}); addProduct(b,{sku:'L',name:'Artículo L'});
 purchase(b,{date:D,sku:'K',qty:3,unitCost:2}); purchase(b,{date:D,sku:'L',qty:2,unitCost:3});
 const invoice=saleCart(b,{date:D,lines:[{sku:'K',qty:1,unitPrice:5},{sku:'L',qty:1,unitPrice:7}],received:6,method:'Efectivo',customer:'Cliente prueba',warranty:'30 días'});
 assert.equal(invoice.total,1200); assert.equal(invoice.received,600); assert.equal(invoice.balance,600);
 assert.equal(b.invoices.length,1); assert.equal(b.invoices[0].customer,'Cliente prueba'); assert.equal(b.invoices[0].lines[0].name,'Artículo K');
 assert.ok(b.sales.every(s=>s.invoiceId===invoice.id));
 assert.equal(b.products.K.qty,2); assert.equal(b.products.L.qty,1);
 assert.equal(trialBalance(b).balanced,true);
});

test('factura con línea inválida no deja movimientos ni descuenta stock parcialmente',()=>{
 const b=createBook({date:D}); addProduct(b,{sku:'M',name:'Artículo M'});
 purchase(b,{date:D,sku:'M',qty:2,unitCost:4});
 const before=JSON.stringify(b);
 assert.throws(()=>saleCart(b,{date:D,lines:[{sku:'M',qty:1,unitPrice:8},{sku:'NO-EXISTE',qty:1,unitPrice:5}],received:13}),/Producto no encontrado/);
 assert.equal(JSON.stringify(b),before);
});
