const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { getGoldRate, computeNetWorth, KARAT_PURITY } = require('../src/calculator');

describe('Net Worth Tracker & Gold Conversion Calculations', () => {
    test('Karat purity scaling is accurate', () => {
        assert.equal(KARAT_PURITY['24K'], 1.0);
        assert.equal(KARAT_PURITY['22K'], 22 / 24);
        assert.equal(KARAT_PURITY['21K'], 21 / 24);
        assert.equal(KARAT_PURITY['18K'], 18 / 24);
        assert.equal(KARAT_PURITY['14K'], 14 / 24);
    });

    test('Gold rate per tola and gram calculation from spot rate', () => {
        // spot $4000/oz @ Rs. 278 PKR/USD
        const tola24k = getGoldRate({ karat: '24K', unit: 'tola', spotPerOztUsd: 4000, pkrUsd: 278 });
        const tola21k = getGoldRate({ karat: '21K', unit: 'tola', spotPerOztUsd: 4000, pkrUsd: 278 });
        const gram24k = getGoldRate({ karat: '24K', unit: 'gram', spotPerOztUsd: 4000, pkrUsd: 278 });

        assert.ok(tola24k > 400000, `24K tola should be > 400k, got ${tola24k}`);
        // 21K must be 87.5% (21/24) of 24K
        assert.equal(Math.round(tola24k * (21 / 24)), tola21k);
        // 1 tola = 11.6638 grams
        assert.ok(Math.abs(tola24k - gram24k * 11.6638) < 100);
    });

    test('Net worth deduction of liabilities from gross assets', () => {
        const categories = {
            vehicles: 6500000, // 65 Lac
            gold: 13000000,    // 1.30 Cr
            stocks: 4600000,   // 46 Lac
            realEstate: 15500000, // 1.55 Cr
            cash: 1000000      // 10 Lac
        };
        const liabilities = 3500000; // 35 Lac

        const res = computeNetWorth({ categories, liabilities });
        assert.equal(res.grossAssets, 40600000);
        assert.equal(res.netWorth, 40600000 - 3500000); // 3.71 Cr
        assert.equal(res.liabilities, 3500000);
    });
});
