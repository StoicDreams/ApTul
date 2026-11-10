import { test, expect, openPage } from './support/site.mjs';
import { typeInto } from './support/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/contrast-checker');
});

const tool = page => page.locator('app-contrast-checker');
const level = (page, name) => tool(page).locator(`[data-level="${name}"]`);

test('black on white is 21:1 and passes every level', async ({ page }) => {
    await typeInto(tool(page), 'Text color', '#000');
    await typeInto(tool(page), 'Background color', '#fff');
    await expect(tool(page).locator('.contrast-ratio')).toHaveText('21.00 : 1');
    await expect(tool(page).locator('[data-level]', { hasText: 'Fail' })).toHaveCount(0);
});

test('#777777 on white passes large text but not normal text, and is not rounded up', async ({ page }) => {
    await typeInto(tool(page), 'Text color', '#777777');
    await typeInto(tool(page), 'Background color', 'white');
    // The exact ratio is 4.478..., which must show as 4.47, not 4.48 or 4.5.
    await expect(tool(page).locator('.contrast-ratio')).toHaveText('4.47 : 1');
    await expect(level(page, 'AA, normal text')).toHaveText('Fail');
    await expect(level(page, 'AA, large text (24px, or 19px bold)')).toHaveText('Pass');
    await expect(level(page, 'AAA, normal text')).toHaveText('Fail');
});

test('explains an unreadable color', async ({ page }) => {
    await typeInto(tool(page), 'Background color', 'not a color');
    await expect(tool(page).locator('webui-alert')).toContainText('background color is not a color');
    await expect(tool(page).locator('[data-level]')).toHaveCount(0);
});

test('swaps the text and background colors', async ({ page }) => {
    await typeInto(tool(page), 'Text color', '#000000');
    await typeInto(tool(page), 'Background color', '#777777');
    await tool(page).getByRole('button', { name: 'Swap the text and background colors' }).click();
    await expect(tool(page).locator('webui-input-message[label="Text color"] textarea')).toHaveValue('#777777');
    await expect(tool(page).locator('webui-input-message[label="Background color"] textarea')).toHaveValue('#000000');
    await expect(tool(page).locator('.contrast-preview')).toHaveCSS('color', 'rgb(119, 119, 119)');
});

test('sums up the result in words', async ({ page }) => {
    const verdict = tool(page).locator('.verdict');
    await typeInto(tool(page), 'Text color', '#000');
    await typeInto(tool(page), 'Background color', '#fff');
    await expect(verdict).toHaveText('Passes AAA for all text');
    await typeInto(tool(page), 'Text color', '#777777');
    await expect(verdict).toHaveText('Passes AA for large text and graphics only');
    await typeInto(tool(page), 'Text color', '#eeeeee');
    await expect(verdict).toHaveText('Fails every level');
});
