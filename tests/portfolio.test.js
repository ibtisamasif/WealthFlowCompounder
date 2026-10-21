const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { project, calculatePortfolioBreakdown } = require('../src/calculator');

describe('Portfolio Breakdown & Zero-Return Asset Integrity', () => {
    test('Non-growing assets (vehicles @ 0% return) retain 100% nominal value', () => {
        const savings = 38793267; // Rs. 3.88 Cr
        const years = 25;
        const existingAssets = [
            { name: 'PSX Equities', weight: 10.7, ret: 0.15, amount: 4637187 },
            { name: 'Physical Gold', weight: 30.0, ret: 0.12, amount: 13000690 },
            { name: 'Real Estate', weight: 35.7, ret: 0.10, amount: 15500000 },
            { name: 'Vehicles1', weight: 12.7, ret: 0.00, amount: 5507958 },
            { name: 'Vehicles2', weight: 2.3, ret: 0.00, amount: 1000000 } // 10 Lac
        ];

        // Overall weighted return
        const existingReturn = existingAssets.reduce((sum, a) => sum + (a.weight / 100) * a.ret, 0);

        const p = project({
            savings,
            existingReturn,
            monthlyInvest: 0,
            raise: 0,
            years,
            inflation: 0.10,
            goals: []
        });

        const { categoryTotals } = calculatePortfolioBreakdown({
            existingAssets,
            savings,
            years,
            p,
            isMirrored: true
        });

        // Vehicles2 started at 10 Lac (1,000,000) with 0% return
        // It must NOT be scaled down to 6.5 Lac; it must stay at 10 Lac (1,000,000)!
        assert.equal(
            categoryTotals['Vehicles2'],
            1000000,
            `Vehicles2 with 0% return should remain exactly 10 Lac, got ${categoryTotals['Vehicles2']}`
        );

        assert.equal(
            categoryTotals['Vehicles1'],
            5507958,
            `Vehicles1 with 0% return should remain exactly 55.08 Lac, got ${categoryTotals['Vehicles1']}`
        );

        // Positive compounding assets should compound and scale to absorb total wealth
        assert.ok(categoryTotals['PSX Equities'] > 4637187, 'Equities should compound up');
        assert.ok(categoryTotals['Physical Gold'] > 13000690, 'Gold should compound up');

        // Total sum of all categories must match total wealthExisting
        const sumTotal = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
        assert.ok(
            Math.abs(sumTotal - p.wealthExisting) < 1.0,
            `Total portfolio breakdown (${sumTotal}) should equal wealthExisting (${p.wealthExisting})`
        );
    });
});
