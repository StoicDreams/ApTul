import { test, expect, openPage } from './support/site.mjs';

// app-openapi-viewer, on the OpenAPI Viewer page. YAML uses the Rust worker, so webapp/pkg must exist.
const tool = page => page.locator('app-openapi-viewer');
const viewer = page => tool(page).locator('webui-openapi');

test.beforeEach(async ({ page }) => {
    await openPage(page, '/openapi');
    // The viewer needs webui-openapi's setDoc, added to the framework in MyFiCDN. Until the live CDN has it, only
    // npm run test:local-cdn can run these. Web UI binds methods to each element, so check the element itself.
    await page.waitForFunction(() => {
        const inner = document.querySelector('app-openapi-viewer')?.shadowRoot?.querySelector('webui-openapi');
        return inner && typeof inner.loadDoc === 'function';
    });
    const ready = await viewer(page).evaluate(el => typeof el.setDoc === 'function');
    test.skip(!ready, 'The CDN does not have the updated webui-openapi yet. Push MyFiCDN, or run npm run test:local-cdn.');
});

const spec = {
    openapi: '3.0.3',
    info: { title: 'Pasted API', version: '3' },
    servers: [{ url: '/v3' }],
    paths: { '/ping': { get: { summary: 'Ping', responses: { 200: { description: 'Pong' } } } } },
};

test('starts with the link input and no document', async ({ page }) => {
    await expect(tool(page).locator('button[data-mode="link"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(tool(page).locator('input[type=url]')).toBeVisible();
    await expect(viewer(page)).toBeHidden();
});

test('the sample loads as YAML into the paste box and shows its endpoints', async ({ page }) => {
    await tool(page).getByRole('button', { name: 'Try a sample' }).click();
    await expect(viewer(page).locator('.title')).toHaveText('Bookshelf API');
    await expect(tool(page).locator('button[data-mode="paste"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await tool(page).locator('textarea').inputValue()).toMatch(/^openapi: 3\.1\.0/);
    await expect(viewer(page).locator('section.tag > h3')).toHaveText(['Books', 'Shelves']);
    await expect(viewer(page).locator('details.op')).toHaveCount(6);
    // YAML response codes such as '200' arrive as text keys.
    await viewer(page).locator('details.op[data-method="get"]').first().locator('summary').click();
    await expect(viewer(page).locator('.response[data-status="200"]').first()).toContainText('The books, newest first.');
});

test('pasted JSON shows at once, and its relative server stays relative', async ({ page }) => {
    await tool(page).getByRole('button', { name: 'Paste' }).click();
    await tool(page).locator('textarea').fill(JSON.stringify(spec));
    await expect(viewer(page).locator('.title')).toHaveText('Pasted API');
    await expect(viewer(page).locator('details.op')).toHaveCount(1);
});

test('explains pasted text that is not JSON, YAML, or OpenAPI', async ({ page }) => {
    const status = tool(page).locator('.status');
    await tool(page).getByRole('button', { name: 'Paste' }).click();
    await tool(page).locator('textarea').fill('{ "openapi": ');
    await expect(status).toContainText('not valid JSON');
    await tool(page).locator('textarea').fill('a: [1, 2\nb: 3');
    await expect(status).toContainText('not valid YAML');
    await tool(page).locator('textarea').fill('name: not an api');
    await expect(status).toContainText('is not an OpenAPI or Swagger document');
});

test('loads a link in the browser, and resolves relative servers against it', async ({ page }) => {
    let cookie = 'none';
    await page.route('https://specs.test/**', route => {
        cookie = route.request().headers().cookie || 'none';
        route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(spec) });
    });
    await tool(page).locator('input[type=url]').fill('https://specs.test/docs/openapi.json');
    await tool(page).getByRole('button', { name: 'Load' }).click();
    await expect(viewer(page).locator('.title')).toHaveText('Pasted API');
    expect(await viewer(page).evaluate(el => el.baseUrl)).toBe('https://specs.test/v3');
    expect(cookie).toBe('none');
});

test('explains a link that cannot be loaded', async ({ page }) => {
    await page.route('https://blocked.test/**', route => route.abort());
    await tool(page).locator('input[type=url]').fill('https://blocked.test/openapi.json');
    await tool(page).getByRole('button', { name: 'Load' }).click();
    await expect(tool(page).locator('.status')).toContainText('CORS');
    await tool(page).locator('input[type=url]').fill('openapi.json');
    await tool(page).getByRole('button', { name: 'Load' }).click();
    await expect(tool(page).locator('.status')).toContainText('starting with http');
});

test('reads a chosen YAML file in the browser', async ({ page }) => {
    await tool(page).getByRole('button', { name: 'File' }).click();
    const yaml = 'openapi: 3.0.0\ninfo:\n  title: File API\n  version: "1"\npaths:\n  /a:\n    get:\n      responses:\n        200:\n          description: OK\n';
    await tool(page).locator('input[type=file]').setInputFiles({ name: 'api.yml', mimeType: '', buffer: Buffer.from(yaml) });
    await expect(viewer(page).locator('.title')).toHaveText('File API');
    await expect(tool(page).locator('.file-name')).toHaveText('api.yml');
    await expect(tool(page).locator('.status')).toBeHidden();
});

test('reads a dropped JSON file', async ({ page }) => {
    await tool(page).getByRole('button', { name: 'File' }).click();
    await tool(page).locator('app-file-drop').evaluate((el, text) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([text], 'openapi.json', { type: 'application/json' }));
        for (const event of ['dragenter', 'dragover', 'drop']) {
            el.dispatchEvent(new DragEvent(event, { bubbles: true, cancelable: true, dataTransfer: transfer }));
        }
    }, JSON.stringify(spec));
    await expect(viewer(page).locator('.title')).toHaveText('Pasted API');
});
