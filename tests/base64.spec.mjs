import { test, expect, openPage } from './support/site.mjs';
import { typeInto, choose, expectOutput } from './support/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/base64');
});

const tool = page => page.locator('app-base64-tool');

test('encodes UTF-8 text, including emoji', async ({ page }) => {
    await typeInto(tool(page), 'Text', 'héllo 👋');
    await expectOutput(tool(page), Buffer.from('héllo 👋').toString('base64'));
});

test('encodes with the URL-safe alphabet and no padding', async ({ page }) => {
    // These bytes produce + and / in standard Base64.
    await typeInto(tool(page), 'Text', '>>>???');
    await expectOutput(tool(page), 'Pj4+Pz8/');
    await choose(tool(page), 'Alphabet', 'url');
    await expectOutput(tool(page), 'Pj4-Pz8_');
});

test('decodes standard and URL-safe Base64, with or without padding', async ({ page }) => {
    await choose(tool(page), 'Mode', 'decode');
    await typeInto(tool(page), 'Base64', Buffer.from('héllo 👋').toString('base64'));
    await expectOutput(tool(page), 'héllo 👋');
    await typeInto(tool(page), 'Base64', 'Pj4-Pz8_');
    await expectOutput(tool(page), '>>>???');
    await typeInto(tool(page), 'Base64', 'aGk');
    await expectOutput(tool(page), 'hi');
});

test('explains input that cannot be decoded', async ({ page }) => {
    await choose(tool(page), 'Mode', 'decode');
    await typeInto(tool(page), 'Base64', 'not base64!');
    await expect(tool(page).locator('webui-alert')).toContainText('not used in Base64');
    // Valid Base64 of bytes that are not UTF-8 text, such as the start of a PNG file.
    await typeInto(tool(page), 'Base64', 'iVBORw0KGgo=');
    await expect(tool(page).locator('webui-alert')).toContainText('not text');
    await expectOutput(tool(page), '');
});

test('encodes a dropped file', async ({ page }) => {
    await tool(page).locator('app-file-drop').evaluate(el => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([new Uint8Array([0, 1, 2, 250, 251, 252])], 'bytes.bin', { type: 'application/octet-stream' }));
        for (const event of ['dragenter', 'dragover', 'drop']) {
            el.dispatchEvent(new DragEvent(event, { bubbles: true, cancelable: true, dataTransfer: transfer }));
        }
    });
    await expectOutput(tool(page), Buffer.from([0, 1, 2, 250, 251, 252]).toString('base64'));
    await expect(tool(page).locator('webui-alert')).toContainText('Encoded bytes.bin');
});

test('encodes a file chosen with the select button', async ({ page }) => {
    await tool(page).locator('webui-file-select input[type=file]').setInputFiles({ name: 'chosen.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 1, 2, 250, 251, 252]) });
    await expectOutput(tool(page), Buffer.from([0, 1, 2, 250, 251, 252]).toString('base64'));
    await expect(tool(page).locator('webui-alert')).toContainText('Encoded chosen.bin');
});
