import { test, expect, openPage } from './support/site.mjs';
import { choose } from '../helpers/tools.mjs';

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

