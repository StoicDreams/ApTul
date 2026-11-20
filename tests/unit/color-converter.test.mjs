import { test, expect, openPage } from './support/site.mjs';
import { typeInto } from '../helpers/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/color-converter');
});

const tool = page => page.locator('app-color-converter');

test('explains input that is not a color', async ({ page }) => {
    await typeInto(tool(page), 'Color', 'not a color');
    await expect(tool(page).locator('webui-alert')).toContainText('not a color');
    await expect(tool(page).locator('.color-results')).toBeHidden();
});
