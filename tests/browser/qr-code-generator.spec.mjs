import { test, expect, openPage } from '../support/site.mjs';
import { choose } from '../helpers/tools.mjs';
import { download } from '../helpers/pdf.mjs';

const tool = page => page.locator('app-qr-code-generator');
const field = (page, label) => tool(page).locator(`webui-input-message[label="${label}"]:visible textarea`);

test.beforeEach(async ({ page }) => {
    await openPage(page, '/qr-code-generator');
    // Record the text each code is made from, since that is what phones read.
    await page.evaluate(() => {
        const real = webui.worker;
        window.__qr = [];
        webui.worker = new Proxy({}, { get: (_, name) => (...args) => {
            if (name === 'qr_code') window.__qr.push(args[0]);
            return real[name](...args);
        } });
    });
});

const lastCode = page => page.evaluate(() => window.__qr[window.__qr.length - 1]);

/**
 * Resolves with true once the element's text becomes `text`. Start it before the click: a label such as "Copied" only
 * shows for a moment, and a check after the click can miss it on a slow machine.
 */
function textBecomes(locator, text) {
    return locator.evaluate((el, text) => new Promise(resolve => {
        const observer = new MutationObserver(() => {
            if (el.innerText.trim() === text) {
                observer.disconnect();
                resolve(true);
            }
        });
        observer.observe(el, { childList: true, characterData: true, subtree: true });
    }), text);
}

test('makes a code from a link and shows it', async ({ page }) => {
    await expect(tool(page).locator('.qr-result')).toBeHidden();
    await field(page, 'Link or text').fill('https://aptul.com');
    await expect(tool(page).locator('.qr-result')).toBeVisible();
    await expect.poll(() => lastCode(page)).toBe('https://aptul.com');
    await expect(tool(page).locator('img.qr-preview')).toHaveAttribute('src', /^data:image\/svg\+xml/);
});

test('downloads a PNG at the chosen size, and an SVG', async ({ page }) => {
    await field(page, 'Link or text').fill('https://aptul.com');
    await expect(tool(page).locator('.qr-result')).toBeVisible();
    await choose(tool(page), 'PNG Size', '512');
    const png = await download(page, () => tool(page).locator('webui-button.download-png').click());
    expect(png.name).toBe('qr-code.png');
    // PNG stores its width and height at bytes 16 to 23.
    expect([png.bytes.readUInt32BE(16), png.bytes.readUInt32BE(20)]).toEqual([512, 512]);
    const svg = await download(page, () => tool(page).locator('webui-button.download-svg').click());
    expect(svg.name).toBe('qr-code.svg');
    expect(svg.bytes.toString()).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 \d+ \d+"/);
});

test('copies the code to the clipboard as a PNG at the chosen size', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await field(page, 'Link or text').fill('https://aptul.com');
    await expect(tool(page).locator('.qr-result')).toBeVisible();
    await choose(tool(page), 'PNG Size', '256');
    const button = tool(page).locator('webui-button.copy-image');
    const copied = textBecomes(button, 'Copied');
    await button.click();
    expect(await copied).toBe(true);
    const size = await page.evaluate(async () => {
        const [item] = await navigator.clipboard.read();
        const bitmap = await createImageBitmap(await item.getType('image/png'));
        return [item.types, bitmap.width, bitmap.height];
    });
    expect(size).toEqual([['image/png'], 256, 256]);
    await expect(button).toHaveText('Copy Image');
});

test('warns about colors that are hard to scan, and text too long to fit', async ({ page }) => {
    const status = tool(page).locator('webui-alert');
    await field(page, 'Link or text').fill('hello');
    await tool(page).locator('input[name="dark"]').fill('#ffffff');
    await tool(page).locator('input[name="light"]').fill('#000000');
    await expect(status).toContainText('lighter than its background');
    await tool(page).locator('input[name="dark"]').fill('#cccccc');
    await tool(page).locator('input[name="light"]').fill('#ffffff');
    await expect(status).toContainText('hard to scan');
    await choose(tool(page), 'Error Correction', 'H');
    await field(page, 'Link or text').fill('x'.repeat(2000));
    await expect(status).toContainText('too much to fit');
    await expect(tool(page).locator('.qr-result')).toBeHidden();
});
