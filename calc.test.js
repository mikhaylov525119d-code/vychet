// node calc.test.js — проверка расчёта на типичных случаях
const assert = require('assert');
const { calc } = require('./calc.js');
let ok = 0;
const t = (name, fn) => { fn(); ok++; console.log('✓', name); };

t('квартира 5 млн + 1,5 млн процентов: 260 000 + 195 000', () => {
  const r = calc({ salary: 100000, property: 5000000, mortgage: 1500000, purchaseYear: 2023 });
  assert.strictEqual(r.housingTotal, 260000 + 195000);
  assert.strictEqual(r.taxPerYear, 156000);
  assert.strictEqual(r.backYears, 3);
  assert.strictEqual(r.housingNow, 455000);          // 3 года × 156 000 = 468 000 ≥ 455 000
  assert.strictEqual(r.housingYears, 3);
});

t('лимиты: квартира и проценты не больше 2 и 3 млн → максимум 650 000', () => {
  const r = calc({ salary: 200000, property: 10e6, mortgage: 9e6, purchaseYear: 2020 });
  assert.strictEqual(r.housingTotal, 650000);
});

t('уже получали имущественный — считаем только проценты', () => {
  const r = calc({ salary: 80000, property: 4e6, propertyUsed: true, mortgage: 500000 });
  assert.strictEqual(r.housingTotal, 65000);
});

t('покупка в 2025 — сразу только за 1 прошлый год', () => {
  const r = calc({ salary: 50000, property: 3e6, purchaseYear: 2025 });
  assert.strictEqual(r.backYears, 1);
  assert.strictEqual(r.housingNow, 78000);           // 50 000 × 12 × 13%
});

t('покупка в 2026 — прошлых лет нет', () => {
  const r = calc({ salary: 50000, property: 3e6, purchaseYear: 2026 });
  assert.strictEqual(r.backYears, 0);
  assert.strictEqual(r.housingNow, 0);
});

t('социальный: общий лимит 150 000 → 19 500', () => {
  const r = calc({ salary: 100000, medical: 120000, ownEdu: 60000, sport: 30000 });
  assert.strictEqual(r.yearlyRefund, 19500);
});

t('дорогостоящее лечение — без лимита', () => {
  const r = calc({ salary: 150000, expensiveMed: 500000 });
  assert.strictEqual(r.yearlyRefund, 65000);
});

t('учёба детей: 110 000 на каждого', () => {
  const r = calc({ salary: 100000, kidsEdu: 300000, kids: 2 });
  assert.strictEqual(r.yearlyRefund, 28600);
});

t('ИИС: максимум 52 000', () => {
  const r = calc({ salary: 400000, iis: 1e6 });
  assert.strictEqual(r.yearlyRefund, 52000);
});

t('годовые вычеты ограничены уплаченным налогом', () => {
  const r = calc({ salary: 20000, expensiveMed: 1e6 });   // налог 31 200 в год
  assert.strictEqual(r.yearlyRefund, 31200);
  assert.ok(r.yearlyCapped);
});

t('без дохода — флаг noIncome', () => {
  assert.ok(calc({ salary: 0, medical: 50000 }).noIncome);
});

t('доход выше 2,4 млн — флаг highIncome', () => {
  assert.ok(calc({ salary: 250000 }).highIncome);
});

console.log(`\nВсе тесты пройдены: ${ok}`);
