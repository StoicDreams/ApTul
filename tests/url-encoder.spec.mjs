import { test, expect, openPage } from './support/site.mjs';
import { typeInto, choose, expectOutput } from './support/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/url-encoder');
});

const tool = page => page.locator('app-url-encoder');
const SAMPLE = 'https://example.com/a b?q=x&y=é';

test('encodes a URL part, including the characters that give URLs structure', async ({ page }) => {
    await typeInto(tool(page), 'Text', SAMPLE);
    await expectOutput(tool(page), encodeURIComponent(SAMPLE));
});

test('encodes a full URL, keeping its structure', async ({ page }) => {
    await choose(tool(page), 'Mode', 'full');
    await typeInto(tool(page), 'Text', SAMPLE);
    await expectOutput(tool(page), 'https://example.com/a%20b?q=x&y=%C3%A9');
});

test('decodes, optionally reading + as a space', async ({ page }) => {
    await choose(tool(page), 'Mode', 'decode');
    await typeInto(tool(page), 'Text', 'a+b%20c%C3%A9');
    await expectOutput(tool(page), 'a+b cé');
    await choose(tool(page), 'Plus signs', 'space');
    await expectOutput(tool(page), 'a b cé');
});

test('explains text that cannot be decoded', async ({ page }) => {
    await choose(tool(page), 'Mode', 'decode');
    await typeInto(tool(page), 'Text', '100% done');
    await expect(tool(page).locator('webui-alert')).toContainText('%25');
    await expectOutput(tool(page), '');
});
