import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTcpAnnualTax, TCP_TAX_RULES } from './tax-core.js';

test('TCP annual tax applies 39,120 CUP exempt minimum and progressive brackets', () => {
  const result = calculateTcpAnnualTax({grossIncome: 100000, businessExpenses:0, documentedExpenses:0});
  assert.equal(result.taxableBase, 60880);
  assert.equal(result.taxBeforeBonus, 1500 + 2000 + 3000 + 8000 + 5440);
  assert.equal(result.balance, result.taxBeforeBonus);
  assert.equal(TCP_TAX_RULES.minimumExemptAnnual, 39120);
});
test('TCP expenses are deducted only when at least 80% are documented', () => {
  const rejected = calculateTcpAnnualTax({grossIncome:100000,businessExpenses:50000,documentedExpenses:39999});
  assert.equal(rejected.deductibleExpenses,0);
  assert.ok(rejected.warning);
  const accepted = calculateTcpAnnualTax({grossIncome:100000,businessExpenses:50000,documentedExpenses:40000});
  assert.equal(accepted.deductibleExpenses,50000);
});
test('advance payments and withholdings reduce the final balance, never below zero', () => {
  const result = calculateTcpAnnualTax({grossIncome:50000,advances:10000,withholdings:2000});
  assert.equal(result.balance,0);
  assert.equal(result.excessCredits,10324);
});
test('early payment bonus is five percent of calculated annual tax', () => {
  const regular = calculateTcpAnnualTax({grossIncome:50000});
  const early = calculateTcpAnnualTax({grossIncome:50000,earlyPayment:true});
  assert.equal(early.bonus, regular.taxBeforeBonus*0.05);
});

import { calculateTcpMonthlyTaxes, calculateTcpSocialSecurity } from './tax-core.js';
test('TCP monthly sales/services tax and income advance follow Resolution 271/2024', () => {
  const r = calculateTcpMonthlyTaxes({grossIncome:10000,exemptCommissionIncome:2000});
  assert.equal(r.salesServicesTax,800);
  assert.equal(r.incomeTaxAdvance,337);
});
test('electronic payment bonus is 3 percent of both eligible monthly taxes', () => {
  const r = calculateTcpMonthlyTaxes({grossIncome:10000,electronicPayment:true});
  assert.equal(r.totalBonus,(1000+337)*0.03);
});
test('TCP special social security contribution is 20 percent of selected base', () => {
  const r = calculateTcpSocialSecurity({selectedMonthlyBase:15000,months:3});
  assert.equal(r.monthlyContribution,3000);
  assert.equal(r.periodContribution,9000);
});
