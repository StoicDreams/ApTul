import { test, expect, openPage } from '../support/site.mjs';
import { typeInto } from '../helpers/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/diff-checker');
});

const tool = page => page.locator('app-diff-checker');

test('marks removed and added lines', async ({ page }) => {
    await typeInto(tool(page), 'Original text', 'one\ntwo\nthree');
    await typeInto(tool(page), 'Changed text', 'one\nTWO\nthree\nfour');
    const compare = tool(page).locator('webui-content-compare');
    await expect(compare).toBeVisible();
    // The compare view has no height of its own, so the tool must give it one or its scrolling container clips the
    // lines out of sight. toBeInViewport counts that clipping, so it fails when nothing can be seen.
    await expect(compare.locator('.diff-cell.delete').first()).toBeInViewport();
    await expect(compare.locator('.diff-cell.delete')).toContainText(['two']);
    await expect(compare.locator('.diff-cell.insert')).toContainText(['TWO', 'four']);
});

