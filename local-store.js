const DB_NAME = 'comerciante-local';
const DB_VERSION = 1;
const STORE = 'products';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('IndexedDB no está disponible en este navegador'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir la base local'));
  });
}

export async function saveProductLocal(product) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(product);
    tx.oncomplete = () => { db.close(); resolve(product); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('No se pudo guardar el artículo')); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error('Guardado cancelado')); };
  });
}

export async function listProductsLocal() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => { const result = request.result; db.close(); resolve(result); };
    request.onerror = () => { db.close(); reject(request.error || new Error('No se pudo leer el catálogo')); };
  });
}

export async function deleteProductLocal(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('No se pudo eliminar el artículo')); };
  });
}
