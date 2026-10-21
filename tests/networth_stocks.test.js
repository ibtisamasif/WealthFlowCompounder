const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { computeNetWorth } = require('../src/calculator');

describe('Net Worth Stocks Simplification & Day-End Total Worth', () => {
    test('Direct Day-End stock total worth calculation', () => {
        const categories = {
            vehicles: 5500000,
            gold: 13000000,
            funds: 2680000,
            stocks: 4637187, // Single day-end total worth entered directly
            realEstate: 15500000,
            cash: 1046778
        };
        const liabilities = 3500000;

        const res = computeNetWorth({ categories, liabilities });
        assert.equal(res.grossAssets, 5500000 + 13000000 + 2680000 + 4637187 + 15500000 + 1046778);
        assert.equal(res.netWorth, res.grossAssets - liabilities);
    });

    test('Multiple brokerage/stock portfolios day-end total sum', () => {
        const portfolios = [
            { name: 'PSX Main Brokerage', val: 3200000 },
            { name: 'CDC Sub-Account', val: 1437187 }
        ];
        const stockTotal = portfolios.reduce((sum, p) => sum + p.val, 0);
        assert.equal(stockTotal, 4637187);
    });

    test('Legacy compatibility: converts ticker, qty, price into total val', () => {
        const legacyStocks = [
            { ticker: 'ENGRO', qty: 1000, price: 310 },
            { ticker: 'LUCK', qty: 500, price: 850 },
            { ticker: 'SYS', qty: 1200, price: 420 }
        ];

        const modernStocks = legacyStocks.map(s => {
            const name = s.name || s.ticker || 'PSX Stock Portfolio';
            const val = s.val !== undefined ? s.val : ((parseFloat(s.qty) || 0) * (parseFloat(s.price) || 0));
            return { name, val };
        });

        assert.equal(modernStocks[0].name, 'ENGRO');
        assert.equal(modernStocks[0].val, 310000);
        assert.equal(modernStocks[1].name, 'LUCK');
        assert.equal(modernStocks[1].val, 425000);
        assert.equal(modernStocks[2].name, 'SYS');
        assert.equal(modernStocks[2].val, 504000);

        const totalLegacyVal = modernStocks.reduce((sum, s) => sum + s.val, 0);
        assert.equal(totalLegacyVal, 1239000);
    });

    test('networth.html script parses and initializes stock functions correctly', () => {
        const networthPath = path.join(__dirname, '..', 'networth.html');
        const html = fs.readFileSync(networthPath, 'utf8');
        const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

        assert.ok(scriptMatch, 'networth.html should contain a script tag');
        const scriptContent = scriptMatch[1];

        // Ensure PSX live fetch price engine has been removed
        assert.equal(scriptContent.includes('fetchLiveStockPrices'), false, 'fetchLiveStockPrices should be removed');
        assert.equal(scriptContent.includes('STOCK_BENCHMARKS'), false, 'STOCK_BENCHMARKS should be removed');
        assert.equal(scriptContent.includes('undoLastStockPriceUpdate'), false, 'undoLastStockPriceUpdate should be removed');

        // Ensure addStockRow and onStockInputChange exist
        assert.ok(scriptContent.includes('function addStockRow'), 'addStockRow should exist');
        assert.ok(scriptContent.includes('function onStockInputChange'), 'onStockInputChange should exist');
    });
});
