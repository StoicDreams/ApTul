import { test, expect, openPage } from './support/site.mjs';
import { typeInto, expectCode } from './support/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/case-converter');
});

const tool = page => page.locator('app-case-converter');

test('converts a phrase to every case', async ({ page }) => {
    await typeInto(tool(page), 'Text', 'the quick BROWN fox. it jumps');
    await expectCode(tool(page), 'UPPER CASE', 'THE QUICK BROWN FOX. IT JUMPS');
    await expectCode(tool(page), 'lower case', 'the quick brown fox. it jumps');
    await expectCode(tool(page), 'Title Case', 'The Quick Brown Fox. It Jumps');
    await expectCode(tool(page), 'Sentence case', 'The quick brown fox. It jumps');
    await expectCode(tool(page), 'camelCase', 'theQuickBrownFoxItJumps');
    await expectCode(tool(page), 'PascalCase', 'TheQuickBrownFoxItJumps');
    await expectCode(tool(page), 'snake_case', 'the_quick_brown_fox_it_jumps');
    await expectCode(tool(page), 'kebab-case', 'the-quick-brown-fox-it-jumps');
    await expectCode(tool(page), 'CONSTANT_CASE', 'THE_QUICK_BROWN_FOX_IT_JUMPS');
});

test('splits existing code names into words', async ({ page }) => {
    await typeInto(tool(page), 'Text', 'XMLHttpRequest\nuser_id\ndata-2-value\nlastName');
    await expectCode(tool(page), 'snake_case', 'xml_http_request\nuser_id\ndata_2_value\nlast_name');
    await expectCode(tool(page), 'camelCase', 'xmlHttpRequest\nuserId\ndata2Value\nlastName');
});

test('keeps accented letters', async ({ page }) => {
    await typeInto(tool(page), 'Text', 'café crème');
    await expectCode(tool(page), 'PascalCase', 'CaféCrème');
});

test('hides the results when the text is cleared', async ({ page }) => {
    await typeInto(tool(page), 'Text', 'something');
    await expect(tool(page).locator('.case-results')).toBeVisible();
    await typeInto(tool(page), 'Text', '');
    await expect(tool(page).locator('.case-results')).toBeHidden();
});

test('shows pasted HTML as text', async ({ page }) => {
    await typeInto(tool(page), 'Text', '<img src=x onerror="window.__attacked=1">');
    await expectCode(tool(page), 'lower case', '<img src=x onerror="window.__attacked=1">');
    await expect(tool(page).locator('webui-code img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__attacked)).toBeUndefined();
});
