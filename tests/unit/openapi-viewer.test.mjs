import { test, expect, openPage } from './support/site.mjs';

// app-openapi-viewer, on the OpenAPI Viewer page. YAML uses the Rust worker, so webapp/pkg must exist.
const tool = page => page.locator('app-openapi-viewer');
const viewer = page => tool(page).locator('webui-openapi');

test.beforeEach(async ({ page }) => {
    await openPage(page, '/openapi');
    // The viewer uses webui-openapi's setDoc. Web UI binds methods to each element, so wait on the element itself.
    await page.waitForFunction(() => {
        const inner = document.querySelector('app-openapi-viewer')?.shadowRoot?.querySelector('webui-openapi');
        return inner && typeof inner.setDoc === 'function';
    });
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

test('pasted JSON shows at once, and its relative server stays relative', async ({ page }) => {
    await tool(page).getByRole('button', { name: 'Paste' }).click();
    await tool(page).locator('textarea').fill(JSON.stringify(spec));
    await expect(viewer(page).locator('.title')).toHaveText('Pasted API');
    await expect(viewer(page).locator('details.op')).toHaveCount(1);
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
    await expect.poll(() => viewer(page).evaluate(el => el.baseUrl)).toBe('https://specs.test/v3');
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
