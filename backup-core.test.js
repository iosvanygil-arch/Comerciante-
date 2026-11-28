import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackupPayload } from './backup-core.js';

const valid = () => ({
  app:'COMERCIANTE',version:'0.3.5',
  products:[{id:'p1',sku:'SKU-1',stock:2,cost:5,price:8}],
  book:{products:{'SKU-1':{sku:'SKU-1'}},sales:[],invoices:[],receipts:[],purchases:[],expenses:[],cashMoves:[],journal:[],closings:[]},
  costSheets:[]
});

test('accepts a complete backup',()=>assert.equal(validateBackupPayload(valid()),true));
test('rejects a damaged accounting section',()=>{const x=valid();delete x.book.journal;assert.throws(()=>validateBackupPayload(x),/journal/);});
test('rejects duplicate product identifiers and SKUs',()=>{const x=valid();x.products.push({...x.products[0],id:'p2'});assert.throws(()=>validateBackupPayload(x),/SKU duplicados/);});
test('rejects a catalog not represented in the accounting inventory',()=>{const x=valid();x.products[0].sku='SKU-OTHER';assert.throws(()=>validateBackupPayload(x),/no coincide/);});
test('rejects negative stock and invalid costs',()=>{const x=valid();x.products[0].stock=-1;assert.throws(()=>validateBackupPayload(x),/inválidos/);});
