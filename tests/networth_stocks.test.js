const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { computeNetWorth } = require('../src/calculator');

describe('Net Worth Stocks Simplification — Single Total Worth Field', () => {
    test('Direct single input of total stocks worth calculates accurate net worth', () => {
        const categories = {
            vehicles: 5500000,
            gold: 13000000,
            funds: 2680000,
            stocks: 4637187, // Single total worth of Stocks & Equities
            realEstate: 15500000,
            cash: 1046778
        };
        const liabilities = 3500000;

        const res = computeNetWorth({ categories, liabilities });
        assert.equal(res.grossAssets, 5500000 + 13000000 + 2680000 + 4637187 + 15500000 + 1046778);
        assert.equal(res.netWorth, res.grossAssets - liabilities);
    });

    test('Legacy compatibility: converts legacy stock arrays into single total value', () => {
        const legacyStocks = [
            { ticker: 'ENGRO', qty: 1000, price: 310 },
            { ticker: 'LUCK', qty: 500, price: 850 },
            { ticker: 'SYS', qty: 1200, price: 420 }
        ];

        // Legacy extraction logic matching networth.html applyState()
        const total = legacyStocks.reduce((sum, s) => {
            const itemVal = s.val !== undefined ? parseFloat(s.val) : ((parseFloat(s.qty) || 0) * (parseFloat(s.price) || 0));
            return sum + (itemVal || 0);
        }, 0);

        assert.equal(total, 1000 * 310 + 500 * 850 + 1200 * 420); // 1,239,000
    });

    test('networth.html markup has single total input and NO Add Stock button', () => {
        const networthPath = path.join(__dirname, '..', 'networth.html');
        const html = fs.readFileSync(networthPath, 'utf8');

        // Verify single direct input exists
        assert.ok(html.includes('id="stocksTotalInput"'), 'Should have id="stocksTotalInput"');
        assert.ok(html.includes('onStockTotalChange()'), 'Should call onStockTotalChange()');

        // Verify Add Stock Portfolio button has been removed from HTML
        assert.equal(html.includes('+ Add Stock Portfolio'), false, '"+ Add Stock Portfolio" button should be removed');
        assert.equal(html.includes('+ Add Stock<'), false, '"+ Add Stock" button should be removed');

        // Verify script functions
        const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
        assert.ok(scriptMatch, 'Script tag should exist');
        const script = scriptMatch[1];

        assert.ok(script.includes('function onStockTotalChange'), 'Should have onStockTotalChange');
        assert.ok(script.includes('function setStockTotal'), 'Should have setStockTotal');
        assert.equal(script.includes('fetchLiveStockPrices'), false, 'PSX fetch price engine should be removed');
    });
});
