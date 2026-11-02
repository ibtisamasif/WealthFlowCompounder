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

    test('scaled holdings sum to net worth while preserving asset weights', () => {
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

        // Weights vs gross assets unchanged
        holdings.forEach((v, i) => {
            const wGross = v / assets;
            const wScaled = scaled[i] / netWorth;
            assert.ok(Math.abs(wGross - wScaled) < 1e-12);
        });
    });

    test('index.html reads live entities key and labels use portfolioBase/netWorth', () => {
        const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
        assert.ok(html.includes("localStorage.getItem('wealth_networth_entities')"),
            'should prefer wealth_networth_entities');
        assert.ok(html.includes('portfolioBase'), 'should compute portfolioBase');
        assert.ok(html.includes('scaleToPortfolioBase'), 'should scale holdings to net worth');
        assert.ok(html.includes('From Net Worth (${compact(nw.portfolioBase)})'),
            'From Net Worth button should show net worth, not gross assets');
        assert.equal(html.includes('From Net Worth (${compact(nw.totalAssets)})'), false,
            'must not label Net Worth with totalAssets');
        assert.ok(html.includes('Net Worth Suggestions (${rs(nw.portfolioBase)}'),
            'suggestions strip should show net worth');
    });
});
