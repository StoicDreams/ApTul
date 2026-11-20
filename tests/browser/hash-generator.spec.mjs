import { test, expect, openPage } from '../support/site.mjs';
import { codeText } from '../helpers/tools.mjs';

// Expected values come from Node's crypto module.
test.beforeEach(async ({ page }) => {
    await openPage(page, '/hash-generator');
});

const tool = page => page.locator('app-hash-generator');

test('hashes a file chosen with the select button', async ({ page }) => {
    await tool(page).locator('webui-file-select input[type=file]').setInputFiles({ name: 'chosen.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 1, 2, 250]) });
    await expect.poll(() => codeText(tool(page), 'SHA-512')).toMatch(/^cc0458bb4e916bb5/);
    await expect(tool(page).locator('webui-alert')).toContainText('Hashed chosen.bin');
});
