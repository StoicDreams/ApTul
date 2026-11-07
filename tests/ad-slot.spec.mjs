import { test, expect, openPage, readJson, readText, routeToFile, ROOT_FILES } from './support/site.mjs';
import { join } from 'node:path';

const ADS = { network: 'adsense', client: 'ca-pub-1234567890123456', slots: { content: '1111111111', footer: '2222222222' } };
const SCRIPT = /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/;

/** Serve appConfig.json with ads set up, and a stand-in for the ad script that counts what it is asked to do. */
async function withAds(page, ads = ADS, { blockScript = false } = {}) {
    const requests = [];
    const config = { ...readJson(join(ROOT_FILES, 'appConfig.json')), ads };
    await page.route('**/appConfig.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(config) }));
    await page.route(SCRIPT, route => {
        requests.push(route.request().url());
        if (blockScript) return route.abort();
        return route.fulfill({ contentType: 'text/javascript', body: 'window.__adScriptRuns = (window.__adScriptRuns || 0) + 1;' });
    });
    return requests;
}

test('without ads set up, slots stay hidden and no ad script loads', async ({ page }) => {
    const requests = [];
    await page.route(SCRIPT, route => { requests.push(route.request().url()); return route.abort(); });
    await openPage(page, '/json-formatter');
    const slots = page.locator('app-ad-slot');
    await expect(slots).toHaveCount(2);
    await expect(slots.first()).toBeHidden();
    expect(await slots.first().evaluate(el => el.getBoundingClientRect().height)).toBe(0);
    await page.mouse.wheel(0, 20000);
    await page.waitForTimeout(300);
    expect(requests).toEqual([]);
    expect(await page.locator('ins.adsbygoogle').count()).toBe(0);
});

test('with ads set up, slots reserve space and load their ad once in view', async ({ page }) => {
    const requests = await withAds(page);
    await openPage(page, '/json-formatter');
    const content = page.locator('app-ad-slot[name="content"]');
    const footer = page.locator('app-ad-slot[name="footer"]');
    await expect(content).toHaveAttribute('ready', '');
    // Space is held before the ad arrives, so the page does not jump.
    expect(await footer.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(280);
    // Ads below the fold wait until they are scrolled to.
    expect(await footer.locator('ins.adsbygoogle').count()).toBe(0);

    await content.scrollIntoViewIfNeeded();
    const unit = content.locator('ins.adsbygoogle');
    await expect(unit).toHaveAttribute('data-ad-client', ADS.client);
    await expect(unit).toHaveAttribute('data-ad-slot', ADS.slots.content);
    await expect(content.locator('.ad-label')).toHaveText('Advertisement');

    await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator('ins.adsbygoogle')).toHaveAttribute('data-ad-slot', ADS.slots.footer);
    // One script for the whole page, and one request to fill each ad.
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain(`client=${ADS.client}`);
    expect(await page.evaluate(() => [window.__adScriptRuns, window.adsbygoogle.length])).toEqual([1, 2]);
});

test('a slot with no ad unit of its own stays hidden', async ({ page }) => {
    await withAds(page, { ...ADS, slots: { footer: '2222222222' } });
    await openPage(page, '/json-formatter');
    await expect(page.locator('app-ad-slot[name="footer"]')).toHaveAttribute('ready', '');
    await expect(page.locator('app-ad-slot[name="content"]')).toBeHidden();
    await expect(page.locator('app-ad-slot[name="content"]')).not.toHaveAttribute('ready');
});

test('a blocked ad script leaves the space empty without errors', async ({ page }) => {
    await withAds(page, ADS, { blockScript: true });
    await openPage(page, '/json-formatter');
    const content = page.locator('app-ad-slot[name="content"]');
    await content.scrollIntoViewIfNeeded();
    await expect(content).toHaveAttribute('failed', '');
});

test('every tool page has a content and a footer ad slot', () => {
    const tools = readJson(join(ROOT_FILES, 'tools.json')).tools;
    for (const tool of tools) {
        const text = readText(routeToFile(tool.url));
        expect(text, `${tool.url} has a content ad slot before its FAQ`).toMatch(/<app-ad-slot name="content"><\/app-ad-slot>\s+## Frequently Asked Questions/);
        expect(text, `${tool.url} has a footer ad slot before related tools`).toMatch(/<app-ad-slot name="footer"><\/app-ad-slot>\s+<app-related-tools>/);
    }
});
