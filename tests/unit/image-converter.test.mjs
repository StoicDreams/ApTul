import { test, expect, openPage, readJson, ROOT_FILES } from './support/site.mjs';
import { join } from 'node:path';

// Uses the Rust worker, so webapp/pkg must exist (run PowerShell/RunLocal.ps1 -PreBuildOnly or a Trunk build first).

const tool = page => page.locator('app-image-converter');

test.beforeEach(async ({ page }) => {
    await openPage(page, '/image-converter');
});

test('the tool is built in the page, so Web UI styles reach it without linking the stylesheet', async ({ page }) => {
    await expect(tool(page).locator('webui-page-segment').first()).toBeVisible();
    await expect.poll(() => tool(page).evaluate(el => el.shadowRoot)).toBe(null);
    // The rule that hides an empty paragraph comes from webui.css.
    await expect(tool(page).locator('p.convertNote')).toBeHidden();
});

test.describe('format pages start with their format chosen', () => {
    const pages = { '/png-to-webp': 'webp', '/jpg-to-webp': 'webp', '/webp-to-png': 'png', '/webp-to-jpg': 'jpg', '/png-to-jpg': 'jpg', '/jpg-to-png': 'png', '/favicon-generator': 'ico', '/resize-image': 'same', '/remove-exif': 'same' };
    const registered = readJson(join(ROOT_FILES, 'tools.json')).tools.map(t => t.url);
    for (const [url, format] of Object.entries(pages)) {
        test(url, async ({ page }) => {
            expect(registered).toContain(url);
            await openPage(page, url);
            await expect.poll(() => tool(page).locator('webui-dropdown[label="Convert To"] select').inputValue()).toBe(format);
        });
    }
});

