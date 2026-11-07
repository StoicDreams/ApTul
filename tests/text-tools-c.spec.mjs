import { test, expect, openPage } from './support/site.mjs';
import { choose, typeInto, outputText, expectOutput, setNumber } from './support/tools.mjs';

test.describe('Markdown to HTML', () => {
    const tool = page => page.locator('app-markdown-to-html');
    test.beforeEach(async ({ page }) => openPage(page, '/markdown-to-html'));

    test('converts the sample, including GitHub tables', async ({ page }) => {
        await expect.poll(() => outputText(tool(page))).toContain('<h1>Project Title</h1>');
        expect(await outputText(tool(page))).toContain('<table>');
        await tool(page).locator('input[name="github"]').uncheck();
        await expect.poll(() => outputText(tool(page))).not.toContain('<table>');
    });

    test('converts typed Markdown exactly', async ({ page }) => {
        await typeInto(tool(page), 'Markdown', '## Hi & bye\n\nA [link](https://aptul.com) and `<b>`.');
        await expectOutput(tool(page), '<h2>Hi &amp; bye</h2>\n<p>A <a href="https://aptul.com">link</a> and <code>&lt;b&gt;</code>.</p>\n');
    });

    test('the preview cannot run scripts from the Markdown', async ({ page }) => {
        await typeInto(tool(page), 'Markdown', 'Text\n\n<script>parent.__ran = true</script><img src=x onerror="parent.__ran = true">');
        const preview = tool(page).locator('iframe.markdown-preview');
        await expect.poll(() => preview.getAttribute('srcdoc')).toContain('<script>parent.__ran');
        expect(await preview.getAttribute('sandbox')).toBe('');
        expect(await preview.getAttribute('srcdoc')).toContain("Content-Security-Policy");
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => window.__ran)).toBeUndefined();
    });
});

test.describe('Regex Tester', () => {
    const tool = page => page.locator('app-regex-tester');
    test.beforeEach(async ({ page }) => openPage(page, '/regex-tester'));

    test('highlights matches and lists named groups', async ({ page }) => {
        await expect(tool(page).locator('webui-alert')).toContainText('2 matches');
        await expect(tool(page).locator('.regex-highlight mark')).toHaveText(['ana@example.com', 'support@aptul.com']);
        const headers = await tool(page).locator('.regex-matches th').allInnerTexts();
        expect(headers).toEqual(['#', 'Position', 'Match', 'Group 1', 'Group 2', '<user>', '<domain>']);
        await expect(tool(page).locator('.regex-matches tr').nth(1).locator('td')).toHaveText(['1', '8', 'ana@example.com', 'ana', 'example.com', 'ana', 'example.com']);
    });

    test('flags change what matches', async ({ page }) => {
        await typeInto(tool(page), 'Regular expression', 'cat');
        await typeInto(tool(page), 'Test text', 'Cat cat CAT');
        await expect(tool(page).locator('webui-alert')).toContainText('1 match');
        await tool(page).locator('input[name="i"]').check();
        await expect(tool(page).locator('webui-alert')).toContainText('3 matches');
        await tool(page).locator('input[name="g"]').uncheck();
        await expect(tool(page).locator('webui-alert')).toContainText('1 match');
    });

    test('replaces with group references, and shows test text as text', async ({ page }) => {
        await typeInto(tool(page), 'Replace with (optional)', '$<user> at $<domain>');
        await expectOutput(tool(page), 'Contact ana at example.com or support at aptul.com for help.');
        await typeInto(tool(page), 'Regular expression', 'b');
        await typeInto(tool(page), 'Test text', '<b>bold</b>');
        await expect(tool(page).locator('.regex-highlight')).toHaveText('<b>bold</b>');
        await expect(tool(page).locator('.regex-highlight b')).toHaveCount(0);
    });

    test('reports invalid patterns', async ({ page }) => {
        await typeInto(tool(page), 'Regular expression', '(unclosed');
        await expect(tool(page).locator('webui-alert')).toContainText('not valid');
    });

    test('stops patterns that take too long, and keeps working after', async ({ page }) => {
        await typeInto(tool(page), 'Regular expression', '^(a+)+$');
        await typeInto(tool(page), 'Test text', `${'a'.repeat(40)}b`);
        await expect(tool(page).locator('webui-alert')).toContainText('took longer than a second', { timeout: 5000 });
        await typeInto(tool(page), 'Test text', 'aaaa');
        await expect(tool(page).locator('webui-alert')).toContainText('1 match');
    });
});

test.describe('Lorem Ipsum Generator', () => {
    const tool = page => page.locator('app-lorem-ipsum-generator');
    test.beforeEach(async ({ page }) => openPage(page, '/lorem-ipsum-generator'));

    test('makes paragraphs that start with the classic opening', async ({ page }) => {
        await expect.poll(() => outputText(tool(page))).toMatch(/^Lorem ipsum dolor sit amet, consectetur adipiscing elit\./);
        expect((await outputText(tool(page))).split('\n\n')).toHaveLength(3);
    });

    test('makes an exact number of words, and HTML lists', async ({ page }) => {
        await choose(tool(page), 'Of', 'words');
        await setNumber(tool(page), 'How many', 12);
        await expect.poll(async () => (await outputText(tool(page))).split(' ').length).toBe(12);
        expect(await outputText(tool(page))).toMatch(/^Lorem ipsum dolor sit amet consectetur adipiscing elit \w/);
        await choose(tool(page), 'Of', 'list');
        await setNumber(tool(page), 'How many', 4);
        await tool(page).locator('input[name="html"]').check();
        await expect.poll(async () => (await outputText(tool(page))).match(/<li>/g)?.length).toBe(4);
        expect(await outputText(tool(page))).toMatch(/^<ul>\n/);
        await expect(tool(page).locator('.lorem-stats')).toContainText('words');
    });

    test('can leave out the opening, and limits huge amounts', async ({ page }) => {
        await tool(page).locator('input[name="opening"]').uncheck();
        await expect.poll(() => outputText(tool(page))).not.toMatch(/^Lorem ipsum dolor sit amet, consectetur/);
        await setNumber(tool(page), 'How many', 500);
        await expect.poll(async () => (await outputText(tool(page))).split('\n\n').length).toBe(50);
    });
});
