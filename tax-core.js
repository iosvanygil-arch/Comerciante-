// COMERCIANTE · reglas TCP régimen general. Importes en CUP.
export const TCP_TAX_RULES = Object.freeze({
  source: 'Ley 113 concordada, Gaceta Oficial Edición Especial No. 1, 12/01/2026',
  minimumExemptAnnual: 39120,
  expenseEvidenceThreshold: 0.80,
  annualBrackets: [
    { limit: 10000, rate: 0.15 },
    { limit: 20000, rate: 0.20 },
    { limit: 30000, rate: 0.30 },
    { limit: 50000, rate: 0.40 },
    { limit: Infinity, rate: 0.50 }
  ],
  annualReturnDeadline: '04-30',
  earlyPaymentDeadline: '02-28',
  earlyPaymentBonus: 0.05
});

const nonNegative = (value, label) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(label + ' debe ser un importe no negativo.');
  return n;
};

export function calculateTcpAnnualTax(input = {}) {
  const grossIncome = nonNegative(input.grossIncome ?? 0, 'Ingresos brutos');
  const expenses = nonNegative(input.businessExpenses ?? 0, 'Gastos de actividad');
  const documented = nonNegative(input.documentedExpenses ?? 0, 'Gastos justificados');
  const otherDeductions = nonNegative(input.otherDeductions ?? 0, 'Otras deducciones');
  const advances = nonNegative(input.advances ?? 0, 'Cuotas anticipadas');
  const withholdings = nonNegative(input.withholdings ?? 0, 'Retenciones');
  if (documented > expenses) throw new Error('Los gastos justificados no pueden superar los gastos declarados.');
  const evidenceRatio = expenses === 0 ? 1 : documented / expenses;
  const expenseDeductionAllowed = evidenceRatio >= TCP_TAX_RULES.expenseEvidenceThreshold;
  // If the statutory 80% evidence condition is not met, do not assume a deduction.
  const deductibleExpenses = expenseDeductionAllowed ? expenses : 0;
  const minimumExempt = nonNegative(input.minimumExempt ?? TCP_TAX_RULES.minimumExemptAnnual, 'Mínimo exento');
  const taxableBase = Math.max(0, grossIncome - minimumExempt - deductibleExpenses - otherDeductions);
  let remaining = taxableBase, previous = 0, taxBeforeBonus = 0;
  const breakdown = [];
  for (const bracket of TCP_TAX_RULES.annualBrackets) {
    const portion = Math.max(0, Math.min(remaining, bracket.limit - previous));
    if (portion > 0) {
      const tax = portion * bracket.rate;
      taxBeforeBonus += tax;
      breakdown.push({ from: previous, to: Number.isFinite(bracket.limit) ? bracket.limit : null, taxable: portion, rate: bracket.rate, tax });
      remaining -= portion;
    }
    previous = bracket.limit;
    if (remaining <= 0) break;
  }
  const bonusEligible = Boolean(input.earlyPayment);
  const bonus = bonusEligible ? taxBeforeBonus * TCP_TAX_RULES.earlyPaymentBonus : 0;
  const netAnnualTax = Math.max(0, taxBeforeBonus - bonus);
  const credits = advances + withholdings;
  return {
    grossIncome, businessExpenses: expenses, documentedExpenses: documented,
    evidenceRatio, expenseDeductionAllowed, deductibleExpenses, otherDeductions,
    minimumExempt, taxableBase, breakdown, taxBeforeBonus, bonus,
    netAnnualTax, advances, withholdings, credits,
    balance: Math.max(0, netAnnualTax - credits),
    excessCredits: Math.max(0, credits - netAnnualTax),
    warning: expenseDeductionAllowed ? '' : 'No se aplicó deducción de gastos: la documentación aportada no alcanza el 80% exigido. Verifica además los límites específicos de tu actividad.'
  };
}
