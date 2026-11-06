import { test, expect, openPage } from './support/site.mjs';
import { typeInto, expectCode, codeText } from './support/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/timestamp-converter');
});

const tool = page => page.locator('app-timestamp-converter');

test('starts with the current time', async ({ page }) => {
    const now = Math.floor(Date.now() / 1000);
    await expect.poll(async () => parseInt(await codeText(tool(page), 'Unix timestamp (seconds)'))).toBeGreaterThanOrEqual(now - 5);
});

test('reads seconds, milliseconds, microseconds, and nanoseconds', async ({ page }) => {
    for (const [input, unit] of [['1700000000', 'seconds'], ['1700000000000', 'milliseconds'], ['1700000000000000', 'microseconds'], ['1700000000000000000', 'nanoseconds']]) {
        await typeInto(tool(page), 'Timestamp or date', input);
        await expectCode(tool(page), 'ISO 8601 (UTC)', '2023-11-14T22:13:20.000Z');
        await expect(tool(page).locator('webui-alert')).toHaveText(`Read as ${unit}.`);
    }
});

test('converts dates to timestamps', async ({ page }) => {
    await typeInto(tool(page), 'Timestamp or date', '2023-11-14T22:13:20Z');
    await expectCode(tool(page), 'Unix timestamp (seconds)', '1700000000');
    await expectCode(tool(page), 'Unix timestamp (milliseconds)', '1700000000000');
    await expectCode(tool(page), 'UTC', 'Tue, 14 Nov 2023 22:13:20 GMT');
    await expect(tool(page).locator('webui-alert')).toBeHidden();
});

test('reads a date with a space before the time as local time', async ({ page }) => {
    await typeInto(tool(page), 'Timestamp or date', '2026-01-31 14:30');
    const expected = `${new Date(2026, 0, 31, 14, 30).getTime() / 1000}`;
    // The page and the test run in the same time zone, so local times agree.
    const pageExpected = await page.evaluate(() => `${new Date(2026, 0, 31, 14, 30).getTime() / 1000}`);
    await expectCode(tool(page), 'Unix timestamp (seconds)', pageExpected || expected);
});

test('explains input it cannot read', async ({ page }) => {
    await typeInto(tool(page), 'Timestamp or date', 'next tuesday');
    await expect(tool(page).locator('webui-alert')).toContainText('Enter a Unix timestamp');
    await expect(tool(page).locator('app-tool-output:visible')).toHaveCount(0);
});
