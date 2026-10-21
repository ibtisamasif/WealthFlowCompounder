/**
 * WealthFlow Core Financial Calculations Engine
 * Independent, pure logic for compounding, asset allocation, and conversions.
 */

const MAX_YEARS = 100;
const WITHDRAW = 0.04;
const ABSURD = 1e20;
const MASK = '*****';

// Gold conversion constants
const TOLA_PER_OZT = 11.6638 / 31.1034768;
const GRAM_PER_OZT = 1 / 31.1034768;

const KARAT_PURITY = {
    '24K': 24 / 24,
    '22K': 22 / 24,
    '21K': 21 / 24,
    '18K': 18 / 24,
    '14K': 14 / 24
};

/**
 * Projects wealth growth over a time horizon.
 */
function project({ savings, existingReturn, annualReturn, monthlyInvest, futureReturn, raise, years, inflation, goals }) {
    const eRet = existingReturn !== undefined ? existingReturn : (annualReturn !== undefined ? annualReturn : 0);
    const fRet = futureReturn !== undefined ? futureReturn : eRet;
    const monthlyExistingRet = Math.pow(1 + Math.max(eRet, -0.99), 1 / 12) - 1;
    const monthlyFutureRet = Math.pow(1 + Math.max(fRet, -0.99), 1 / 12) - 1;
    const infl = Math.max(inflation || 0, -0.99);
    const totalMonths = years * 12;

    const due = {};
    const priced = (goals || []).map(g => {
        const month = Math.round(g.years * 12);
        const inRange = month >= 0 && month <= totalMonths;
        const cost = g.amount * Math.pow(1 + infl, g.years);
        if (inRange) due[month] = (due[month] || 0) + cost;
        return { ...g, month, cost, inRange };
    });

    let wealthExisting = savings || 0, wealthFuture = 0;
    let contributed = savings || 0, spent = 0, earned = 0, unfunded = 0;
    let firstShort = null;
    const wealthSeries = [], netSeries = [];
    const shortByMonth = {};

    for (let idx = 0; idx <= totalMonths; idx++) {
        if (due[idx]) {
            if (due[idx] < 0) {
                wealthFuture -= due[idx];
                spent += due[idx];
            } else {
                const totalAvailable = Math.max(0, wealthExisting) + Math.max(0, wealthFuture);
                const take = Math.min(due[idx], totalAvailable);
                const short = due[idx] - take;

                let remTake = take;
                if (wealthFuture > 0) {
                    const takeF = Math.min(wealthFuture, remTake);
                    wealthFuture -= takeF;
                    remTake -= takeF;
                }
                if (remTake > 0 && wealthExisting > 0) {
                    const takeE = Math.min(wealthExisting, remTake);
                    wealthExisting -= takeE;
                    remTake -= takeE;
                }

                spent += take;
                if (short > 1e-6) {
                    unfunded += short;
                    shortByMonth[idx] = short;
                    if (firstShort === null) firstShort = idx;
                }
            }
        }

        const currentWealth = wealthExisting + wealthFuture;
        if (idx % 12 === 0) {
            wealthSeries.push(currentWealth);
            netSeries.push(contributed - spent);
        }
        if (idx === totalMonths) break;

        const invest = (monthlyInvest || 0) * Math.pow(1 + (raise || 0), Math.floor(idx / 12));
        contributed += invest;
        wealthFuture += invest;

        const gE = wealthExisting * monthlyExistingRet;
        const gF = wealthFuture * monthlyFutureRet;
        earned += (gE + gF);
        wealthExisting += gE;
        wealthFuture += gF;
    }

    priced.forEach(g => {
        g.unfunded = 0;
        if (g.inRange && shortByMonth[g.month]) {
            g.unfunded = shortByMonth[g.month] * (g.cost / due[g.month]);
        }
        g.funded = g.cost - g.unfunded;
    });

    return {
        wealth: wealthExisting + wealthFuture,
        wealthExisting,
        wealthFuture,
        contributed,
        spent,
        priced,
        unfunded,
        shortfallMonth: firstShort,
        growth: earned,
        wealthSeries,
        netSeries
    };
}

/**
 * Calculates portfolio distribution breakdown.
 * Ensures non-growing (ret <= 0) assets retain 100% nominal value,
 * while compounding growth is properly distributed across positive-yield assets.
 */
