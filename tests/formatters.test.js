const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { compact, full, rs } = require('../src/calculator');

describe('Formatting Utilities (Cr, Lac, Plain, Privacy Mask)', () => {
    test('Crores formatting for values >= 1 Crore (10,000,000)', () => {
        assert.equal(compact(10000000), '1.00 Cr');
        assert.equal(compact(38800000), '3.88 Cr');
        assert.equal(rs(1365800000), 'Rs. 136.58 Cr');
    });

    test('Lacs formatting for values between 1 Lac (100,000) and 1 Cr', () => {
        assert.equal(compact(100000), '1.00 Lac');
        assert.equal(compact(5500000), '55.00 Lac');
        assert.equal(rs(650000), 'Rs. 6.50 Lac');
    });

    test('Plain formatting for numbers under 1 Lac', () => {
        assert.equal(compact(999), '999');
        assert.equal(compact(54321), '54,321');
        assert.equal(rs(750), 'Rs. 750');
    });

    test('Negative numbers formatting with -Rs.', () => {
        assert.equal(rs(-500000), '-Rs. 5.00 Lac');
        assert.equal(rs(-20000000), '-Rs. 2.00 Cr');
    });

    test('Non-finite numbers produce clean dash', () => {
        assert.equal(compact(NaN), '—');
        assert.equal(compact(Infinity), '—');
        assert.equal(full(-Infinity), '—');
    });

    test('Privacy mask mode returns *****', () => {
        assert.equal(compact(5000000, true), '*****');
        assert.equal(full(5000000, true), '*****');
        assert.equal(rs(5000000, true), 'Rs. *****');
    });
});
