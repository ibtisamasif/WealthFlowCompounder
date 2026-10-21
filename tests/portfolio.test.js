const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { project, calculatePortfolioBreakdown } = require('../src/calculator');

describe('Portfolio Breakdown & Zero-Return Asset Integrity', () => {
    test('Non-growing assets (vehicles @ 0% return) retain 100% nominal value', () => {
        const savings = 10000000; // Rs. 1.00 Cr synthetic example
        const years = 20;
        const existingAssets = [
            { name: 'Equities', weight: 30.0, ret: 0.15, amount: 3000000 },
            { name: 'Gold', weight: 20.0, ret: 0.12, amount: 2000000 },
            { name: 'Real Estate', weight: 30.0, ret: 0.10, amount: 3000000 },
            { name: 'Vehicle A', weight: 10.0, ret: 0.00, amount: 1000000 },
            { name: 'Vehicle B', weight: 10.0, ret: 0.00, amount: 1000000 }
        ];

        // Overall weighted return
        const existingReturn = existingAssets.reduce((sum, a) => sum + (a.weight / 100) * a.ret, 0);

        const p = project({
            savings,
            existingReturn,
            monthlyInvest: 0,
            raise: 0,
            years,
            inflation: 0.08,
            goals: []
        });

        const { categoryTotals } = calculatePortfolioBreakdown({
            existingAssets,
            savings,
            years,
            p,
            isMirrored: true
        });

        // Vehicle A and B started at 10 Lac (1,000,000) with 0% return
        // They must NOT be scaled down; they must retain 100% of their nominal value (1,000,000)!
        assert.equal(
            categoryTotals['Vehicle A'],
            1000000,
            `Vehicle A with 0% return should remain exactly 10 Lac, got ${categoryTotals['Vehicle A']}`
        );

        assert.equal(
            categoryTotals['Vehicle B'],
            1000000,
            `Vehicle B with 0% return should remain exactly 10 Lac, got ${categoryTotals['Vehicle B']}`
        );

        // Positive compounding assets should compound and scale to absorb total wealth
        assert.ok(categoryTotals['Equities'] > 3000000, 'Equities should compound up');
        assert.ok(categoryTotals['Gold'] > 2000000, 'Gold should compound up');

        // Total sum of all categories must match total wealthExisting
        const sumTotal = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
        assert.ok(
            Math.abs(sumTotal - p.wealthExisting) < 1.0,
            `Total portfolio breakdown (${sumTotal}) should equal wealthExisting (${p.wealthExisting})`
        );
    });
});
