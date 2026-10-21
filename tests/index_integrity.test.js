const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('index.html Self-Test Suite & Integrity', () => {
    test('index.html internal selfTest() passes all 31+ test checks with 0 failures', () => {
        const indexPath = path.join(__dirname, '..', 'index.html');
        const html = fs.readFileSync(indexPath, 'utf8');
        const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

        assert.ok(scriptMatch, 'index.html should have a script block');

        const sandbox = {
            console,
            Math,
            Number,
            parseInt,
            parseFloat,
            location: { hash: '' },
            document: {
                getElementById: () => ({ value: '', innerText: '', style: {} }),
                querySelectorAll: () => [],
                addEventListener: () => {}
            },
            window: { addEventListener: () => {} },
            localStorage: { getItem: () => null, setItem: () => {} }
        };

        vm.createContext(sandbox);
        vm.runInContext(scriptMatch[1], sandbox);

        assert.equal(typeof sandbox.selfTest, 'function', 'selfTest function should exist');
        const result = sandbox.selfTest();

        assert.ok(result.pass >= 30, `Expected at least 30 passed checks, got ${result.pass}`);
        assert.equal(result.fail, 0, `Expected 0 failures, got ${result.fail}`);
    });
});
