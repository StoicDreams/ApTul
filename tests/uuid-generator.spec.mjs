import { test, expect, openPage } from './support/site.mjs';
import { choose, outputText } from './support/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/uuid-generator');
});

const tool = page => page.locator('app-uuid-generator');
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

async function setCount(page, n) {
    const input = tool(page).locator('webui-input-text[label="How many"] input');
    await input.fill(`${n}`);
    await input.dispatchEvent('change');
}

test('shows a version 4 UUID straight away', async ({ page }) => {
    await expect.poll(() => outputText(tool(page))).toMatch(V4);
});

test('generates the number asked for, all unique', async ({ page }) => {
    await setCount(page, 50);
    await tool(page).locator('webui-button', { hasText: 'Generate' }).click();
    await expect.poll(async () => (await outputText(tool(page))).split('\n').length).toBe(50);
    const list = (await outputText(tool(page))).split('\n');
    expect(new Set(list).size).toBe(50);
    list.forEach(uuid => expect(uuid).toMatch(V4));
});

test('version 7 UUIDs start with the current time and sort in order', async ({ page }) => {
    const before = Date.now();
    await setCount(page, 20);
    await choose(tool(page), 'Version', '7');
    await expect.poll(async () => (await outputText(tool(page))).split('\n').length).toBe(20);
    const list = (await outputText(tool(page))).split('\n');
    list.forEach(uuid => expect(uuid).toMatch(V7));
    expect([...list].sort()).toEqual(list);
    const time = parseInt(list[0].replace(/-/g, '').slice(0, 12), 16);
    expect(time).toBeGreaterThanOrEqual(before);
    expect(time).toBeLessThanOrEqual(Date.now());
});

test('applies uppercase, no hyphens, and braces', async ({ page }) => {
    await choose(tool(page), 'Letters', 'upper');
    await choose(tool(page), 'Hyphens', 'no');
    await choose(tool(page), 'Braces', 'yes');
    await expect.poll(() => outputText(tool(page))).toMatch(/^\{[0-9A-F]{12}4[0-9A-F]{3}[89AB][0-9A-F]{15}\}$/);
});

test('limits the count to 1,000', async ({ page }) => {
    await setCount(page, 5000);
    await tool(page).locator('webui-button', { hasText: 'Generate' }).click();
    await expect.poll(async () => (await outputText(tool(page))).split('\n').length).toBe(1000);
});
