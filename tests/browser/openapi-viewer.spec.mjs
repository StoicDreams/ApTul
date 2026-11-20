import { test, expect, openPage } from '../support/site.mjs';

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

test('the sample loads as YAML into the paste box and shows its endpoints', async ({ page }) => {
    await tool(page).getByRole('button', { name: 'Try a sample' }).click();
    await expect(viewer(page).locator('.title')).toHaveText('Bookshelf API');
    await expect(tool(page).locator('button[data-mode="paste"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(tool(page).locator('textarea')).toHaveValue(/^openapi: 3\.1\.0/);
    await expect(viewer(page).locator('section.tag > h3')).toHaveText(['Books', 'Shelves']);
    await expect(viewer(page).locator('details.op')).toHaveCount(6);
    // YAML response codes such as '200' arrive as text keys.
    await viewer(page).locator('details.op[data-method="get"]').first().locator('summary').click();
    await expect(viewer(page).locator('.response[data-status="200"]').first()).toContainText('The books, newest first.');
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

test('reads a chosen YAML file in the browser', async ({ page }) => {
    await tool(page).getByRole('button', { name: 'File' }).click();
    const yaml = 'openapi: 3.0.0\ninfo:\n  title: File API\n  version: "1"\npaths:\n  /a:\n    get:\n      responses:\n        200:\n          description: OK\n';
    await tool(page).locator('input[type=file]').setInputFiles({ name: 'api.yml', mimeType: '', buffer: Buffer.from(yaml) });
    await expect(viewer(page).locator('.title')).toHaveText('File API');
    await expect(tool(page).locator('.file-name')).toHaveText('api.yml');
    await expect(tool(page).locator('.status')).toBeHidden();
});

