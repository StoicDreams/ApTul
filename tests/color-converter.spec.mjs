import { test, expect, openPage } from './support/site.mjs';
import { typeInto, expectCode } from './support/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/color-converter');
});

const tool = page => page.locator('app-color-converter');

test('converts HEX to every format', async ({ page }) => {
    await typeInto(tool(page), 'Color', '#ff8800');
    await expectCode(tool(page), 'HEX', '#ff8800');
    await expectCode(tool(page), 'RGB', 'rgb(255, 136, 0)');
    await expectCode(tool(page), 'HSL', 'hsl(32, 100%, 50%)');
    await expectCode(tool(page), 'CMYK (approximate, for print)', 'cmyk(0%, 47%, 100%, 0%)');
});

test('reads named colors, rgb, and hsl', async ({ page }) => {
    await typeInto(tool(page), 'Color', 'rebeccapurple');
    await expectCode(tool(page), 'HEX', '#663399');
    await typeInto(tool(page), 'Color', 'hsl(120, 100%, 25%)');
    await expectCode(tool(page), 'HEX', '#008000');
});

test('keeps transparency', async ({ page }) => {
    await typeInto(tool(page), 'Color', 'rgba(255, 0, 0, 0.5)');
    await expectCode(tool(page), 'RGB', 'rgba(255, 0, 0, 0.5)');
    await expectCode(tool(page), 'HEX', '#ff000080');
});

test('follows the color picker', async ({ page }) => {
    await tool(page).locator('input[type=color]').fill('#123456');
    await expectCode(tool(page), 'RGB', 'rgb(18, 52, 86)');
});

test('explains input that is not a color', async ({ page }) => {
    await typeInto(tool(page), 'Color', 'not a color');
    await expect(tool(page).locator('webui-alert')).toContainText('not a color');
    await expect(tool(page).locator('.color-results')).toBeHidden();
});
