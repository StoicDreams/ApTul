import { test, expect, openPage } from './support/site.mjs';
import { choose } from './support/tools.mjs';
import { download } from './support/pdf.mjs';

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

test('makes a code from a link and shows it', async ({ page }) => {
    await expect(tool(page).locator('.qr-result')).toBeHidden();
    await field(page, 'Link or text').fill('https://aptul.com');
    await expect(tool(page).locator('.qr-result')).toBeVisible();
    await expect.poll(() => lastCode(page)).toBe('https://aptul.com');
    expect(await tool(page).locator('img.qr-preview').getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
});

test('Wi-Fi codes escape special characters, and open networks have no password', async ({ page }) => {
    await choose(tool(page), 'Type', 'wifi');
    await field(page, 'Network name (SSID)').fill('Cafe;Guest');
    await field(page, 'Password').fill('pa:ss"word');
    await expect.poll(() => lastCode(page)).toBe('WIFI:T:WPA;S:Cafe\\;Guest;P:pa\\:ss\\"word;;');
    await tool(page).locator('input[name="hidden"]').check();
    await expect.poll(() => lastCode(page)).toBe('WIFI:T:WPA;S:Cafe\\;Guest;P:pa\\:ss\\"word;H:true;;');
    await field(page, 'Password').fill('');
    await expect.poll(() => lastCode(page)).toBe('WIFI:T:nopass;S:Cafe\\;Guest;H:true;;');
});

test('email, phone, and text message codes use the formats phones expect', async ({ page }) => {
    await choose(tool(page), 'Type', 'email');
    await field(page, 'Email address').fill('ana@example.com');
    await field(page, 'Subject').fill('Hello there & welcome');
    await expect.poll(() => lastCode(page)).toBe('mailto:ana@example.com?subject=Hello%20there%20%26%20welcome');
    await choose(tool(page), 'Type', 'phone');
    await field(page, 'Phone number').fill('+1 (555) 123-4567');
    await expect.poll(() => lastCode(page)).toBe('tel:+15551234567');
    await choose(tool(page), 'Type', 'sms');
    await field(page, 'Phone number').fill('555 0100');
    await field(page, 'Message').fill('On my way');
    await expect.poll(() => lastCode(page)).toBe('SMSTO:5550100:On my way');
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
