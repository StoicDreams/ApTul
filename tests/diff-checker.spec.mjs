import { test, expect, openPage } from './support/site.mjs';
import { typeInto } from './support/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/diff-checker');
});

const tool = page => page.locator('app-diff-checker');

test('marks removed and added lines', async ({ page }) => {
    await typeInto(tool(page), 'Original text', 'one\ntwo\nthree');
    await typeInto(tool(page), 'Changed text', 'one\nTWO\nthree\nfour');
    const compare = tool(page).locator('webui-content-compare');
    await expect(compare).toBeVisible();
    // The compare view has no height of its own, so the tool must give it one or the lines are invisible.
    // The lines sit in a scrolling container that clips them, so check the container's own height.
    await expect.poll(() => compare.locator('.compare-container').evaluate(el => el.clientHeight)).toBeGreaterThan(50);
    await expect(compare.locator('.diff-cell.delete')).toContainText(['two']);
    await expect(compare.locator('.diff-cell.insert')).toContainText(['TWO', 'four']);
});

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
    expect(await page.evaluate(() => window.__attacked)).toBeUndefined();
});
