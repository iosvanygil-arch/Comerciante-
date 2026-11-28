export const SYNC_SCHEMA_VERSION = 1;

const validRecord = r => r && typeof r === 'object'
  && typeof r.collection === 'string' && r.collection.length > 0
  && typeof r.id === 'string' && r.id.length > 0
  && Number.isFinite(Date.parse(r.updatedAt))
  && typeof r.deleted === 'boolean';

export function createSyncPackage({ deviceId, records, exportedAt = new Date().toISOString() }) {
  if (!deviceId || typeof deviceId !== 'string') throw new Error('Falta el identificador del dispositivo.');
  if (!Array.isArray(records) || !records.every(validRecord)) throw new Error('El paquete contiene registros inválidos.');
  const seen = new Set();
  for (const r of records) {
    const key = r.collection + ':' + r.id;
    if (seen.has(key)) throw new Error('Hay registros duplicados en el paquete: ' + key);
    seen.add(key);
  }
  return { app: 'COMERCIANTE', syncSchemaVersion: SYNC_SCHEMA_VERSION, deviceId, exportedAt, records };
}

export function validateSyncPackage(pkg) {
  if (!pkg || pkg.app !== 'COMERCIANTE' || pkg.syncSchemaVersion !== SYNC_SCHEMA_VERSION
      || typeof pkg.deviceId !== 'string' || !pkg.deviceId
      || !Array.isArray(pkg.records) || !pkg.records.every(validRecord)) {
    throw new Error('Respaldo de sincronización incompatible o dañado.');
  }
  const keys = pkg.records.map(r => r.collection + ':' + r.id);
  if (new Set(keys).size !== keys.length) throw new Error('El paquete contiene identificadores duplicados.');
  return true;
}

/**
 * Merge is non-destructive: newest timestamp wins; equal timestamps with
 * different content are reported as conflicts and left unresolved.
 * Deletions are represented by tombstones, never by silently dropping rows.
 */
export function mergeSyncPackages(localPackage, remotePackage) {
  validateSyncPackage(localPackage);
  validateSyncPackage(remotePackage);
  const map = new Map();
  for (const r of localPackage.records) map.set(r.collection + ':' + r.id, r);
  const conflicts = [], applied = [];
  for (const incoming of remotePackage.records) {
    const key = incoming.collection + ':' + incoming.id;
    const current = map.get(key);
    if (!current) { map.set(key, incoming); applied.push(key); continue; }
    const a = Date.parse(current.updatedAt), b = Date.parse(incoming.updatedAt);
    if (b > a) { map.set(key, incoming); applied.push(key); continue; }
    if (b === a && JSON.stringify(current) !== JSON.stringify(incoming)) conflicts.push({ key, local: current, remote: incoming });
  }
  return {
    package: createSyncPackage({
      deviceId: localPackage.deviceId,
      exportedAt: new Date().toISOString(),
      records: [...map.values()].sort((a,b) => (a.collection+':'+a.id).localeCompare(b.collection+':'+b.id))
    }),
    applied,
    conflicts,
    requiresReview: conflicts.length > 0
  };
}
