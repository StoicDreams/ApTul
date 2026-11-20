import { test, expect, openPage } from './support/site.mjs';
import { choose, typeInto, outputText, setNumber } from '../helpers/tools.mjs';

test.describe('Regex Tester', () => {
    const tool = page => page.locator('app-regex-tester');
    test.beforeEach(async ({ page }) => openPage(page, '/regex-tester'));

    test('reports invalid patterns', async ({ page }) => {
        await typeInto(tool(page), 'Regular expression', '(unclosed');
        await expect(tool(page).locator('webui-alert')).toContainText('not valid');
    });

});

test.describe('Lorem Ipsum Generator', () => {
    const tool = page => page.locator('app-lorem-ipsum-generator');
    test.beforeEach(async ({ page }) => openPage(page, '/lorem-ipsum-generator'));

    test('makes paragraphs that start with the classic opening', async ({ page }) => {
        await expect.poll(() => outputText(tool(page))).toMatch(/^Lorem ipsum dolor sit amet, consectetur adipiscing elit\./);
        await expect.poll(async () => (await outputText(tool(page))).split('\n\n')).toHaveLength(3);
    });

    test('makes an exact number of words, and HTML lists', async ({ page }) => {
        await choose(tool(page), 'Of', 'words');
        await setNumber(tool(page), 'How many', 12);
        await expect.poll(async () => (await outputText(tool(page))).split(' ').length).toBe(12);
        await expect.poll(() => outputText(tool(page))).toMatch(/^Lorem ipsum dolor sit amet consectetur adipiscing elit \w/);
        await choose(tool(page), 'Of', 'list');
        await setNumber(tool(page), 'How many', 4);
        await tool(page).locator('input[name="html"]').check();
        await expect.poll(async () => (await outputText(tool(page))).match(/<li>/g)?.length).toBe(4);
        await expect.poll(() => outputText(tool(page))).toMatch(/^<ul>\n/);
        await expect(tool(page).locator('.lorem-stats')).toContainText('words');
    });

    test('can leave out the opening, and limits huge amounts', async ({ page }) => {
        await tool(page).locator('input[name="opening"]').uncheck();
        await expect.poll(() => outputText(tool(page))).not.toMatch(/^Lorem ipsum dolor sit amet, consectetur/);
        await setNumber(tool(page), 'How many', 500);
        await expect.poll(async () => (await outputText(tool(page))).split('\n\n').length).toBe(50);
    });
});
