import { test, expect, openPage } from './support/site.mjs';
import { typeInto, choose, expectCode, codeText } from './support/tools.mjs';

// Expected values come from Node's crypto module.
test.beforeEach(async ({ page }) => {
    await openPage(page, '/hash-generator');
});

const tool = page => page.locator('app-hash-generator');

test('hashes text with every algorithm', async ({ page }) => {
    await typeInto(tool(page), 'Text', 'abc');
    await expectCode(tool(page), 'MD5', '900150983cd24fb0d6963f7d28e17f72');
    await expectCode(tool(page), 'SHA-1', 'a9993e364706816aba3e25717850c26c9cd0d89d');
    await expectCode(tool(page), 'SHA-256', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(await codeText(tool(page), 'SHA-384')).toMatch(/^cb00753f45a35e8b[0-9a-f]{80}$/);
    expect(await codeText(tool(page), 'SHA-512')).toMatch(/^[0-9a-f]{128}$/);
});

test('hashes text as UTF-8, and can show uppercase', async ({ page }) => {
    await typeInto(tool(page), 'Text', 'héllo');
    await expectCode(tool(page), 'SHA-256', '3c48591d8d098a4538f5e013dfcf406e948eac4d3277b10bf614e295d6068179');
    await choose(tool(page), 'Letters', 'upper');
    await expectCode(tool(page), 'SHA-256', '3C48591D8D098A4538F5E013DFCF406E948EAC4D3277B10BF614E295D6068179');
});

test('hashes a dropped file byte for byte', async ({ page }) => {
    await tool(page).locator('app-file-drop').evaluate(el => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([new Uint8Array([0, 1, 2, 250])], 'data.bin'));
        for (const event of ['dragenter', 'dragover', 'drop']) {
            el.dispatchEvent(new DragEvent(event, { bubbles: true, cancelable: true, dataTransfer: transfer }));
        }
    });
    await expect.poll(() => codeText(tool(page), 'SHA-512')).toMatch(/^cc0458bb4e916bb5/);
    await expect(tool(page).locator('webui-alert')).toContainText('Hashed data.bin');
});

test('says whether a pasted hash matches', async ({ page }) => {
    await typeInto(tool(page), 'Text', 'abc');
    await typeInto(tool(page), 'Compare with', '  A9993E364706816ABA3E25717850C26C9CD0D89D ');
    await expect(tool(page).locator('webui-alert')).toContainText('Match: The text has this SHA-1 hash.');
    await typeInto(tool(page), 'Compare with', 'abc123');
    await expect(tool(page).locator('webui-alert')).toContainText('No match');
});

test('hides the hashes when the text is cleared', async ({ page }) => {
    await typeInto(tool(page), 'Text', 'abc');
    await expect(tool(page).locator('.hash-results')).toBeVisible();
    await typeInto(tool(page), 'Text', '');
    await expect(tool(page).locator('.hash-results')).toBeHidden();
});

test('hashes a file chosen with the select button', async ({ page }) => {
    await tool(page).locator('webui-file-select input[type=file]').setInputFiles({ name: 'chosen.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 1, 2, 250]) });
    await expect.poll(() => codeText(tool(page), 'SHA-512')).toMatch(/^cc0458bb4e916bb5/);
    await expect(tool(page).locator('webui-alert')).toContainText('Hashed chosen.bin');
});