function calculatePortfolioBreakdown({ existingAssets = [], futureAssets = [], savings = 0, years = 0, p, isMirrored = true }) {
    let fixedSum = 0;
    let sumCompoundedGrowth = 0;

    const existingFVList = existingAssets.map(a => {
        const amt = a.amount > 0 ? a.amount : (savings * ((a.weight || 0) / 100));
        const ret = Math.max(a.ret || 0, -0.99);
        const fv = amt * Math.pow(1 + ret, years);
        if (ret <= 0) {
            fixedSum += fv;
        } else {
            sumCompoundedGrowth += fv;
        }
        return { name: a.name, fv, isFixed: ret <= 0 };
    });

    const growthPool = Math.max(0, (p.wealthExisting || 0) - fixedSum);
    const scaleGrowth = sumCompoundedGrowth > 0 ? (growthPool / sumCompoundedGrowth) : 1;
    const categoryTotals = {};

    existingFVList.forEach(item => {
        const key = item.name || 'Unnamed Asset';
        const finalVal = item.isFixed ? item.fv : (item.fv * scaleGrowth);
        categoryTotals[key] = (categoryTotals[key] || 0) + finalVal;
    });

    if (p.wealthFuture > 0) {
        if (isMirrored) {
            existingAssets.forEach(a => {
                const key = a.name || 'Unnamed Asset';
                const share = ((a.weight || 0) / 100) * p.wealthFuture;
                categoryTotals[key] = (categoryTotals[key] || 0) + share;
            });
        } else {
            futureAssets.forEach(a => {
                const key = a.name || 'Unnamed Asset';
                const share = ((a.weight || 0) / 100) * p.wealthFuture;
                categoryTotals[key] = (categoryTotals[key] || 0) + share;
            });
        }
    }

    const items = Object.entries(categoryTotals)
        .map(([name, val]) => ({
            name,
            val: Math.max(0, val),
            weight: p.wealth > 0 ? Number(((val / p.wealth) * 100).toFixed(1)) : 0
        }))
        .filter(i => i.val > 0)
        .sort((a, b) => b.val - a.val);

    return { categoryTotals, items };
}

/**
 * Currency and number formatting functions.
 */
function full(n, isMasked = false) {
    if (isMasked) return MASK;
    if (!Number.isFinite(n)) return '—';
    if (Math.abs(n) >= ABSURD) return n.toExponential(2);
    return Math.round(n).toLocaleString();
}

function compact(n, isMasked = false) {
    if (isMasked) return MASK;
    if (!Number.isFinite(n)) return '—';
    const a = Math.abs(n);
    if (a >= ABSURD) return n.toExponential(2);
    if (a >= 1e7) return (n / 1e7).toFixed(2) + ' Cr';
    if (a >= 1e5) return (n / 1e5).toFixed(2) + ' Lac';
    return full(n, false);
}

function rs(n, isMasked = false) {
    if (isMasked) return 'Rs. ' + MASK;
    if (n < 0) return '-Rs. ' + compact(Math.abs(n), false);
    return 'Rs. ' + compact(n, false);
}

/**
 * Calculates gold rate per tola or gram based on spot rate and karat.
 */
function getGoldRate({ karat = '24K', unit = 'tola', spotPerOztUsd = 4000, pkrUsd = 278 }) {
    const purity = KARAT_PURITY[karat] || 1;
    const basePkrPerOzt = spotPerOztUsd * pkrUsd;
    const ratePerTola = basePkrPerOzt * TOLA_PER_OZT * purity;
    const ratePerGram = basePkrPerOzt * GRAM_PER_OZT * purity;
    return unit === 'gram' ? Math.round(ratePerGram) : Math.round(ratePerTola);
}

/**
 * Computes net worth from asset categories and liabilities.
 */
function computeNetWorth({ categories = {}, liabilities = 0 }) {
    let grossAssets = 0;
    for (const key of Object.keys(categories)) {
        grossAssets += Math.max(0, categories[key] || 0);
    }
    const netWorth = grossAssets - Math.max(0, liabilities || 0);
    return { grossAssets, netWorth, liabilities };
}

module.exports = {
    MAX_YEARS,
    WITHDRAW,
    KARAT_PURITY,
    TOLA_PER_OZT,
    GRAM_PER_OZT,
    project,
    calculatePortfolioBreakdown,
    compact,
    full,
    rs,
    getGoldRate,
    computeNetWorth
};
