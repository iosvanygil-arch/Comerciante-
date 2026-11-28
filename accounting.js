// COMERCIANTE — núcleo contable offline. Importes en centavos enteros.
const cents = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error('Importe no válido');
  return Math.round((n + Number.EPSILON) * 100);
};
const amount = (c) => c / 100;
const sum = (xs, fn) => xs.reduce((a, x) => a + fn(x), 0);
const assertPositive = (n, label) => { if (!Number.isFinite(n) || n <= 0) throw new Error(`${label}: debe ser mayor que cero`); };
const moneyAccount = (method) => method === 'Efectivo' ? 'Caja' : 'Banco';

export function createBook({ openingCash = 0, date = '2026-01-01' } = {}) {
  const opening = cents(openingCash);
  if (opening < 0) throw new Error('El fondo inicial no puede ser negativo');
  const book = { date, products: {}, sales: [], receipts: [], purchases: [], expenses: [], cashMoves: [], journal: [], openingCash: opening, nextId: 1, closings: [] };
  if (opening > 0) entry(book, date, 'APERTURA-CAJA', [
    { account: 'Caja', debit: opening, credit: 0 }, { account: 'Capital inicial', debit: 0, credit: opening }
  ]);
  return book;
}
function id(book, prefix) { return `${prefix}-${String(book.nextId++).padStart(6, '0')}`; }
function entry(book, date, doc, lines) {
  const debit = sum(lines, x => x.debit), credit = sum(lines, x => x.credit);
  if (debit !== credit) throw new Error(`Asiento descuadrado: debe ${amount(debit)} / haber ${amount(credit)}`);
  if (!lines.length || lines.some(x => !x.account || !Number.isInteger(x.debit) || !Number.isInteger(x.credit) || x.debit < 0 || x.credit < 0 || (x.debit && x.credit))) throw new Error('Línea contable inválida');
  book.journal.push({ date, doc, lines: lines.map(x => ({ ...x })) });
}
function cashMove(book, date, doc, direction, value, method = 'Efectivo') {
  if (value === 0) return;
  book.cashMoves.push({ date, doc, direction, value, method, account: moneyAccount(method) });
}
export function addProduct(book, { sku, name, qty = 0, unitCost = 0, salePrice = 0 }) {
  if (!sku || book.products[sku]) throw new Error('Código vacío o duplicado');
  const q = Number(qty), cost = cents(unitCost), price = cents(salePrice);
  if (!Number.isFinite(q) || q < 0 || cost < 0 || price < 0) throw new Error('Existencia, costo o precio inválido');
  book.products[sku] = { sku, name: String(name || sku), qty: q, unitCost: cost, salePrice: price };
  const stockValue = Math.round(q * cost);
  if (stockValue > 0) entry(book, book.date, `APERTURA-${sku}`, [
    { account: 'Inventario', debit: stockValue, credit: 0 }, { account: 'Capital inicial', debit: 0, credit: stockValue }
  ]);
}
export function purchase(book, { date, sku, qty, unitCost, paid = 0, method = 'Efectivo' }) {
  const p = book.products[sku]; if (!p) throw new Error('Producto no encontrado');
  const q = Number(qty); assertPositive(q, 'Cantidad');
  const unit = cents(unitCost), total = Math.round(q * unit), paidC = cents(paid);
  if (!Number.isFinite(total) || unit < 0 || paidC < 0 || paidC > total) throw new Error('Importe de compra/pago inválido');
  const newQty = p.qty + q; if (!(newQty > 0)) throw new Error('Existencia resultante inválida');
  const oldValue = Math.round(p.qty * p.unitCost);
  const newCost = Math.round((oldValue + total) / newQty);
  const doc = id(book, 'COMPRA');
  entry(book, date, doc, [
    { account: 'Inventario', debit: total, credit: 0 },
    ...(paidC ? [{ account: moneyAccount(method), debit: 0, credit: paidC }] : []),
    ...(total > paidC ? [{ account: 'Proveedores', debit: 0, credit: total - paidC }] : [])
  ]);
  p.unitCost = newCost; p.qty = newQty;
  cashMove(book, date, doc, 'out', paidC, method);
  book.purchases.push({ id: doc, date, sku, qty: q, total, paid: paidC, payable: total - paidC, method });
  return doc;
}
export function sale(book, { date, sku, qty, total, received = 0, method = 'Efectivo' }) {
  const p = book.products[sku]; if (!p) throw new Error('Producto no encontrado');
  const q = Number(qty); assertPositive(q, 'Cantidad');
  if (q > p.qty) throw new Error('Existencia insuficiente');
  const totalC = cents(total), receivedC = cents(received);
  if (totalC <= 0 || receivedC < 0 || receivedC > totalC) throw new Error('Importe de venta/cobro inválido');
  const cogs = Math.round(q * p.unitCost), remaining = Math.round((p.qty - q) * 10000) / 10000;
  const doc = id(book, 'VENTA');
  entry(book, date, doc, [
    ...(receivedC ? [{ account: moneyAccount(method), debit: receivedC, credit: 0 }] : []),
    ...(totalC > receivedC ? [{ account: 'Clientes', debit: 0, credit: 0 }, { account: 'Clientes', debit: totalC - receivedC, credit: 0 }] : []),
    { account: 'Ventas', debit: 0, credit: totalC }
  ].filter(x => !(x.account === 'Clientes' && x.debit === 0 && x.credit === 0)));
  entry(book, date, `${doc}-COSTO`, [
    { account: 'Costo de ventas', debit: cogs, credit: 0 }, { account: 'Inventario', debit: 0, credit: cogs }
  ]);
  p.qty = remaining;
  cashMove(book, date, doc, 'in', receivedC, method);
  book.sales.push({ id: doc, date, sku, qty: q, total: totalC, initialReceived: receivedC, received: receivedC, receivable: totalC - receivedC, cogs, profit: totalC - cogs, method });
  return doc;
}
export function collectReceivable(book, { date, saleId, value, method = 'Efectivo' }) {
  const s = book.sales.find(x => x.id === saleId); if (!s) throw new Error('Venta no encontrada');
  const v = cents(value); if (v <= 0 || v > s.receivable) throw new Error('Cobro supera el saldo pendiente');
  const doc = id(book, 'COBRO');
  entry(book, date, doc, [{ account: moneyAccount(method), debit: v, credit: 0 }, { account: 'Clientes', debit: 0, credit: v }]);
  s.receivable -= v; s.received += v; book.receipts.push({ id: doc, date, saleId, value: v, method }); cashMove(book, date, doc, 'in', v, method); return doc;
}
export function expense(book, { date, description, value, paid = 0, method = 'Efectivo' }) {
  const v = cents(value), p = cents(paid); if (v <= 0 || p < 0 || p > v) throw new Error('Gasto/pago inválido');
  const doc = id(book, 'GASTO');
  entry(book, date, doc, [
    { account: `Gasto: ${description}`, debit: v, credit: 0 },
    ...(p ? [{ account: moneyAccount(method), debit: 0, credit: p }] : []),
    ...(v > p ? [{ account: 'Gastos por pagar', debit: 0, credit: v - p }] : [])
  ]);
  cashMove(book, date, doc, 'out', p, method);
  book.expenses.push({ id: doc, date, description, value: v, paid: p, payable: v - p, method }); return doc;
}
export function paySupplier(book, { date, purchaseId, value, method = 'Efectivo' }) {
  const p = book.purchases.find(x => x.id === purchaseId); if (!p) throw new Error('Compra no encontrada');
  const v = cents(value); if (v <= 0 || v > p.payable) throw new Error('Pago supera saldo del proveedor');
  const doc = id(book, 'PAGO-PROV');
  entry(book, date, doc, [{ account: 'Proveedores', debit: v, credit: 0 }, { account: moneyAccount(method), debit: 0, credit: v }]);
  p.payable -= v; p.paid += v; cashMove(book, date, doc, 'out', v, method); return doc;
}
export function payExpensePayable(book, { date, expenseId, value, method = 'Efectivo' }) {
  const e = book.expenses.find(x => x.id === expenseId); if (!e) throw new Error('Gasto no encontrado');
  const v = cents(value); if (v <= 0 || v > e.payable) throw new Error('Pago supera saldo del gasto');
  const doc = id(book, 'PAGO-GASTO');
  entry(book, date, doc, [{ account: 'Gastos por pagar', debit: v, credit: 0 }, { account: moneyAccount(method), debit: 0, credit: v }]);
  e.payable -= v; e.paid += v; cashMove(book, date, doc, 'out', v, method); return doc;
}
export function dailyIPV(book, date, openingCash = date === book.date ? amount(book.openingCash) : 0, countedCash = null) {
  const sales = book.sales.filter(x => x.date === date), purchases = book.purchases.filter(x => x.date === date), expenses = book.expenses.filter(x => x.date === date);
  const saleTotal = sum(sales, x => x.total), collectedOnSales = sum(sales, x => x.initialReceived ?? x.received), credit = sum(sales, x => x.total - (x.initialReceived ?? x.received));
  const laterCollections = sum((book.receipts || []).filter(x => x.date === date), x => x.value);
  const collections = collectedOnSales + laterCollections;
  const cogs = sum(sales, x => x.cogs), grossProfit = saleTotal - cogs;
  const purchaseTotal = sum(purchases, x => x.total), purchasePaid = sum(purchases, x => x.paid);
  const expenseTotal = sum(expenses, x => x.value), expensePaid = sum(expenses, x => x.paid);
  const cashOnly = book.cashMoves.filter(x => x.date === date && x.account === 'Caja');
  const cashIn = sum(cashOnly.filter(x => x.direction === 'in'), x => x.value), cashOut = sum(cashOnly.filter(x => x.direction === 'out'), x => x.value);
  const expected = cents(openingCash) + cashIn - cashOut;
  const difference = countedCash === null ? null : cents(countedCash) - expected;
  const salesByMethod = {}, collectionsByMethod = {}, cashOutByMethod = {};
  for (const s of sales) salesByMethod[s.method] = (salesByMethod[s.method] || 0) + (s.initialReceived ?? s.received);
  for (const m of book.cashMoves.filter(x => x.date === date)) {
    if (m.direction === 'in') collectionsByMethod[m.method] = (collectionsByMethod[m.method] || 0) + m.value;
    else cashOutByMethod[m.method] = (cashOutByMethod[m.method] || 0) + m.value;
  }
  return {
    date, salesCount: sales.length, unitsSold: sum(sales, x => x.qty), sales: amount(saleTotal), collections: amount(collections), creditSales: amount(credit),
    costOfSales: amount(cogs), grossProfit: amount(grossProfit), purchases: amount(purchaseTotal), purchasesPaid: amount(purchasePaid),
    expenses: amount(expenseTotal), expensesPaid: amount(expensePaid), openingCash: amount(cents(openingCash)), cashIn: amount(cashIn), cashOut: amount(cashOut),
    expectedCash: amount(expected), countedCash: countedCash === null ? null : Number(countedCash), difference: difference === null ? null : amount(difference),
    salesByMethod: Object.fromEntries(Object.entries(salesByMethod).map(([k,v]) => [k, amount(v)])),
    collectionsByMethod: Object.fromEntries(Object.entries(collectionsByMethod).map(([k,v]) => [k, amount(v)])),
    cashOutByMethod: Object.fromEntries(Object.entries(cashOutByMethod).map(([k,v]) => [k, amount(v)])),
    cashStatus: difference === null ? 'PENDIENTE' : difference === 0 ? 'CUADRADO' : difference < 0 ? 'FALTANTE' : 'SOBRANTE'
  };
}
export function saveDailyClosing(book, { date, openingCash, countedCash, notes = '' }) {
  const report = dailyIPV(book, date, openingCash, countedCash);
  const prior = book.closings.findIndex(x => x.date === date);
  const record = { ...report, notes: String(notes), savedAt: new Date().toISOString() };
  if (prior >= 0) book.closings[prior] = record; else book.closings.push(record);
  return record;
}
export function trialBalance(book) {
  const accounts = {};
  for (const j of book.journal) for (const l of j.lines) {
    accounts[l.account] ??= { debit: 0, credit: 0 };
    accounts[l.account].debit += l.debit; accounts[l.account].credit += l.credit;
  }
  const debit = sum(Object.values(accounts), x => x.debit), credit = sum(Object.values(accounts), x => x.credit);
  return { accounts: Object.fromEntries(Object.entries(accounts).map(([k,v]) => [k,{debit:amount(v.debit),credit:amount(v.credit)}])), totalDebit:amount(debit), totalCredit:amount(credit), difference:amount(debit-credit), balanced:debit===credit };
}
export function inventoryValuation(book) {
  const rows = Object.values(book.products).map(p => ({ sku:p.sku, name:p.name, qty:p.qty, unitCost:amount(p.unitCost), stockValue:amount(Math.round(p.qty*p.unitCost)), salePrice:amount(p.salePrice) }));
  return { rows, units:sum(rows,x=>x.qty), costValue:sum(rows,x=>x.stockValue), potentialSales:sum(rows,x=>x.qty*x.salePrice) };
}
export function receivables(book) { return book.sales.filter(x=>x.receivable>0).map(x=>({id:x.id,date:x.date,sku:x.sku,balance:amount(x.receivable)})); }
export function payables(book) { return [...book.purchases.filter(x=>x.payable>0).map(x=>({id:x.id,date:x.date,type:'Proveedor',balance:amount(x.payable)})), ...book.expenses.filter(x=>x.payable>0).map(x=>({id:x.id,date:x.date,type:'Gasto',balance:amount(x.payable)}))]; }
export { amount, cents };

// Ajuste explícito de existencias al editar inventario. Toda diferencia queda auditada.
export function updateProductMaster(book, { sku, name, salePrice, qty, unitCost, date = book.date }) {
  const p = book.products[sku];
  if (!p) return addProduct(book, { sku, name, qty, unitCost, salePrice });
  const nextQty = Number(qty), nextCost = cents(unitCost), oldValue = Math.round(p.qty * p.unitCost), newValue = Math.round(nextQty * nextCost);
  if (!Number.isFinite(nextQty) || nextQty < 0 || nextCost < 0) throw new Error('Existencia o costo inválido');
  const delta = newValue - oldValue;
  if (delta > 0) entry(book, date, `AJUSTE-INVENTARIO-${sku}`, [{account:'Inventario',debit:delta,credit:0},{account:'Ajustes de inventario',debit:0,credit:delta}]);
  if (delta < 0) entry(book, date, `AJUSTE-INVENTARIO-${sku}`, [{account:'Pérdida por ajuste de inventario',debit:-delta,credit:0},{account:'Inventario',debit:0,credit:-delta}]);
  p.name = String(name || sku); p.salePrice = cents(salePrice); p.qty = nextQty; p.unitCost = nextCost;
  return p;
}
