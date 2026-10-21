const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { project } = require('../src/calculator');

describe('WealthFlow Compounder Core Math', () => {
    const base = { savings: 0, monthlyInvest: 0, raise: 0, years: 1, annualReturn: 0, inflation: 0, goals: [] };
    const P = o => project({ ...base, ...o });

    test('Lump sum compounding matches annual rate', () => {
        const res = P({ savings: 1000, years: 1, annualReturn: 0.12 });
        assert.ok(Math.abs(res.wealth - 1120) < 1e-6, `Expected ~1120, got ${res.wealth}`);
    });

    test('10 year compounding equals (1 + r)^10', () => {
        const expected = 1000 * Math.pow(1.07, 10);
        const res = P({ savings: 1000, years: 10, annualReturn: 0.07 });
        assert.ok(Math.abs(res.wealth - expected) < 1e-4, `Expected ${expected}, got ${res.wealth}`);
    });

    test('Monthly contributions at 0% return equals total contributed', () => {
        const res = P({ monthlyInvest: 100, years: 2, annualReturn: 0 });
        assert.equal(res.wealth, 2400);
        assert.equal(res.contributed, 2400);
    });

    test('Monthly annuity-due formula validation', () => {
        const mr = Math.pow(1.1, 1 / 12) - 1;
        const expected = 100 * ((Math.pow(1 + mr, 60) - 1) / mr) * (1 + mr);
        const res = P({ monthlyInvest: 100, years: 5, annualReturn: 0.1 });
        assert.ok(Math.abs(res.wealth - expected) < 1e-4, `Expected ${expected}, got ${res.wealth}`);
    });

    test('Annual raise lifts monthly contributions accurately', () => {
        const res = P({ monthlyInvest: 100, raise: 0.1, years: 3 });
        const expected = 12 * (100 + 110 + 121);
        assert.ok(Math.abs(res.contributed - expected) < 1e-6);
    });

    test('Wealth identity: wealth == contributed + growth - spent', () => {
        const res = P({
            savings: 500000,
            monthlyInvest: 62500,
            raise: 0.1,
            years: 25,
            annualReturn: 0.12,
            inflation: 0.08,
            goals: [
                { years: 5, amount: 2000000 },
                { years: 15, amount: 10000000 }
            ]
        });
        const identity = res.contributed + res.growth - res.spent;
        assert.ok(Math.abs(res.wealth - identity) < 0.1, `Identity check: wealth ${res.wealth} vs ${identity}`);
        assert.ok(res.wealthSeries.length === 26, 'Should generate years + 1 series points');
    });

    test('Inflated goal deduction at scheduled age', () => {
        const res = P({ savings: 1000000, years: 10, inflation: 0.08, goals: [{ years: 5, amount: 100000 }] });
        const inflatedCost = 100000 * Math.pow(1.08, 5);
        assert.ok(Math.abs(res.spent - inflatedCost) < 1e-4);
        assert.ok(Math.abs(res.wealth - (1000000 - inflatedCost)) < 1e-4);
    });

    test('Negative goals act as inflows (inheritance/bonus)', () => {
        const res = P({ savings: 1000000, years: 10, goals: [{ years: 5, amount: -200000 }] });
        assert.equal(res.wealth, 1200000);
        assert.equal(res.spent, -200000);
    });

    test('Goal shortfall is detected when pot is insufficient', () => {
        const res = P({ savings: 100000, years: 10, goals: [{ years: 5, amount: 1000000 }] });
        assert.equal(res.shortfallMonth, 60);
        assert.ok(res.unfunded > 0);
        assert.ok(res.wealth >= 0, 'Wealth never goes below 0');
    });
});
