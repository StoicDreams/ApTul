import { test, expect, openPage } from './support/site.mjs';

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
    await page.waitForTimeout(500);
    expect(requests).toEqual([]);
});

test('the first call starts the worker and waits for it to load', async ({ page }) => {
    const requests = watchEngine(page);
    await openPage(page, '/json-formatter');
    // Called straight away, before the WebAssembly has had time to load.
    const svg = await page.evaluate(() => webui.worker.qr_code('https://aptul.com', 'M', '#000000', '#ffffff'));
    expect(svg).toMatch(/^<svg /);
    expect(requests).toEqual(expect.arrayContaining(['/worker.js', '/webapp_bg.wasm']));
});

test('errors and unknown functions reject instead of hanging', async ({ page }) => {
    await openPage(page, '/json-formatter');
    const results = await page.evaluate(async () => Promise.all([
        webui.worker.qr_code('', 'M', '#000', '#fff').then(() => 'resolved', e => `${e}`),
        webui.worker.no_such_function().then(() => 'resolved', e => `${e}`),
    ]));
    expect(results[0]).toContain('Enter something');
    expect(results[1]).toContain('Unknown worker function');
});

test('binary data goes to the worker and back', async ({ page }) => {
    await openPage(page, '/json-formatter');
    const result = await page.evaluate(async () => {
        const out = await webui.worker.extract_pdf_pages(new Uint8Array([1, 2, 3]), new Uint32Array([1]));
        return out;
    }).then(() => 'resolved', e => `${e}`);
    expect(result).toContain('could not be read as a PDF');
});
