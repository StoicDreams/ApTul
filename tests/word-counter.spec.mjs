import { test, expect, openPage } from './support/site.mjs';
import { typeInto } from './support/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/word-counter');
});

const tool = page => page.locator('app-word-counter');
const stat = (page, name) => tool(page).locator(`[data-stat="${name}"] > div`).first();

test('counts words, characters, sentences, and paragraphs', async ({ page }) => {
    await typeInto(tool(page), 'Text', "Hello world. How are you today?\n\nI'm fine, thanks!");
    await expect(stat(page, 'Words')).toHaveText('9');
    await expect(stat(page, 'Sentences')).toHaveText('3');
    await expect(stat(page, 'Paragraphs')).toHaveText('2');
    await expect(stat(page, 'Characters')).toHaveText('50');
    // 50 characters, less 5 spaces, 2 line breaks, and 2 more spaces.
    await expect(stat(page, 'Characters without spaces')).toHaveText('41');
});

test('counts an emoji as one character', async ({ page }) => {
    await typeInto(tool(page), 'Text', 'Hi 👋🏽');
    await expect(stat(page, 'Characters')).toHaveText('4');
    await expect(stat(page, 'Words')).toHaveText('1');
});

test('estimates reading and speaking time', async ({ page }) => {
    await typeInto(tool(page), 'Text', 'word '.repeat(476));
    await expect(stat(page, 'Reading time')).toHaveText('2 min');
    await expect(stat(page, 'Speaking time')).toHaveText('3 min 10 sec');
});

test('shows zeros for empty text', async ({ page }) => {
    await expect(stat(page, 'Words')).toHaveText('0');
    await expect(stat(page, 'Reading time')).toHaveText('0 min');
});
