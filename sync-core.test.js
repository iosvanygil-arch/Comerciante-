import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyncPackage, validateSyncPackage, mergeSyncPackages } from './sync-core.js';

const row = (id, updatedAt, value, deleted=false) => ({ collection:'products', id, updatedAt, deleted, data:{ value } });
const pack = (deviceId, records) => createSyncPackage({deviceId,records,exportedAt:'2026-01-01T00:00:00.000Z'});

test('creates and validates a versioned package', () => {
  const p=pack('phone',[row('p1','2026-01-01T00:00:00Z','A')]);
  assert.equal(validateSyncPackage(p),true);
  assert.equal(p.syncSchemaVersion,1);
});
test('rejects duplicate identifiers and invalid timestamps', () => {
  assert.throws(()=>pack('phone',[row('p1','2026-01-01T00:00:00Z','A'),row('p1','2026-01-02T00:00:00Z','B')]),/duplicados/);
  assert.throws(()=>pack('phone',[row('p2','fecha','A')]),/inválidos/);
});
test('newer remote revision wins', () => {
  const result=mergeSyncPackages(pack('phone',[row('p1','2026-01-01T00:00:00Z','A')]),pack('pc',[row('p1','2026-01-02T00:00:00Z','B')]));
  assert.equal(result.package.records[0].data.value,'B');
  assert.deepEqual(result.applied,['products:p1']);
});
test('same-time divergent edits are preserved as conflict', () => {
  const result=mergeSyncPackages(pack('phone',[row('p1','2026-01-01T00:00:00Z','A')]),pack('pc',[row('p1','2026-01-01T00:00:00Z','B')]));
  assert.equal(result.requiresReview,true);
  assert.equal(result.package.records[0].data.value,'A');
  assert.equal(result.conflicts.length,1);
});
test('tombstones propagate as explicit records', () => {
  const deleted=row('p1','2026-01-03T00:00:00Z',null,true);
  const result=mergeSyncPackages(pack('phone',[row('p1','2026-01-01T00:00:00Z','A')]),pack('pc',[deleted]));
  assert.equal(result.package.records[0].deleted,true);
});
