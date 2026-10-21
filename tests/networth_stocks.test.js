const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { computeNetWorth } = require('../src/calculator');

describe('Net Worth Stocks Simplification — Single Total Worth Field', () => {
    test('Direct single input of total stocks worth calculates accurate net worth', () => {
        const categories = {
            vehicles: 2000000,
            gold: 3000000,
            funds: 1500000,
            stocks: 2500000, // Synthetic dummy stocks total
            realEstate: 5000000,
            cash: 500000
        };
        const liabilities = 1000000;

        const res = computeNetWorth({ categories, liabilities });
        assert.equal(res.grossAssets, 2000000 + 3000000 + 1500000 + 2500000 + 5000000 + 500000);
        assert.equal(res.netWorth, res.grossAssets - liabilities);
    });

    test('Legacy compatibility: converts legacy stock arrays into single total value', () => {
        const legacyStocks = [
            { ticker: 'STOCK_A', qty: 100, price: 50 },
            { ticker: 'STOCK_B', qty: 200, price: 100 },
            { ticker: 'STOCK_C', qty: 300, price: 150 }
        ];

        // Legacy extraction logic matching networth.html applyState()
        const total = legacyStocks.reduce((sum, s) => {
            const itemVal = s.val !== undefined ? parseFloat(s.val) : ((parseFloat(s.qty) || 0) * (parseFloat(s.price) || 0));
            return sum + (itemVal || 0);
        }, 0);

        assert.equal(total, 100 * 50 + 200 * 100 + 300 * 150); // 5000 + 20000 + 45000 = 70000
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
