const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
    computeNetWorth,
    resolveNetWorthPortfolioBase,
    scaleHoldingToNetWorth
} = require('../src/calculator');

describe('Compounder ↔ Net Worth sync (net worth vs gross assets)', () => {
    const categories = {
        vehicles: 5500000,
        gold: 12753870,
        funds: 2580417,
        stocks: 4395197,
        realEstate: 15500000,
        cash: 848800
    };
    const liabilities = 3573140;

    test('computeNetWorth subtracts liabilities from gross assets', () => {
        const res = computeNetWorth({ categories, liabilities });
        assert.equal(res.grossAssets, 41578284);
        assert.equal(res.netWorth, 38005144);
        assert.equal(res.liabilities, liabilities);
        assert.ok(res.grossAssets > res.netWorth);
    });

    test('resolveNetWorthPortfolioBase prefers net worth over gross assets', () => {
        const base = resolveNetWorthPortfolioBase({
            totalAssets: 41578284,
            netWorth: 38005144,
            liabilities
        });
        assert.equal(base, 38005144);
    });

    test('resolveNetWorthPortfolioBase derives net worth when only assets + debt given', () => {
        const base = resolveNetWorthPortfolioBase({
            totalAssets: 41578284,
            liabilities
        });
        assert.equal(base, 38005144);
    });

    test('scaleHoldingToNetWorth helper preserves weights when optionally used', () => {
        const assets = 41578284;
        const netWorth = 38005144;
        const holdings = Object.values(categories);
        const scaled = holdings.map(v => scaleHoldingToNetWorth(v, {
            totalAssets: assets,
            netWorth,
            liabilities
        }));
        const sumScaled = scaled.reduce((a, b) => a + b, 0);
        assert.ok(Math.abs(sumScaled - netWorth) < 1e-6);
    });

    test('index.html shows net worth in labels but auto-fills real tracker amounts', () => {
        const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
        assert.ok(html.includes("localStorage.getItem('wealth_networth_entities')"),
            'should prefer wealth_networth_entities');
        assert.ok(html.includes('portfolioBase'), 'should compute portfolioBase');
        assert.ok(html.includes('syncSavingsFromNetWorth'),
            'auto-fill should sync Current Savings to net worth');
        assert.ok(html.includes('From Net Worth (${compact(nw.portfolioBase)})'),
            'From Net Worth button should show net worth, not gross assets');
        assert.equal(html.includes('From Net Worth (${compact(nw.totalAssets)})'), false,
            'must not label Net Worth with totalAssets');
        assert.ok(html.includes('Net Worth Suggestions (${rs(nw.portfolioBase)}'),
            'suggestions strip should show net worth');
        // Auto-fill must use real tracker amounts (c.val / it.val), not debt-scaled figures
        assert.ok(html.includes('addInvestmentRow(c.name, Math.round(c.val), c.weight, c.expectedReturn)'),
            'category auto-fill should use actual tracker amounts');
        assert.ok(html.includes('addInvestmentRow(it.name, Math.round(it.val), it.weight, it.expectedReturn)'),
            'holdings auto-fill should use actual tracker amounts');
        assert.equal(html.includes('scaleToPortfolioBase'), false,
            'should not shrink tracker amounts for debt when filling the split');
        assert.ok(html.includes('lastKnownPortfolioBase = nw.totalAssets'),
            'amount/% sync base should be gross assets so Leaf stays 55 Lac');
    });
});
