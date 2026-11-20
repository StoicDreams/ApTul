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
