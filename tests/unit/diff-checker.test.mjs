import { test, expect, openPage } from './support/site.mjs';
import { typeInto } from '../helpers/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/diff-checker');
});

const tool = page => page.locator('app-diff-checker');

test('says when the texts are identical, ignoring line endings', async ({ page }) => {
    await typeInto(tool(page), 'Original text', 'same\ntext');
    await typeInto(tool(page), 'Changed text', 'same\r\ntext');
    await expect(tool(page).locator('webui-alert')).toHaveText('The two texts are identical.');
    await expect(tool(page).locator('webui-content-compare')).toBeHidden();
});

test('shows pasted HTML as text', async ({ page }) => {
    await typeInto(tool(page), 'Original text', 'a');
    await typeInto(tool(page), 'Changed text', '<img src=x onerror="window.__attacked=1">');
    await expect(tool(page).locator('webui-content-compare .diff-cell.insert')).toContainText(['<img src=x']);
    await expect(tool(page).locator('webui-content-compare img')).toHaveCount(0);
    // No image element was made from the text, so nothing can run its onerror.
    await expect.poll(() => page.evaluate(() => window.__attacked)).toBeUndefined();
});
