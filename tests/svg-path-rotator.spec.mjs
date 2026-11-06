import { test, expect, openPage } from './support/site.mjs';

// Uses the Rust worker, so webapp/pkg must exist (run PowerShell/RunLocal.ps1 -PreBuildOnly or a Trunk build first).

async function calculate(page, path) {
    const rotator = page.locator('app-svg-path-rotator');
    if (path !== undefined) {
        await rotator.locator('webui-input-message textarea').fill(path);
    }
    await rotator.locator('webui-button', { hasText: 'Calculate Paths' }).click();
    return rotator;
}

test('rotates the path once for each angle', async ({ page }) => {
    await openPage(page, '/svg-path-rotator');
    const rotator = await calculate(page);
    const previews = rotator.locator('svg[viewBox="-200 -200 400 400"]');
    await expect(previews).toHaveCount(2);
    // The default angles are 0 45 90 135 180 225 270 315.
    await expect(previews.nth(1).locator('path')).toHaveCount(8);
    await expect(rotator.locator('webui-code')).toContainText('M');
});

test('treats a pasted path as data, never as HTML', async ({ page }) => {
    await openPage(page, '/svg-path-rotator');
    const attack = 'M0 0"/><img src=x onerror="window.__attacked=1"><path d="M0 0';
    const rotator = await calculate(page, attack);
    const original = rotator.locator('svg[viewBox="-200 -200 400 400"]').first().locator('path');
    await expect(original).toHaveAttribute('d', attack);
    await expect(rotator.locator('img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__attacked)).toBeUndefined();
});
