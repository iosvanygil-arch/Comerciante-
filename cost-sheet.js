// Fichas de costo independientes del libro contable y del inventario.
const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function calculateCostSheet(input) {
  const fields = ['purchaseTotal','transport','handling','packaging','otherCosts','yieldUnits','targetMargin'];
  const values = Object.fromEntries(fields.map(key => [key, Number(input[key] ?? 0)]));
  for (const [key, value] of Object.entries(values)) {
    if (!Number.isFinite(value) || value < 0) throw new Error('Los importes y cantidades deben ser números válidos y no negativos.');
  }
  if (values.yieldUnits <= 0) throw new Error('La cantidad de unidades obtenidas debe ser mayor que cero.');
  if (values.targetMargin >= 100) throw new Error('El margen debe ser menor que 100 %.');

  const totalCost = roundMoney(values.purchaseTotal + values.transport + values.handling + values.packaging + values.otherCosts);
  const unitCost = roundMoney(totalCost / values.yieldUnits);
  const rawPrice = unitCost / (1 - values.targetMargin / 100);
  // Redondear hacia arriba al centavo para no quedar por debajo del margen solicitado.
  const salePrice = Math.ceil((rawPrice - 1e-10) * 100) / 100;
  const unitProfit = roundMoney(salePrice - unitCost);
  const actualMargin = salePrice > 0 ? roundMoney((unitProfit / salePrice) * 100) : 0;
  return {
    totalCost,
    yieldUnits: values.yieldUnits,
    unitCost,
    targetMargin: values.targetMargin,
    salePrice: roundMoney(salePrice),
    unitProfit,
    actualMargin
  };
}

export function createCostSheet(input, now = new Date().toISOString()) {
  const name = String(input.name ?? '').trim();
  if (!name) throw new Error('Escribe el nombre del producto o elaboración.');
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `FC-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    code: String(input.code ?? '').trim(),
    unit: String(input.unit ?? 'unidad').trim() || 'unidad',
    purchaseTotal: Number(input.purchaseTotal ?? 0),
    transport: Number(input.transport ?? 0),
    handling: Number(input.handling ?? 0),
    packaging: Number(input.packaging ?? 0),
    otherCosts: Number(input.otherCosts ?? 0),
    yieldUnits: Number(input.yieldUnits ?? 0),
    targetMargin: Number(input.targetMargin ?? 0),
    ...calculateCostSheet(input),
    createdAt: now
  };
}
