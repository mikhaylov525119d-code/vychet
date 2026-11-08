/* Расчёт налоговых вычетов НДФЛ (правила 2024–2026, ставка 13%).
   Работает и в браузере (window.TaxCalc), и в Node (module.exports) — для тестов. */
(function (root) {
  'use strict';

  const RATE = 0.13;
  const LIMITS = {
    property: 2000000,     // покупка жилья
    mortgage: 3000000,     // проценты по ипотеке
    social: 150000,        // лечение + своя учёба + спорт — общий лимит в год
    kidsPerChild: 110000,  // учёба ребёнка, на каждого
    iis: 400000,           // взносы на ИИС в год
    progressive: 2400000,  // выше — ставка 15%, нужен индивидуальный расчёт
  };
  const CURRENT_YEAR = 2026; // в 2026 году можно вернуть налог за 2023–2025

  const n = v => Math.max(0, Number(v) || 0);
  const r100 = v => Math.round(v / 100) * 100;

  /**
   * @param {object} d
   *  salary        — зарплата в месяц до вычета налога, ₽
   *  property      — стоимость жилья, ₽ (0 — не покупали)
   *  propertyUsed  — уже получали имущественный вычет раньше (true/false)
   *  purchaseYear  — год покупки (для расчёта прошлых лет)
   *  mortgage      — уплаченные проценты по ипотеке, ₽
   *  medical       — лечение и лекарства за год, ₽
   *  expensiveMed  — дорогостоящее лечение за год, ₽ (без лимита)
   *  ownEdu        — своя учёба (брата/сестры, супруга) за год, ₽
   *  sport         — спорт за год, ₽
   *  kidsEdu       — учёба детей за год, ₽ (всего)
   *  kids          — сколько детей учится
   *  iis           — взносы на ИИС за год, ₽
   */
  function calc(d) {
    const income = n(d.salary) * 12;
    const taxPerYear = income * RATE;               // сколько НДФЛ платит человек за год

    // --- годовые вычеты (не переносятся на следующий год) ---
    const socialBase = Math.min(n(d.medical) + n(d.ownEdu) + n(d.sport), LIMITS.social);
    const kids = Math.max(1, Math.round(n(d.kids)) || 1);
    const kidsBase = n(d.kidsEdu) > 0 ? Math.min(n(d.kidsEdu), LIMITS.kidsPerChild * kids) : 0;
    const iisBase = Math.min(n(d.iis), LIMITS.iis);
    const expensiveBase = n(d.expensiveMed);
    const yearlyItems = [
      { key: 'social', label: 'Лечение, учёба, спорт', base: socialBase },
      { key: 'expensive', label: 'Дорогостоящее лечение', base: expensiveBase },
      { key: 'kids', label: 'Учёба детей', base: kidsBase },
      { key: 'iis', label: 'ИИС', base: iisBase },
    ].filter(i => i.base > 0).map(i => ({ ...i, refund: i.base * RATE }));
    const yearlyFull = yearlyItems.reduce((s, i) => s + i.refund, 0);
    const yearlyRefund = Math.min(yearlyFull, taxPerYear);   // больше уплаченного налога не вернут

    // --- жильё (остаток переносится на следующие годы) ---
    const propertyBase = d.propertyUsed ? 0 : Math.min(n(d.property), LIMITS.property);
    const mortgageBase = Math.min(n(d.mortgage), LIMITS.mortgage);
    const propertyRefund = propertyBase * RATE;
    const mortgageRefund = mortgageBase * RATE;
    const housingTotal = propertyRefund + mortgageRefund;

    // за сколько прошлых лет можно подать сразу: 2023–2025, но не раньше года покупки
    const py = Math.round(n(d.purchaseYear)) || CURRENT_YEAR;
    const backYears = housingTotal > 0 ? Math.max(0, Math.min(3, CURRENT_YEAR - Math.max(py, CURRENT_YEAR - 3))) : 0;
    const housingNow = Math.min(housingTotal, backYears * taxPerYear);   // можно вернуть сразу за прошлые годы
    const housingYears = taxPerYear > 0 ? Math.ceil(housingTotal / taxPerYear) : 0; // лет, чтобы вернуть всё

    const items = [];
    if (propertyRefund) items.push({ key: 'property', label: 'Покупка жилья', base: propertyBase, refund: propertyRefund });
    if (mortgageRefund) items.push({ key: 'mortgage', label: 'Проценты по ипотеке', base: mortgageBase, refund: mortgageRefund });
    items.push(...yearlyItems);

    return {
      income, taxPerYear,
      items: items.map(i => ({ ...i, refund: r100(i.refund) })),
      housingTotal: r100(housingTotal),
      housingNow: r100(housingNow),
      housingYears, backYears,
      yearlyFull: r100(yearlyFull),
      yearlyRefund: r100(yearlyRefund),
      yearlyCapped: yearlyFull > taxPerYear,
      total: r100(housingTotal + yearlyRefund),
      highIncome: income > LIMITS.progressive,
      noIncome: income === 0,
      limits: LIMITS, rate: RATE, currentYear: CURRENT_YEAR,
    };
  }

  const api = { calc, LIMITS, RATE, CURRENT_YEAR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TaxCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
