import { test, expect, openPage } from './support/site.mjs';
import { typeInto, expectOutput } from '../helpers/tools.mjs';

/** Record requests for the worker and its WebAssembly. */
function watchEngine(page) {
    const requests = [];
    page.on('request', request => {
        if (/\/(worker\.js|webapp_bg\.wasm)$/.test(new URL(request.url()).pathname)) requests.push(new URL(request.url()).pathname);
    });
    return requests;
}

test('pages that do not call the worker never download it', async ({ page }) => {
    const requests = watchEngine(page);
    await openPage(page, '/json-formatter');
    // Use the page's tool, which works without the worker, so the page has done its work before the check.
    const tool = page.locator('app-json-formatter');
    await typeInto(tool, 'JSON', '{"a":1}');
    await expectOutput(tool, '{\n  "a": 1\n}');
    expect(requests).toEqual([]);
});

