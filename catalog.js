// Catálogo de productos local-first. La imagen se conserva como Blob/DataURL en la base local.
const clean = (v) => String(v ?? '').trim();

export function createProduct({ id, name, sku = '', barcode = '', qrValue = '', image = null, description = '', category = '', unit = 'unidad', cost = 0, price = 0, stock = 0, minStock = 0, perishable = false, expiryLots = [] }) {
  const product = {
    id: clean(id) || globalThis.crypto?.randomUUID?.() || 'prod-' + Date.now(),
    name: clean(name), sku: clean(sku), barcode: clean(barcode), qrValue: clean(qrValue),
    image, description: clean(description), category: clean(category), unit: clean(unit) || 'unidad',
    cost: Number(cost), price: Number(price), stock: Number(stock), minStock: Number(minStock),
    perishable: Boolean(perishable), expiryLots: Array.isArray(expiryLots) ? expiryLots.map(l => ({ batch: clean(l.batch), expiry: clean(l.expiry), qty: Number(l.qty) })).filter(l => /^\d{4}-\d{2}-\d{2}$/.test(l.expiry) && Number.isFinite(Date.parse(l.expiry + 'T00:00:00Z')) && Number.isFinite(l.qty) && l.qty > 0) : [],
    updatedAt: new Date().toISOString()
  };
  if (!product.name) throw new Error('El nombre del artículo es obligatorio');
  if (![product.cost, product.price, product.stock, product.minStock, ...product.expiryLots.map(l => l.qty)].every(Number.isFinite)) throw new Error('Hay valores numéricos inválidos');
  if (product.cost < 0 || product.price < 0 || product.stock < 0 || product.minStock < 0) throw new Error('Costo, precio y existencias no pueden ser negativos');
  if (product.image && !(product.image instanceof Blob) && typeof product.image !== 'string') throw new Error('La imagen debe ser un archivo o una referencia local');
  return product;
}

export function upsertProduct(products, input) {
  const next = createProduct(input);
  const duplicate = products.find(p => p.id !== next.id && ((next.sku && p.sku === next.sku) || (next.barcode && p.barcode === next.barcode)));
  if (duplicate) throw new Error('El SKU o código de barras ya pertenece a otro artículo');
  const index = products.findIndex(p => p.id === next.id);
  const result = products.slice();
  if (index < 0) result.push(next); else result[index] = next;
  return result;
}

export function findProductByScan(products, value) {
  const code = clean(value);
  if (!code) return null;
  return products.find(p => p.barcode === code || p.sku === code || p.qrValue === code) ?? null;
}

export function nextInternalSku(products, prefix = 'ESH') {
  const nums = products.map(p => new RegExp('^' + prefix + '-(\\d+)$').exec(p.sku || '')).filter(Boolean).map(m => Number(m[1]));
  return prefix + '-' + String(Math.max(0, ...nums) + 1).padStart(6, '0');
}

export function validateImageFile(file) {
  if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('Formato de imagen no admitido. Usa JPG, PNG, WEBP o GIF');
  if (file.size > 8 * 1024 * 1024) throw new Error('La imagen supera el límite de 8 MB');
  return true;
}

// Escaneo desde cámara: requiere permiso del usuario y navegador compatible con BarcodeDetector.
export async function startCameraScanner(video, onCode, onError = () => {}) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara no está disponible en este dispositivo/navegador');
  if (!('BarcodeDetector' in globalThis)) throw new Error('Este navegador no ofrece lector nativo. Puedes usar un lector USB/Bluetooth o introducir el código manualmente.');
  const supported = await BarcodeDetector.getSupportedFormats();
  const wanted = ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'codabar'];
  const detector = new BarcodeDetector({ formats: wanted.filter(x => supported.includes(x)) });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  video.srcObject = stream;
  await video.play();
  let stopped = false;
  const scan = async () => {
    if (stopped) return;
    try {
      const hits = await detector.detect(video);
      if (hits.length) { onCode(hits[0].rawValue, hits[0].format); stop(); return; }
    } catch (e) { onError(e); }
    if (!stopped) requestAnimationFrame(scan);
  };
  const stop = () => { stopped = true; stream.getTracks().forEach(t => t.stop()); video.srcObject = null; };
  requestAnimationFrame(scan);
  return stop;
}

export function expiryStatus(product, today = new Date().toISOString().slice(0,10), warningDays = 30) {
  const day = 86400000, now = Date.parse(today + 'T00:00:00Z');
  const lots = (product.expiryLots || []).filter(l => Number(l.qty) > 0).map(l => {
    const delta = Math.ceil((Date.parse(l.expiry + 'T00:00:00Z') - now) / day);
    return { ...l, daysLeft: delta, status: delta < 0 ? 'VENCIDO' : delta <= warningDays ? 'POR VENCER' : 'VIGENTE' };
  }).sort((a,b) => a.expiry.localeCompare(b.expiry));
  const tracked = lots.reduce((n,l)=>n+l.qty,0);
  const availableTracked = lots.filter(l=>l.status!=='VENCIDO').reduce((n,l)=>n+l.qty,0);
  return { lots, tracked, availableTracked, untracked: Math.max(0, Number(product.stock || 0) - tracked), alerts: lots.filter(l=>l.status!=='VIGENTE') };
}

export function consumeExpiryLots(product, quantity, today = new Date().toISOString().slice(0,10)) {
  let remaining = Number(quantity);
  const status = expiryStatus(product, today);
  if (status.availableTracked + 1e-8 < remaining) throw new Error('No hay lotes vigentes suficientes para ' + product.name + '. Registra lote y vencimiento antes de vender.');
  const next = (product.expiryLots || []).map(l => ({ ...l }));
  for (const lot of next.sort((a,b)=>a.expiry.localeCompare(b.expiry))) {
    if (remaining <= 1e-8) break;
    if (lot.expiry < today || lot.qty <= 0) continue;
    const take = Math.min(lot.qty, remaining);
    lot.qty = Number((lot.qty - take).toFixed(4));
    remaining = Number((remaining - take).toFixed(4));
  }
  product.expiryLots = next.filter(l=>l.qty>1e-8);
  return product;
}
