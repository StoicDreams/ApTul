import { test, expect, openPage } from './support/site.mjs';
import { typeInto } from './support/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/jwt-parser');
});

const tool = page => page.locator('app-jwt-parser');
const code = (page, label) => tool(page).locator(`webui-code[label="${label}"]`).evaluate(el => el.value);
const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = (header, payload, signature = 'c2lnbmF0dXJl') => `${part(header)}.${part(payload)}.${signature}`;
const header = { alg: 'HS256', typ: 'JWT' };

test('decodes the header, payload, and signature', async ({ page }) => {
    const payload = { sub: '1234567890', name: 'Test User', admin: true };
    await typeInto(tool(page), 'Encoded Token', token(header, payload, 'abc-_123'));
    await expect.poll(() => code(page, 'Primary')).toBe(JSON.stringify(payload, null, 2));
    expect(await code(page, 'Header')).toBe(JSON.stringify(header, null, 2));
    expect(await code(page, 'Signature')).toBe('abc-_123');
});

test('reads URL-safe base64 without padding', async ({ page }) => {
    // These values encode to text containing - and _, which plain base64 would write as + and /.
    const payload = { data: '>>>???', more: '~~~' };
    const encoded = part(payload);
    expect(encoded).toMatch(/[-_]/);
    await typeInto(tool(page), 'Encoded Token', `${part(header)}.${encoded}.sig`);
    await expect.poll(() => code(page, 'Primary')).toBe(JSON.stringify(payload, null, 2));
});

test('decodes text that is not plain ASCII', async ({ page }) => {
    test.fail(true, 'Known bug: webui.fromBase64 returns atob\'s bytes without UTF-8 decoding, so "José" shows as "JosÃ©"');
    const payload = { name: 'José 日本' };
    await typeInto(tool(page), 'Encoded Token', token(header, payload));
    await expect.poll(() => code(page, 'Primary'), { timeout: 2000 }).toBe(JSON.stringify(payload, null, 2));
});

test('shows when the token was issued, and whether it has expired', async ({ page }) => {
    const now = Math.floor(Date.now() / 1000);
    await typeInto(tool(page), 'Encoded Token', token(header, { iat: now - 60, exp: now + 3600 }));
    await expect(tool(page)).toContainText('Issued At (iat):');
    await expect(tool(page)).toContainText('(Valid)');
    await typeInto(tool(page), 'Encoded Token', token(header, { exp: now - 60 }));
    await expect(tool(page)).toContainText('(Expired)');
    await expect(tool(page)).not.toContainText('Issued At (iat):');
});

test('a token without three parts is refused', async ({ page }) => {
    await typeInto(tool(page), 'Encoded Token', 'only.two');
    await expect(tool(page).locator('webui-alert')).toContainText('A JWT must consist of three parts');
});

test('a part that is not base64 JSON says decoding failed', async ({ page }) => {
    await typeInto(tool(page), 'Encoded Token', `${part(header)}.not-json!.sig`);
    await expect(tool(page).locator('webui-alert')).toContainText('Decoding Failed: Invalid Base64 or JSON structure.');
});

test('markup in a claim is shown as text', async ({ page }) => {
    await typeInto(tool(page), 'Encoded Token', token(header, { name: '<img src=x onerror="window.__xss=1">' }));
    await expect.poll(() => code(page, 'Primary')).toContain('<img');
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expect(tool(page).locator('img')).toHaveCount(0);
});

test('clearing the token clears the results', async ({ page }) => {
    await typeInto(tool(page), 'Encoded Token', token(header, { sub: '1' }));
    await expect(tool(page).locator('webui-code')).toHaveCount(3);
    await typeInto(tool(page), 'Encoded Token', '');
    await expect(tool(page).locator('webui-code')).toHaveCount(0);
});
