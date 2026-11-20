import { test, expect, openPage } from './support/site.mjs';
import { typeInto } from '../helpers/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/contrast-checker');
});

const tool = page => page.locator('app-contrast-checker');
const level = (page, name) => tool(page).locator(`[data-level="${name}"]`);

test('explains an unreadable color', async ({ page }) => {
    await typeInto(tool(page), 'Background color', 'not a color');
    await expect(tool(page).locator('webui-alert')).toContainText('background color is not a color');
    await expect(tool(page).locator('[data-level]')).toHaveCount(0);
});

