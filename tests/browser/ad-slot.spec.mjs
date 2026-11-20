import { test, expect, openPage, readJson, ROOT_FILES } from '../support/site.mjs';
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
    await page.locator('app-related-tools').scrollIntoViewIfNeeded();
    await expect(page.locator('app-related-tools')).toBeInViewport();
    // A slot reads the ad settings in connected, and load is what coming into view calls. Run both and wait for them,
    // so each slot has decided what to do before checking that it did nothing.
    await slots.evaluateAll(els => Promise.all(els.map(el => el.connected().then(() => el.load()))));
    await expect(slots.first()).toBeHidden();
    await expect(slots.last()).toBeHidden();
    await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
    expect(requests).toEqual([]);
});

test('with ads set up, slots get ready and load their ad once in view', async ({ page }) => {
    const requests = await withAds(page);
    await openPage(page, '/json-formatter');
    const content = page.locator('app-ad-slot[name="content"]');
    const footer = page.locator('app-ad-slot[name="footer"]');
    await expect(content).toHaveAttribute('ready', '');
    // The space the slots hold, so the page doesn't jump when an ad arrives, is checked by eye.
    // Ads below the fold wait until they are scrolled to.
    await expect(footer).toHaveAttribute('ready', '');
    await expect(footer.locator('ins.adsbygoogle')).toHaveCount(0);

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
    await expect.poll(() => page.evaluate(() => [window.__adScriptRuns, window.adsbygoogle?.length])).toEqual([1, 2]);
});

