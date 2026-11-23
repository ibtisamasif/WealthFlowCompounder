const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
    HISTORY_BREAKDOWN_CATEGORIES,
    extractHistoryBreakdown,
    computeHistoryBreakdownDiff
} = require('../src/calculator');

function makeEntry(date, breakdown, extra = {}) {
    const totalAssets =
        (breakdown.vehicles || 0) +
        (breakdown.gold || 0) +
        (breakdown.funds || 0) +
        (breakdown.stocks || 0) +
        (breakdown.realEstate || 0) +
        (breakdown.cash || 0);
    const liabilities = breakdown.liabilities || 0;
    const netWorth = totalAssets - liabilities;
    return {
        date,
        totalAssets,
        liabilities,
        netWorth,
        breakdown: {
            ...breakdown,
            totalAssets,
            netWorth
        },
        ...extra
    };
}

describe('Net Worth History Insights — Breakdown Extraction & Diffing', () => {
    test('HISTORY_BREAKDOWN_CATEGORIES defines all 7 categories in expected order', () => {
        assert.deepEqual(
            HISTORY_BREAKDOWN_CATEGORIES.map(c => c.key),
            ['vehicles', 'gold', 'funds', 'stocks', 'realEstate', 'cash', 'liabilities']
        );
        assert.equal(HISTORY_BREAKDOWN_CATEGORIES[6].isLiability, true);
        assert.ok(HISTORY_BREAKDOWN_CATEGORIES.slice(0, 6).every(c => c.isLiability === false));
    });

    test('Mixed movements: Gold +4.5 Lac, Stocks -1.8 Lac, Cash +50k, unchanged Real Estate & Vehicles', () => {
        const prev = makeEntry('2026-10-01', {
            vehicles: 5000000,
            gold: 10000000,
            funds: 2000000,
            stocks: 4000000,
            realEstate: 15000000,
            cash: 500000,
            liabilities: 1000000
        });
        const curr = makeEntry('2026-10-15', {
            vehicles: 5000000,
            gold: 10450000,   // +4.5 Lac (+4.5%)
            funds: 2000000,
            stocks: 3820000,  // -1.8 Lac (-4.5%)
            realEstate: 15000000,
            cash: 550000,     // +50k (+10%)
            liabilities: 1000000
        });

        const diff = computeHistoryBreakdownDiff(curr, prev);

        assert.equal(diff.hasComparison, true);
        assert.equal(diff.reason, 'ok');
        assert.equal(diff.currDate, '2026-10-15');
        assert.equal(diff.prevDate, '2026-10-01');
        assert.equal(diff.totalDiff, 320000);
        assert.ok(Math.abs(diff.totalPct - (320000 / prev.netWorth) * 100) < 1e-9);

        // Changed sorted by |netImpact| descending: Gold (+450k), Stocks (-180k), Cash (+50k)
        assert.deepEqual(diff.changed.map(i => i.key), ['gold', 'stocks', 'cash']);

        const [gold, stocks, cash] = diff.changed;
        assert.equal(gold.delta, 450000);
        assert.equal(gold.netImpact, 450000);
        assert.ok(Math.abs(gold.pct - 4.5) < 1e-9);
        assert.equal(gold.direction, 'up');

        assert.equal(stocks.delta, -180000);
        assert.equal(stocks.netImpact, -180000);
        assert.ok(Math.abs(stocks.pct - (-4.5)) < 1e-9);
        assert.equal(stocks.direction, 'down');

        assert.equal(cash.delta, 50000);
        assert.equal(cash.netImpact, 50000);
        assert.ok(Math.abs(cash.pct - 10) < 1e-9);
        assert.equal(cash.direction, 'up');

        assert.equal(diff.topGainer.key, 'gold');
        assert.equal(diff.topLoser.key, 'stocks');
        assert.deepEqual(diff.gainers.map(i => i.key), ['gold', 'cash']);
        assert.deepEqual(diff.losers.map(i => i.key), ['stocks']);
        assert.deepEqual(diff.unchanged.map(i => i.key), ['vehicles', 'funds', 'realEstate', 'liabilities']);
    });

    test('Tie-breaking in changed preserves HISTORY_BREAKDOWN_CATEGORIES order', () => {
        const prev = makeEntry('2026-10-01', {
            vehicles: 1000000,
            gold: 1000000,
            funds: 1000000,
            stocks: 1000000,
            realEstate: 1000000,
            cash: 1000000,
            liabilities: 500000
        });
        const curr = makeEntry('2026-10-02', {
            vehicles: 1100000,    // +100k
            gold: 1000000,
            funds: 900000,        // -100k
            stocks: 1100000,      // +100k
            realEstate: 1000000,
            cash: 1000000,
            liabilities: 400000   // -100k delta => +100k netImpact
        });

        const diff = computeHistoryBreakdownDiff(curr, prev);
        assert.deepEqual(
            diff.changed.map(i => i.key),
            ['vehicles', 'funds', 'stocks', 'liabilities']
        );
    });

    test('Mathematical invariant: sum of item.netImpact across all 7 categories equals totalDiff', () => {
        const prev = makeEntry('2026-10-01', {
            vehicles: 3200000,
            gold: 4500000,
            funds: 1800000,
            stocks: 2400000,
            realEstate: 12000000,
            cash: 600000,
            liabilities: 2500000
        });
        const curr = makeEntry('2026-11-01', {
            vehicles: 3000000,
            gold: 5100000,
            funds: 2150000,
            stocks: 1900000,
            realEstate: 12500000,
            cash: 950000,
            liabilities: 2100000
        });

        const diff = computeHistoryBreakdownDiff(curr, prev);
        const sumImpact = diff.items.reduce((sum, item) => sum + item.netImpact, 0);
        assert.equal(diff.items.length, 7);
        assert.equal(sumImpact, diff.totalDiff);
    });

    test('Liabilities sign semantics: debt increase is negative netImpact, debt paydown is positive netImpact', () => {
        const base = makeEntry('2026-10-01', {
            vehicles: 0,
            gold: 0,
            funds: 0,
            stocks: 0,
            realEstate: 10000000,
            cash: 1000000,
            liabilities: 1000000
        });

        const moreDebt = makeEntry('2026-10-10', {
            vehicles: 0,
            gold: 0,
            funds: 0,
            stocks: 0,
            realEstate: 10000000,
            cash: 1000000,
            liabilities: 1200000 // +2 Lac debt
        });
        const debtIncreaseDiff = computeHistoryBreakdownDiff(moreDebt, base);
        const liabUp = debtIncreaseDiff.items.find(i => i.key === 'liabilities');
        assert.equal(liabUp.delta, 200000);
        assert.equal(liabUp.netImpact, -200000);
        assert.equal(liabUp.direction, 'down');
        assert.equal(liabUp.pct, 20);
        assert.equal(debtIncreaseDiff.topLoser.key, 'liabilities');
        assert.equal(debtIncreaseDiff.topGainer, null);

        const lessDebt = makeEntry('2026-10-20', {
            vehicles: 0,
            gold: 0,
            funds: 0,
            stocks: 0,
            realEstate: 10000000,
            cash: 1000000,
            liabilities: 800000 // -2 Lac debt
        });
        const debtPaydownDiff = computeHistoryBreakdownDiff(lessDebt, base);
        const liabDown = debtPaydownDiff.items.find(i => i.key === 'liabilities');
        assert.equal(liabDown.delta, -200000);
        assert.equal(liabDown.netImpact, 200000);
        assert.equal(liabDown.direction, 'up');
        assert.equal(liabDown.pct, -20);
        assert.equal(debtPaydownDiff.topGainer.key, 'liabilities');
        assert.equal(debtPaydownDiff.topLoser, null);
    });

    test('Edge cases: new asset, liquidated asset, and zero changes across all categories', () => {
        const prev = makeEntry('2026-10-01', {
            vehicles: 0,
            gold: 500000,
            funds: 1000000,
            stocks: 0,
            realEstate: 0,
            cash: 250000,
            liabilities: 0
        });
        const curr = makeEntry('2026-10-05', {
            vehicles: 1500000, // new asset
            gold: 0,           // liquidated asset
            funds: 1000000,    // unchanged
            stocks: 0,
            realEstate: 0,
            cash: 250000,
            liabilities: 0
        });

        const diff = computeHistoryBreakdownDiff(curr, prev);
        const vehicles = diff.items.find(i => i.key === 'vehicles');
        const gold = diff.items.find(i => i.key === 'gold');
        const stocks = diff.items.find(i => i.key === 'stocks');

        assert.equal(vehicles.isNew, true);
        assert.equal(vehicles.pct, null);
        assert.equal(vehicles.direction, 'up');

        assert.equal(gold.isNew, false);
        assert.equal(gold.pct, -100);
        assert.equal(gold.direction, 'down');

        // Zero-to-zero category should not appear in changed or unchanged
        assert.equal(stocks.direction, 'flat');
        assert.equal(diff.unchanged.some(i => i.key === 'stocks'), false);
        assert.deepEqual(diff.unchanged.map(i => i.key), ['funds', 'cash']);

        // Identical snapshot: no changes anywhere
        const identicalDiff = computeHistoryBreakdownDiff(curr, curr);
        assert.equal(identicalDiff.hasComparison, true);
        assert.equal(identicalDiff.totalDiff, 0);
        assert.deepEqual(identicalDiff.changed, []);
        assert.equal(identicalDiff.topGainer, null);
        assert.equal(identicalDiff.topLoser, null);
        assert.deepEqual(identicalDiff.unchanged.map(i => i.key), ['vehicles', 'funds', 'cash']);
    });

    test('Baseline entry (previousEntry = null) and missing_entry handling', () => {
        const missing = computeHistoryBreakdownDiff(null, null);
        assert.equal(missing.hasComparison, false);
        assert.equal(missing.reason, 'missing_entry');
        assert.deepEqual(missing.items, []);

        const curr = makeEntry('2026-09-01', {
            vehicles: 2000000,
            gold: 5000000,
            funds: 0,
            stocks: 3000000,
            realEstate: 12000000,
            cash: 400000,
            liabilities: 500000
        });

        const baseline = computeHistoryBreakdownDiff(curr, null);
        assert.equal(baseline.hasComparison, false);
        assert.equal(baseline.reason, 'baseline');
        assert.equal(baseline.currDate, '2026-09-01');
        assert.equal(baseline.currNetWorth, curr.netWorth);
        assert.deepEqual(
            baseline.items.map(i => i.key),
            ['realEstate', 'gold', 'stocks', 'vehicles', 'liabilities', 'cash']
        );
        assert.equal(baseline.items.some(i => i.key === 'funds'), false);
        assert.deepEqual(baseline.changed, []);
        assert.equal(baseline.topGainer, null);
        assert.equal(baseline.topLoser, null);
    });

    test('Legacy state fallback handles legacy stocks array { qty, price }, stocksTotal, and funds { units, nav }', () => {
        const legacyPrev = {
            date: '2026-08-01',
            netWorth: 1850000,
            state: {
                cars: [{ make: 'Sedan', val: '1000000' }],
                gold: [{ name: 'Bar', val: 500000 }],
                funds: [{ name: 'Fund A', units: '100', nav: '50' }], // 5,000
                stocks: [
                    { ticker: 'SYS', qty: 100, price: 200 },  // 20,000
                    { ticker: 'ENGRO', qty: 50, price: 300 }  // 15,000
                ], // total 35,000
                estates: [],
                cash: [{ val: 410000 }],
                liabilities: [{ val: 100000 }]
            }
        };

        const legacyCurr = {
            date: '2026-08-15',
            netWorth: 2050000,
            breakdown: {}, // empty breakdown should fall back to state
            state: {
                cars: [{ make: 'Sedan', val: '1000000' }],
                gold: [{ name: 'Bar', val: 650000 }],
                funds: [{ name: 'Fund A', val: 55000 }],
                stocks: [{ name: 'Stocks & Equities', val: 85000 }],
                stocksTotal: 85000,
                estates: [],
                cash: [{ val: 360000 }],
                liabilities: [{ val: 100000 }]
            }
        };

        const extractedPrev = extractHistoryBreakdown(legacyPrev);
        assert.deepEqual(extractedPrev, {
            vehicles: 1000000,
            gold: 500000,
            funds: 5000,
            stocks: 35000,
            realEstate: 0,
            cash: 410000,
            liabilities: 100000
        });

        const diff = computeHistoryBreakdownDiff(legacyCurr, legacyPrev);
        assert.equal(diff.hasComparison, true);
        assert.equal(diff.reason, 'ok');
        assert.equal(diff.items.find(i => i.key === 'gold').delta, 150000);
        assert.equal(diff.items.find(i => i.key === 'funds').delta, 50000);
        assert.equal(diff.items.find(i => i.key === 'stocks').delta, 50000);
        assert.equal(diff.items.find(i => i.key === 'cash').delta, -50000);
        assert.equal(diff.items.reduce((s, i) => s + i.netImpact, 0), diff.totalDiff);
    });

    test('Missing breakdown and missing state returns reason missing_breakdown', () => {
        assert.equal(extractHistoryBreakdown(null), null);
        assert.equal(extractHistoryBreakdown({ date: '2026-01-01', netWorth: 1000 }), null);

        const prev = { date: '2026-01-01', netWorth: 1000000 };
        const curr = { date: '2026-01-10', netWorth: 1200000 };
        const diff = computeHistoryBreakdownDiff(curr, prev);

        assert.equal(diff.hasComparison, false);
        assert.equal(diff.reason, 'missing_breakdown');
        assert.equal(diff.currDate, '2026-01-10');
        assert.equal(diff.prevDate, '2026-01-01');
        assert.equal(diff.totalDiff, 200000);
        assert.equal(diff.totalPct, 20);
        assert.deepEqual(diff.items, []);
    });

    test('networth.html integrates popover markup, triggers, and breakdown diff functions', () => {
        const html = fs.readFileSync(path.join(__dirname, '..', 'networth.html'), 'utf8');
        assert.ok(html.includes('id="historyInsightPopover"'), 'Should contain #historyInsightPopover');
        assert.ok(html.includes('change-insight-trigger'), 'Should render .change-insight-trigger buttons');
        assert.ok(html.includes('extractHistoryBreakdown'), 'Should include extractHistoryBreakdown');
        assert.ok(html.includes('computeHistoryBreakdownDiff'), 'Should include computeHistoryBreakdownDiff');
    });
});
