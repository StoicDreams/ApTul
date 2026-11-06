import { test, expect, openPage } from './support/site.mjs';
import { typeInto, choose, outputText, expectOutput, dropText } from './support/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/json-formatter');
});

const tool = page => page.locator('app-json-formatter');

test('formats valid JSON with 2 spaces by default', async ({ page }) => {
    await typeInto(tool(page), 'JSON', '{"b":1,"a":[1,2]}');
    await expectOutput(tool(page), '{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}');
    await expect(tool(page).locator('webui-alert')).toHaveText('Valid JSON');
});

test('minifies, uses tabs, and sorts keys', async ({ page }) => {
    await typeInto(tool(page), 'JSON', '{ "b": 1, "a": { "d": 2, "c": 3 } }');
    await choose(tool(page), 'Output', 'min');
    await expectOutput(tool(page), '{"b":1,"a":{"d":2,"c":3}}');
    await choose(tool(page), 'Keys', 'sort');
    await expectOutput(tool(page), '{"a":{"c":3,"d":2},"b":1}');
    await choose(tool(page), 'Output', 'tab');
    await expectOutput(tool(page), '{\n\t"a": {\n\t\t"c": 3,\n\t\t"d": 2\n\t},\n\t"b": 1\n}');
});

test('reports where invalid JSON fails', async ({ page }) => {
    await typeInto(tool(page), 'JSON', '{\n  "a": 1,\n  "b": 2,\n}');
    const alert = tool(page).locator('webui-alert');
    await expect(alert).toContainText('Invalid JSON');
    await expect(alert).toContainText('line 4');
    expect(await outputText(tool(page))).toBe('');
});

test('shows error text as text, even when it quotes HTML from the input', async ({ page }) => {
    await typeInto(tool(page), 'JSON', '<img src=x onerror="window.__attacked=1">');
    await expect(tool(page).locator('webui-alert')).toContainText('Invalid JSON');
    await expect(tool(page).locator('webui-alert img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__attacked)).toBeUndefined();
});

test('formats a dropped .json file', async ({ page }) => {
    await dropText(tool(page), 'data.json', 'application/json', '[1,2]');
    await expectOutput(tool(page), '[\n  1,\n  2\n]');
});
