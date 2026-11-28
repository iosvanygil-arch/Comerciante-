export function validateBackupPayload(data) {
  if (!data || data.app !== 'COMERCIANTE' || !Array.isArray(data.products) || !data.book || typeof data.book !== 'object') {
    throw new Error('Archivo no reconocido o incompleto.');
  }
  const requiredArrays = ['sales','invoices','receipts','purchases','expenses','cashMoves','journal','closings'];
  for (const key of requiredArrays) {
    if (!Array.isArray(data.book[key])) throw new Error('El respaldo está incompleto: falta la sección ' + key + '.');
  }
  if (!data.book.products || typeof data.book.products !== 'object' || Array.isArray(data.book.products)) {
    throw new Error('El respaldo no contiene un inventario contable válido.');
  }
  const ids = new Set(), skus = new Set();
  for (const p of data.products) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id.trim()
        || typeof p.sku !== 'string' || !p.sku.trim()) {
      throw new Error('Hay un artículo sin identificador o código interno válido.');
    }
    if (ids.has(p.id)) throw new Error('El respaldo contiene artículos con identificadores duplicados.');
    if (skus.has(p.sku)) throw new Error('El respaldo contiene códigos SKU duplicados: ' + p.sku);
    ids.add(p.id); skus.add(p.sku);
    if (!Number.isFinite(Number(p.stock)) || Number(p.stock) < 0
        || !Number.isFinite(Number(p.cost)) || Number(p.cost) < 0
        || !Number.isFinite(Number(p.price)) || Number(p.price) < 0) {
      throw new Error('Datos de existencia, costo o precio inválidos en ' + p.sku + '.');
    }
  }
  for (const sku of skus) {
    if (!Object.prototype.hasOwnProperty.call(data.book.products, sku)) {
      throw new Error('El inventario contable no coincide con el catálogo: ' + sku + '.');
    }
  }
  if (data.costSheets !== undefined && !Array.isArray(data.costSheets)) {
    throw new Error('La sección de fichas de costo está dañada.');
  }
  return true;
}
